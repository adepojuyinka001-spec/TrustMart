import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  BuyerRequestStatus,
  ListingStatus,
  MatchTriggerReason,
  type BuyerRequest,
  type BuyerRequirement,
  type Listing,
  type ListingAttributeValue,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PlatformConfigService } from "../platform-config/platform-config.service";
import { evaluateMatch, type EvaluateMatchInput, type RequirementInput } from "./matching-engine.util";

// Score bands mirror the SSOT's illustrative example (SSOT SS6 / CLAUDE.md SS9) — an
// initial default, not a hard business rule like the threshold. Revisit as
// PlatformConfiguration entries if the founder wants these tunable without a deploy.
export type MatchClassification = "EXCELLENT" | "STRONG" | "GOOD" | "ALTERNATIVE";

export function classifyScore(scorePercent: number): MatchClassification {
  if (scorePercent >= 90) return "EXCELLENT";
  if (scorePercent >= 80) return "STRONG";
  if (scorePercent >= 70) return "GOOD";
  return "ALTERNATIVE";
}

type BuyerRequestWithRequirements = BuyerRequest & {
  requirements: (BuyerRequirement & { attribute: { key: string; dataType: string } })[];
};
type ListingWithAttributes = Listing & { attributeValues: ListingAttributeValue[] };

export interface MarketplaceMatchCreatedEvent {
  matchId: string;
  buyerRequestId: string;
  listingId: string;
  scorePercent: number;
  classification: MatchClassification;
}

// Orchestration layer for the deterministic Matching Engine (CLAUDE.md SS9; Blueprint
// SS9). Loads data, calls the pure evaluateMatch() function, persists the result, and
// emits a domain event — it never computes the score itself, and neither AI nor n8n
// may call evaluateMatch() directly or override its output.
@Injectable()
export class MatchingEngineService {
  private readonly logger = new Logger(MatchingEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: PlatformConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async recalculateForListing(listingId: string, triggerReason: MatchTriggerReason) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { attributeValues: true },
    });
    if (!listing || listing.status !== ListingStatus.ACTIVE) {
      return { matchesCreated: 0 };
    }

    const buyerRequests = await this.prisma.buyerRequest.findMany({
      where: { subcategoryId: listing.subcategoryId, status: BuyerRequestStatus.ACTIVE },
      include: { requirements: { include: { attribute: true } } },
    });

    return this.runMatchRun(triggerReason, { listingId }, buyerRequests, [listing]);
  }

  async recalculateForBuyerRequest(buyerRequestId: string, triggerReason: MatchTriggerReason) {
    const buyerRequest = await this.prisma.buyerRequest.findUnique({
      where: { id: buyerRequestId },
      include: { requirements: { include: { attribute: true } } },
    });
    if (!buyerRequest || buyerRequest.status !== BuyerRequestStatus.ACTIVE) {
      return { matchesCreated: 0 };
    }

    const listings = await this.prisma.listing.findMany({
      where: { subcategoryId: buyerRequest.subcategoryId, status: ListingStatus.ACTIVE },
      include: { attributeValues: true },
    });

    return this.runMatchRun(triggerReason, { buyerRequestId }, [buyerRequest], listings);
  }

  private async runMatchRun(
    triggerReason: MatchTriggerReason,
    linkage: { listingId?: string; buyerRequestId?: string },
    buyerRequests: BuyerRequestWithRequirements[],
    listings: ListingWithAttributes[],
  ) {
    const matchRun = await this.prisma.matchRun.create({
      data: { triggerReason, listingId: linkage.listingId, buyerRequestId: linkage.buyerRequestId },
    });

    const [defaultThresholdPercent, budgetWeight, locationWeight] = await Promise.all([
      this.configService.getValue<number>("marketplace.match_threshold_percent"),
      this.configService.getValue<number>("marketplace.match_budget_weight_percent"),
      this.configService.getValue<number>("marketplace.match_location_weight_percent"),
    ]);

    let matchesCreated = 0;
    for (const buyerRequest of buyerRequests) {
      for (const listing of listings) {
        const qualified = await this.evaluateAndPersistPair(
          matchRun.id,
          buyerRequest,
          listing,
          defaultThresholdPercent,
          budgetWeight,
          locationWeight,
        );
        if (qualified) matchesCreated += 1;
      }
    }

    await this.prisma.matchRun.update({
      where: { id: matchRun.id },
      data: { completedAt: new Date(), matchesCreated },
    });

    return { matchesCreated };
  }

  private async evaluateAndPersistPair(
    matchRunId: string,
    buyerRequest: BuyerRequestWithRequirements,
    listing: ListingWithAttributes,
    defaultThresholdPercent: number,
    budgetWeight: number,
    locationWeight: number,
  ): Promise<boolean> {
    const profile = await this.prisma.matchingProfile.findFirst({
      where: { subcategoryId: buyerRequest.subcategoryId, isActive: true },
      orderBy: { version: "desc" },
      include: { criteria: true },
    });

    const listingValueByAttribute = new Map(listing.attributeValues.map((v) => [v.attributeId, v.value]));

    const requirements: RequirementInput[] = buyerRequest.requirements.map((requirement) => {
      const criterion = profile?.criteria.find((c) => c.attributeId === requirement.attributeId);
      return {
        attributeKey: requirement.attribute.key,
        dataType: requirement.attribute.dataType as RequirementInput["dataType"],
        operator: requirement.operator,
        buyerValue: requirement.value,
        requirementType: requirement.requirementType,
        weight: requirement.weightOverride ?? criterion?.defaultWeight ?? 1,
        listingValue: listingValueByAttribute.get(requirement.attributeId) ?? null,
      };
    });

    const evaluateInput: EvaluateMatchInput = {
      budget: {
        minMinorUnits: buyerRequest.minBudgetMinorUnits === null ? null : Number(buyerRequest.minBudgetMinorUnits),
        maxMinorUnits: buyerRequest.maxBudgetMinorUnits === null ? null : Number(buyerRequest.maxBudgetMinorUnits),
        flexible: buyerRequest.budgetFlexible,
        listingPriceMinorUnits: Number(listing.askingPriceMinorUnits),
        weight: budgetWeight,
      },
      location: {
        preferredLocations: Array.isArray(buyerRequest.preferredLocations)
          ? (buyerRequest.preferredLocations as string[])
          : [],
        flexible: buyerRequest.locationFlexible,
        listing: { country: listing.country, state: listing.state, city: listing.city },
        weight: locationWeight,
      },
      requirements,
    };

    const result = evaluateMatch(evaluateInput);
    const thresholdUsedPercent = profile?.thresholdOverridePercent ?? defaultThresholdPercent;
    const qualified = !result.hardFailed && result.scorePercent >= thresholdUsedPercent;

    const existing = await this.prisma.match.findUnique({
      where: { buyerRequestId_listingId: { buyerRequestId: buyerRequest.id, listingId: listing.id } },
    });

    const match = await this.prisma.match.upsert({
      where: { buyerRequestId_listingId: { buyerRequestId: buyerRequest.id, listingId: listing.id } },
      update: {
        matchRunId,
        matchingProfileId: profile?.id,
        thresholdUsedPercent,
        scorePercent: result.scorePercent,
        qualified,
        hardFailed: result.hardFailed,
        hardFailureReason: result.hardFailureReason,
      },
      create: {
        matchRunId,
        buyerRequestId: buyerRequest.id,
        listingId: listing.id,
        matchingProfileId: profile?.id,
        thresholdUsedPercent,
        scorePercent: result.scorePercent,
        qualified,
        hardFailed: result.hardFailed,
        hardFailureReason: result.hardFailureReason,
      },
    });

    await this.prisma.matchCriterionResult.deleteMany({ where: { matchId: match.id } });
    if (result.criterionResults.length > 0) {
      await this.prisma.matchCriterionResult.createMany({
        data: result.criterionResults.map((c) => ({
          matchId: match.id,
          criterionKey: c.criterionKey,
          requirementType: c.requirementType,
          operator: c.operator,
          buyerValue: c.buyerValue,
          listingValue: c.listingValue,
          weight: c.weight,
          passed: c.passed,
          criterionScorePercent: c.criterionScorePercent,
        })),
      });
    }

    const wasQualified = existing?.qualified ?? false;
    if (qualified && !wasQualified) {
      const event: MarketplaceMatchCreatedEvent = {
        matchId: match.id,
        buyerRequestId: buyerRequest.id,
        listingId: listing.id,
        scorePercent: result.scorePercent,
        classification: classifyScore(result.scorePercent),
      };
      this.eventEmitter.emit("marketplace.match.created", event);
      this.logger.log(`Match qualified: buyerRequest=${buyerRequest.id} listing=${listing.id} score=${result.scorePercent}`);
    }

    return qualified;
  }
}
