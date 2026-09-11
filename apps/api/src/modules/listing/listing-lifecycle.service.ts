import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ListingStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PlatformConfigService } from "../platform-config/platform-config.service";

const RENEWABLE_STATUSES: ListingStatus[] = [ListingStatus.EXPIRING, ListingStatus.EXPIRED];

// Listing lifecycle sweep (CLAUDE.md SS10; Blueprint SS12): ACTIVE -> EXPIRING (warning
// window) -> EXPIRED, with an explicit seller decision (SOLD vs. STILL AVAILABLE/renew)
// rather than silent auto-renewal. Deterministic backend logic, not AI/n8n-decided — n8n
// may call sweep() on a schedule (CLAUDE.md SS26: "n8n may... call authenticated
// TrustMart APIs"), but never sets listing status itself.
@Injectable()
export class ListingLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: PlatformConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Idempotent: safe to call repeatedly (e.g. from an n8n schedule). Only ever moves
  // listings forward (ACTIVE -> EXPIRING -> EXPIRED), never backward.
  async sweep(actorId: string, ipAddress?: string) {
    const warningDays = await this.configService.getValue<number>("marketplace.listing_expiry_warning_days");
    const now = new Date();
    const warningCutoff = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000);

    const toWarn = await this.prisma.listing.findMany({
      where: { status: ListingStatus.ACTIVE, expiresAt: { lte: warningCutoff } },
    });
    for (const listing of toWarn) {
      await this.prisma.listing.update({ where: { id: listing.id }, data: { status: ListingStatus.EXPIRING } });
      await this.auditService.record({
        actorId,
        action: "listing.expiring",
        resourceType: "Listing",
        resourceId: listing.id,
        beforeState: { status: ListingStatus.ACTIVE },
        afterState: { status: ListingStatus.EXPIRING },
        ipAddress,
      });
      await this.eventEmitter.emitAsync("marketplace.listing.expiring", { listingId: listing.id, expiresAt: listing.expiresAt });
    }

    const toExpire = await this.prisma.listing.findMany({
      where: { status: { in: [ListingStatus.ACTIVE, ListingStatus.EXPIRING] }, expiresAt: { lte: now } },
    });
    for (const listing of toExpire) {
      await this.prisma.listing.update({ where: { id: listing.id }, data: { status: ListingStatus.EXPIRED } });
      await this.auditService.record({
        actorId,
        action: "listing.expired",
        resourceType: "Listing",
        resourceId: listing.id,
        beforeState: { status: listing.status },
        afterState: { status: ListingStatus.EXPIRED },
        ipAddress,
      });
      await this.eventEmitter.emitAsync("marketplace.listing.expired", { listingId: listing.id });
    }

    return { warned: toWarn.length, expired: toExpire.length };
  }

  // Seller's explicit "STILL AVAILABLE" response (CLAUDE.md SS10) — never automatic.
  async renew(listingId: string, sellerUserId: string, ipAddress?: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }
    if (listing.sellerUserId !== sellerUserId) {
      throw new ForbiddenException("You do not own this listing.");
    }
    if (!RENEWABLE_STATUSES.includes(listing.status)) {
      throw new ForbiddenException(`Only an EXPIRING or EXPIRED listing can be renewed (current status: ${listing.status}).`);
    }

    const lifecycleDays = await this.configService.getValue<number>("marketplace.listing_lifecycle_days");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + lifecycleDays * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.ACTIVE, expiresAt },
    });

    await this.auditService.record({
      actorId: sellerUserId,
      action: "listing.renew",
      resourceType: "Listing",
      resourceId: listingId,
      beforeState: { status: listing.status, expiresAt: listing.expiresAt },
      afterState: { status: updated.status, expiresAt: updated.expiresAt },
      ipAddress,
    });

    return updated;
  }
}
