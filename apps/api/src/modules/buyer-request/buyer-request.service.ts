import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { BuyerRequestStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { MatchingEngineService } from "../matching/matching-engine.service";
import type { CreateBuyerRequestDto } from "./dto/create-buyer-request.dto";
import type { UpdateBuyerRequestDto } from "./dto/update-buyer-request.dto";

// Buyer Request Engine (Blueprint SS8). A request always starts DRAFT — whether created
// directly (this module) or from a future AI natural-language parser — and only becomes
// ACTIVE (and eligible for matching) once the buyer explicitly confirms it via activate()
// (CLAUDE.md SS11: "Natural-language buyer requests must be confirmed by buyer before
// activation").
@Injectable()
export class BuyerRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly matchingEngine: MatchingEngineService,
  ) {}

  private async assertOwnsRequest(buyerRequestId: string, userId: string) {
    const request = await this.prisma.buyerRequest.findUnique({ where: { id: buyerRequestId } });
    if (!request) {
      throw new NotFoundException("Buyer request not found.");
    }
    if (request.buyerUserId !== userId) {
      throw new ForbiddenException("You do not own this buyer request.");
    }
    return request;
  }

  async create(buyerUserId: string, dto: CreateBuyerRequestDto, ipAddress?: string) {
    const request = await this.prisma.buyerRequest.create({
      data: {
        buyerUserId,
        subcategoryId: dto.subcategoryId,
        minBudgetMinorUnits: dto.minBudgetMinorUnits === undefined ? undefined : BigInt(dto.minBudgetMinorUnits),
        maxBudgetMinorUnits: dto.maxBudgetMinorUnits === undefined ? undefined : BigInt(dto.maxBudgetMinorUnits),
        currency: dto.currency ?? "NGN",
        preferredLocations: dto.preferredLocations ?? [],
        quantity: dto.quantity ?? 1,
        timelineDays: dto.timelineDays,
        budgetFlexible: dto.budgetFlexible ?? false,
        locationFlexible: dto.locationFlexible ?? false,
        requirements: dto.requirements
          ? {
              create: dto.requirements.map((r) => ({
                attributeId: r.attributeId,
                operator: r.operator,
                value: r.value,
                requirementType: r.requirementType,
                weightOverride: r.weightOverride,
              })),
            }
          : undefined,
      },
      include: { requirements: true },
    });

    await this.auditService.record({
      actorId: buyerUserId,
      action: "buyer_request.create",
      resourceType: "BuyerRequest",
      resourceId: request.id,
      afterState: request,
      ipAddress,
    });

    return request;
  }

  async update(buyerRequestId: string, buyerUserId: string, dto: UpdateBuyerRequestDto, ipAddress?: string) {
    const request = await this.assertOwnsRequest(buyerRequestId, buyerUserId);
    if (request.status !== BuyerRequestStatus.DRAFT && request.status !== BuyerRequestStatus.ACTIVE) {
      throw new ForbiddenException(`Buyer request cannot be edited while status is ${request.status}.`);
    }

    const updated = await this.prisma.buyerRequest.update({
      where: { id: buyerRequestId },
      data: {
        minBudgetMinorUnits: dto.minBudgetMinorUnits === undefined ? undefined : BigInt(dto.minBudgetMinorUnits),
        maxBudgetMinorUnits: dto.maxBudgetMinorUnits === undefined ? undefined : BigInt(dto.maxBudgetMinorUnits),
        preferredLocations: dto.preferredLocations,
        quantity: dto.quantity,
        timelineDays: dto.timelineDays,
        budgetFlexible: dto.budgetFlexible,
        locationFlexible: dto.locationFlexible,
        requirements: dto.requirements
          ? {
              deleteMany: {},
              create: dto.requirements.map((r) => ({
                attributeId: r.attributeId,
                operator: r.operator,
                value: r.value,
                requirementType: r.requirementType,
                weightOverride: r.weightOverride,
              })),
            }
          : undefined,
      },
      include: { requirements: true },
    });

    await this.auditService.record({
      actorId: buyerUserId,
      action: "buyer_request.update",
      resourceType: "BuyerRequest",
      resourceId: buyerRequestId,
      beforeState: request,
      afterState: updated,
      ipAddress,
    });

    if (updated.status === BuyerRequestStatus.ACTIVE) {
      await this.matchingEngine.recalculateForBuyerRequest(buyerRequestId, "BUYER_REQUEST_UPDATED");
    }

    return updated;
  }

  // The explicit buyer-confirmation step required by CLAUDE.md SS11.
  async activate(buyerRequestId: string, buyerUserId: string, ipAddress?: string) {
    const request = await this.assertOwnsRequest(buyerRequestId, buyerUserId);
    if (request.status !== BuyerRequestStatus.DRAFT) {
      throw new ForbiddenException(`Only a DRAFT buyer request can be activated (current status: ${request.status}).`);
    }

    const updated = await this.prisma.buyerRequest.update({
      where: { id: buyerRequestId },
      data: { status: BuyerRequestStatus.ACTIVE, activatedAt: new Date() },
    });

    await this.auditService.record({
      actorId: buyerUserId,
      action: "buyer_request.activate",
      resourceType: "BuyerRequest",
      resourceId: buyerRequestId,
      beforeState: { status: request.status },
      afterState: { status: updated.status, activatedAt: updated.activatedAt },
      ipAddress,
    });

    await this.matchingEngine.recalculateForBuyerRequest(buyerRequestId, "BUYER_REQUEST_ACTIVATED");

    return updated;
  }

  async cancel(buyerRequestId: string, buyerUserId: string, ipAddress?: string) {
    const request = await this.assertOwnsRequest(buyerRequestId, buyerUserId);
    if (request.status === BuyerRequestStatus.CANCELLED || request.status === BuyerRequestStatus.FULFILLED) {
      throw new ForbiddenException(`Buyer request cannot be cancelled from status ${request.status}.`);
    }

    const updated = await this.prisma.buyerRequest.update({
      where: { id: buyerRequestId },
      data: { status: BuyerRequestStatus.CANCELLED },
    });

    await this.auditService.record({
      actorId: buyerUserId,
      action: "buyer_request.cancel",
      resourceType: "BuyerRequest",
      resourceId: buyerRequestId,
      beforeState: { status: request.status },
      afterState: { status: updated.status },
      ipAddress,
    });

    return updated;
  }

  // Buyer budgets are treated as sensitive (Blueprint SS24) — only the owning buyer may
  // read the full request. A future Interest/Match module may expose a redacted view to
  // matched sellers; it must not reuse this method as-is.
  async get(buyerRequestId: string, requestingUserId: string) {
    const request = await this.prisma.buyerRequest.findUnique({
      where: { id: buyerRequestId },
      include: { requirements: { include: { attribute: true } }, subcategory: { include: { category: true } } },
    });
    if (!request) {
      throw new NotFoundException("Buyer request not found.");
    }
    if (request.buyerUserId !== requestingUserId) {
      throw new ForbiddenException("You do not own this buyer request.");
    }
    return request;
  }

  async listMine(buyerUserId: string) {
    return this.prisma.buyerRequest.findMany({
      where: { buyerUserId },
      orderBy: { createdAt: "desc" },
      include: { subcategory: { include: { category: true } } },
    });
  }
}
