import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ListingStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateInterestDto } from "./dto/create-interest.dto";

export interface MarketplaceInterestCreatedEvent {
  interestId: string;
  leadId: string;
  buyerUserId: string;
  sellerUserId: string;
  listingId: string;
}

// "I'm Interested" (CLAUDE.md SS11; Blueprint SS10). Creates an Interest and its Lead
// together, atomically — every Interest has exactly one Lead, there is no path to one
// without the other.
@Injectable()
export class InterestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(buyerUserId: string, dto: CreateInterestDto, ipAddress?: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: dto.listingId } });
    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new ForbiddenException("Interest can only be expressed on an active listing.");
    }
    if (listing.sellerUserId === buyerUserId) {
      throw new ForbiddenException("You cannot express interest in your own listing.");
    }

    const existing = await this.prisma.interest.findUnique({
      where: { buyerUserId_listingId: { buyerUserId, listingId: dto.listingId } },
    });
    if (existing) {
      throw new ConflictException("You have already expressed interest in this listing.");
    }

    if (dto.matchId) {
      const match = await this.prisma.match.findUnique({ where: { id: dto.matchId } });
      if (!match) {
        throw new NotFoundException("Match not found.");
      }
      const buyerRequest = await this.prisma.buyerRequest.findUnique({ where: { id: match.buyerRequestId } });
      if (!buyerRequest || buyerRequest.buyerUserId !== buyerUserId || match.listingId !== dto.listingId) {
        throw new ForbiddenException("This match does not belong to you and this listing.");
      }
    }

    const { interest, lead } = await this.prisma.$transaction(async (tx) => {
      const createdInterest = await tx.interest.create({
        data: {
          buyerUserId,
          listingId: dto.listingId,
          matchId: dto.matchId,
          message: dto.message,
        },
      });
      const createdLead = await tx.lead.create({
        data: {
          interestId: createdInterest.id,
          buyerUserId,
          sellerUserId: listing.sellerUserId,
          listingId: dto.listingId,
        },
      });
      return { interest: createdInterest, lead: createdLead };
    });

    await this.auditService.record({
      actorId: buyerUserId,
      action: "interest.create",
      resourceType: "Interest",
      resourceId: interest.id,
      afterState: { interest, lead },
      ipAddress,
    });

    const event: MarketplaceInterestCreatedEvent = {
      interestId: interest.id,
      leadId: lead.id,
      buyerUserId,
      sellerUserId: listing.sellerUserId,
      listingId: dto.listingId,
    };
    this.eventEmitter.emit("marketplace.interest.created", event);

    return { ...interest, lead };
  }

  async listMine(buyerUserId: string) {
    return this.prisma.interest.findMany({
      where: { buyerUserId },
      orderBy: { createdAt: "desc" },
      include: { listing: true, lead: true },
    });
  }

  // Seller-facing: which buyers are interested in this listing. Exposes buyer identity
  // (needed to work the lead) but never buyer budget/requirement data — that stays behind
  // BuyerRequestService.get(), which is owner-only (CLAUDE.md SS13).
  async listForListing(listingId: string, sellerUserId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.sellerUserId !== sellerUserId) {
      throw new ForbiddenException("You do not own this listing.");
    }
    return this.prisma.interest.findMany({
      where: { listingId },
      orderBy: { createdAt: "desc" },
      include: { lead: true },
    });
  }
}
