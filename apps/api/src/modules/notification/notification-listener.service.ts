import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationService } from "./notification.service";
import type { MarketplaceMatchCreatedEvent } from "../matching/matching-engine.service";
import type { MarketplaceInterestCreatedEvent } from "../engagement/interest.service";
import type { MarketplaceLeadStatusChangedEvent } from "../engagement/lead.service";

// Turns the domain events every other module already emits (CLAUDE.md SS31) into
// something a user can actually see. Before this listener existed, every one of these
// `eventEmitter.emit(...)` calls had nothing subscribed to it. Each handler does its own
// small lookup for the context the event payload doesn't carry (e.g. which users to
// notify) — events are kept minimal/decoupled at the source, this is the one place that
// interprets them.
@Injectable()
export class NotificationListenerService {
  private readonly logger = new Logger(NotificationListenerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent("marketplace.match.created")
  async onMatchCreated(event: MarketplaceMatchCreatedEvent) {
    const [buyerRequest, listing] = await Promise.all([
      this.prisma.buyerRequest.findUnique({ where: { id: event.buyerRequestId } }),
      this.prisma.listing.findUnique({ where: { id: event.listingId } }),
    ]);
    if (!buyerRequest || !listing) return;

    await this.notificationService.create({
      userId: buyerRequest.buyerUserId,
      type: "match.created",
      title: "New match found",
      body: `"${listing.title}" is a ${event.classification.toLowerCase()} match (${event.scorePercent}%) for your buyer request.`,
      resourceType: "Match",
      resourceId: event.matchId,
    });
    await this.notificationService.create({
      userId: listing.sellerUserId,
      type: "match.created",
      title: "A buyer request matches your listing",
      body: `Your listing "${listing.title}" has a new ${event.classification.toLowerCase()} match.`,
      resourceType: "Match",
      resourceId: event.matchId,
    });
  }

  @OnEvent("marketplace.interest.created")
  async onInterestCreated(event: MarketplaceInterestCreatedEvent) {
    const listing = await this.prisma.listing.findUnique({ where: { id: event.listingId } });
    if (!listing) return;

    await this.notificationService.create({
      userId: event.sellerUserId,
      type: "interest.created",
      title: "New interest in your listing",
      body: `Someone is interested in "${listing.title}".`,
      resourceType: "Lead",
      resourceId: event.leadId,
    });
  }

  @OnEvent("marketplace.lead.status_changed")
  async onLeadStatusChanged(event: MarketplaceLeadStatusChangedEvent) {
    const lead = await this.prisma.lead.findUnique({ where: { id: event.leadId } });
    if (!lead) return;
    const listing = await this.prisma.listing.findUnique({ where: { id: lead.listingId } });
    if (!listing) return;

    await this.notificationService.create({
      userId: lead.buyerUserId,
      type: "lead.status_changed",
      title: "Update on your inquiry",
      body: `Your inquiry for "${listing.title}" is now ${event.toStatus.replace(/_/g, " ").toLowerCase()}.`,
      resourceType: "Lead",
      resourceId: event.leadId,
    });
  }

  @OnEvent("escrow.created")
  async onEscrowCreated(event: { escrowId: string; originType: string }) {
    const escrow = await this.prisma.escrowTransaction.findUnique({
      where: { id: event.escrowId },
      include: { parties: true },
    });
    if (!escrow) return;

    const invitedParties = escrow.parties.filter((p) => p.userId !== escrow.createdByUserId);
    for (const party of invitedParties) {
      await this.notificationService.create({
        userId: party.userId,
        type: "escrow.created",
        title: "You were invited to a TrustMart Escrow",
        body: `You've been invited to secure "${escrow.title}" via TrustMart Escrow. Review the proposed terms.`,
        resourceType: "EscrowTransaction",
        resourceId: escrow.id,
      });
    }
  }

  @OnEvent("escrow.terms_accepted")
  async onEscrowTermsAccepted(event: { escrowId: string; termVersionId: string | null }) {
    const escrow = await this.prisma.escrowTransaction.findUnique({
      where: { id: event.escrowId },
      include: { parties: true },
    });
    if (!escrow) return;

    for (const party of escrow.parties) {
      await this.notificationService.create({
        userId: party.userId,
        type: "escrow.terms_accepted",
        title: "Escrow terms accepted",
        body: `All parties have accepted the terms for "${escrow.title}".`,
        resourceType: "EscrowTransaction",
        resourceId: escrow.id,
      });
    }
  }

  @OnEvent("marketplace.listing.expiring")
  async onListingExpiring(event: { listingId: string; expiresAt: Date }) {
    const listing = await this.prisma.listing.findUnique({ where: { id: event.listingId } });
    if (!listing) return;

    await this.notificationService.create({
      userId: listing.sellerUserId,
      type: "listing.expiring",
      title: "Listing expiring soon",
      body: `"${listing.title}" is expiring soon. Mark it sold or renew it to keep it active.`,
      resourceType: "Listing",
      resourceId: listing.id,
    });
  }

  @OnEvent("marketplace.listing.expired")
  async onListingExpired(event: { listingId: string }) {
    const listing = await this.prisma.listing.findUnique({ where: { id: event.listingId } });
    if (!listing) return;

    await this.notificationService.create({
      userId: listing.sellerUserId,
      type: "listing.expired",
      title: "Listing expired",
      body: `"${listing.title}" has expired. Renew it if it's still available.`,
      resourceType: "Listing",
      resourceId: listing.id,
    });
  }
}
