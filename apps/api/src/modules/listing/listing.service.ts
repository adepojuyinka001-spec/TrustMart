import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ListingStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PlatformConfigService } from "../platform-config/platform-config.service";
import { MatchingEngineService } from "../matching/matching-engine.service";
import type { CreateListingDto } from "./dto/create-listing.dto";
import type { UpdateListingDto } from "./dto/update-listing.dto";

const OPEN_FOR_EDIT: ListingStatus[] = [ListingStatus.DRAFT, ListingStatus.ACTIVE];
const AWAITING_MODERATION: ListingStatus[] = [ListingStatus.SUBMITTED, ListingStatus.CHECKING];
const SOLD_FROM: ListingStatus[] = [ListingStatus.ACTIVE, ListingStatus.EXPIRING];

// Listing Engine (Blueprint SS7). Lifecycle: DRAFT -> SUBMITTED -> CHECKING -> ACTIVE ->
// EXPIRING -> EXPIRED, plus SOLD / REJECTED / SUSPENDED / ARCHIVED (SS12). Moderation and
// lifecycle transitions reuse AuditEvent instead of dedicated *LifecycleEvent /
// ListingModerationCase tables — see DECISION_LOG.md.
@Injectable()
export class ListingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: PlatformConfigService,
    private readonly matchingEngine: MatchingEngineService,
  ) {}

  private async assertOwnsListing(listingId: string, userId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }
    if (listing.sellerUserId !== userId) {
      throw new ForbiddenException("You do not own this listing.");
    }
    return listing;
  }

  async create(sellerUserId: string, dto: CreateListingDto, ipAddress?: string) {
    if (dto.businessId) {
      const staffLink = await this.prisma.businessStaff.findUnique({
        where: { businessId_userId: { businessId: dto.businessId, userId: sellerUserId } },
      });
      if (!staffLink) {
        throw new ForbiddenException("You are not staff of this business.");
      }
    }

    const listing = await this.prisma.listing.create({
      data: {
        sellerUserId,
        businessId: dto.businessId,
        subcategoryId: dto.subcategoryId,
        title: dto.title,
        description: dto.description,
        askingPriceMinorUnits: BigInt(dto.askingPriceMinorUnits),
        currency: dto.currency ?? "NGN",
        negotiable: dto.negotiable ?? false,
        condition: dto.condition,
        country: dto.country,
        state: dto.state,
        city: dto.city,
        quantity: dto.quantity ?? 1,
        attributeValues: dto.attributeValues
          ? { create: dto.attributeValues.map((av) => ({ attributeId: av.attributeId, value: av.value })) }
          : undefined,
      },
      include: { attributeValues: true },
    });

    await this.auditService.record({
      actorId: sellerUserId,
      action: "listing.create",
      resourceType: "Listing",
      resourceId: listing.id,
      afterState: listing,
      ipAddress,
    });

    return listing;
  }

  async update(listingId: string, sellerUserId: string, dto: UpdateListingDto, ipAddress?: string) {
    const listing = await this.assertOwnsListing(listingId, sellerUserId);
    if (!OPEN_FOR_EDIT.includes(listing.status)) {
      throw new ForbiddenException(`Listing cannot be edited while status is ${listing.status}.`);
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        title: dto.title,
        description: dto.description,
        negotiable: dto.negotiable,
        condition: dto.condition,
        country: dto.country,
        state: dto.state,
        city: dto.city,
        quantity: dto.quantity,
        attributeValues: dto.attributeValues
          ? {
              deleteMany: {},
              create: dto.attributeValues.map((av) => ({ attributeId: av.attributeId, value: av.value })),
            }
          : undefined,
      },
      include: { attributeValues: true },
    });

    await this.auditService.record({
      actorId: sellerUserId,
      action: "listing.update",
      resourceType: "Listing",
      resourceId: listingId,
      beforeState: listing,
      afterState: updated,
      ipAddress,
    });

    if (listing.status === ListingStatus.ACTIVE) {
      await this.matchingEngine.recalculateForListing(listingId, "LISTING_ACTIVATED");
    }

    return updated;
  }

  async submit(listingId: string, sellerUserId: string, ipAddress?: string) {
    const listing = await this.assertOwnsListing(listingId, sellerUserId);
    if (listing.status !== ListingStatus.DRAFT) {
      throw new ForbiddenException(`Only a DRAFT listing can be submitted (current status: ${listing.status}).`);
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.SUBMITTED },
    });

    await this.auditService.record({
      actorId: sellerUserId,
      action: "listing.submit",
      resourceType: "Listing",
      resourceId: listingId,
      beforeState: { status: listing.status },
      afterState: { status: updated.status },
      ipAddress,
    });

    return updated;
  }

  async approve(listingId: string, moderatorId: string, ipAddress?: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }
    if (!AWAITING_MODERATION.includes(listing.status)) {
      throw new ForbiddenException(`Listing is not awaiting moderation (current status: ${listing.status}).`);
    }

    const lifecycleDays = await this.configService.getValue<number>("marketplace.listing_lifecycle_days");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + lifecycleDays * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.ACTIVE, activatedAt: now, expiresAt, moderationReason: null },
    });

    await this.auditService.record({
      actorId: moderatorId,
      action: "listing.approve",
      resourceType: "Listing",
      resourceId: listingId,
      beforeState: { status: listing.status },
      afterState: { status: updated.status, activatedAt: updated.activatedAt, expiresAt: updated.expiresAt },
      ipAddress,
    });

    await this.matchingEngine.recalculateForListing(listingId, "LISTING_ACTIVATED");

    return updated;
  }

  async reject(listingId: string, moderatorId: string, reason: string, ipAddress?: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }
    if (!AWAITING_MODERATION.includes(listing.status)) {
      throw new ForbiddenException(`Listing is not awaiting moderation (current status: ${listing.status}).`);
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.REJECTED, moderationReason: reason },
    });

    await this.auditService.record({
      actorId: moderatorId,
      action: "listing.reject",
      resourceType: "Listing",
      resourceId: listingId,
      beforeState: { status: listing.status },
      afterState: { status: updated.status, moderationReason: reason },
      ipAddress,
    });

    return updated;
  }

  async updatePrice(listingId: string, sellerUserId: string, newPriceMinorUnits: number, ipAddress?: string) {
    const listing = await this.assertOwnsListing(listingId, sellerUserId);
    if (listing.status !== ListingStatus.ACTIVE && listing.status !== ListingStatus.DRAFT) {
      throw new ForbiddenException(`Price cannot change while status is ${listing.status}.`);
    }

    const newPrice = BigInt(newPriceMinorUnits);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.listingPriceHistory.create({
        data: {
          listingId,
          previousPriceMinorUnits: listing.askingPriceMinorUnits,
          newPriceMinorUnits: newPrice,
        },
      });
      return tx.listing.update({
        where: { id: listingId },
        data: { askingPriceMinorUnits: newPrice },
      });
    });

    await this.auditService.record({
      actorId: sellerUserId,
      action: "listing.price_change",
      resourceType: "Listing",
      resourceId: listingId,
      beforeState: { askingPriceMinorUnits: listing.askingPriceMinorUnits.toString() },
      afterState: { askingPriceMinorUnits: updated.askingPriceMinorUnits.toString() },
      ipAddress,
    });

    if (updated.status === ListingStatus.ACTIVE) {
      await this.matchingEngine.recalculateForListing(listingId, "LISTING_PRICE_CHANGED");
    }

    return updated;
  }

  // Reachable from ACTIVE or EXPIRING — a seller responding to the "SOLD or STILL
  // AVAILABLE?" prompt at expiry (CLAUDE.md SS10) picks SOLD via this same endpoint;
  // STILL AVAILABLE goes through ListingLifecycleService.renew() instead.
  async markSold(listingId: string, sellerUserId: string, ipAddress?: string) {
    const listing = await this.assertOwnsListing(listingId, sellerUserId);
    if (!SOLD_FROM.includes(listing.status)) {
      throw new ForbiddenException(
        `Only an ACTIVE or EXPIRING listing can be marked SOLD (current status: ${listing.status}).`,
      );
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.SOLD, soldAt: new Date() },
    });

    await this.auditService.record({
      actorId: sellerUserId,
      action: "listing.mark_sold",
      resourceType: "Listing",
      resourceId: listingId,
      beforeState: { status: listing.status },
      afterState: { status: updated.status, soldAt: updated.soldAt },
      ipAddress,
    });

    return updated;
  }

  async get(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { attributeValues: { include: { attribute: true } }, subcategory: { include: { category: true } } },
    });
    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }
    return listing;
  }

  async listMine(sellerUserId: string) {
    return this.prisma.listing.findMany({
      where: { sellerUserId },
      orderBy: { createdAt: "desc" },
    });
  }

  async listActive(subcategoryId?: string) {
    return this.prisma.listing.findMany({
      where: { status: ListingStatus.ACTIVE, subcategoryId },
      orderBy: { activatedAt: "desc" },
    });
  }

  async listAwaitingModeration() {
    return this.prisma.listing.findMany({
      where: { status: { in: AWAITING_MODERATION } },
      orderBy: { createdAt: "asc" },
    });
  }
}
