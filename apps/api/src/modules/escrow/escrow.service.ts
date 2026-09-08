import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EscrowOriginType, EscrowPartyRole, EscrowPartyStatus, EscrowStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PlatformConfigService } from "../platform-config/platform-config.service";
import type { CreateEscrowDto } from "./dto/create-escrow.dto";
import type { ProposeAmendmentDto } from "./dto/propose-amendment.dto";
import type { CreateEscrowFromLeadDto } from "./dto/create-escrow-from-lead.dto";

// Standalone Escrow, non-financial scaffolding (CLAUDE.md SS14-15). See the schema-level
// comment on EscrowTransaction for the full scope boundary — this service never touches
// money, a ledger, or a payment provider. It stops at ACCEPTED.
@Injectable()
export class EscrowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: PlatformConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async assertIsParty(escrowId: string, userId: string) {
    const escrow = await this.prisma.escrowTransaction.findUnique({
      where: { id: escrowId },
      include: { parties: true },
    });
    if (!escrow) {
      throw new NotFoundException("Escrow transaction not found.");
    }
    const party = escrow.parties.find((p) => p.userId === userId);
    if (!party) {
      throw new ForbiddenException("You are not a party to this escrow transaction.");
    }
    return { escrow, party };
  }

  async create(creatorUserId: string, dto: CreateEscrowDto, ipAddress?: string) {
    if (dto.invitedParties.some((p) => p.userId === creatorUserId)) {
      throw new ConflictException("You cannot invite yourself as a separate party.");
    }
    const invitedUserIds = new Set(dto.invitedParties.map((p) => p.userId));
    if (invitedUserIds.size !== dto.invitedParties.length) {
      throw new ConflictException("Each invited party must be a distinct user.");
    }
    if (dto.feeAllocation === "SHARED" && dto.buyerFeeSharePercent === undefined) {
      throw new ConflictException("buyerFeeSharePercent is required when feeAllocation is SHARED.");
    }

    const feePercent = await this.configService.getValue<number>("escrow.fee_percent");

    const escrow = await this.prisma.$transaction(async (tx) => {
      const created = await tx.escrowTransaction.create({
        data: {
          originType: dto.originType,
          originListingId: dto.originListingId,
          createdByUserId: creatorUserId,
          title: dto.title,
          description: dto.description,
          currency: dto.currency ?? "NGN",
          status: EscrowStatus.TERMS_PROPOSED,
          parties: {
            create: [
              { userId: creatorUserId, role: dto.creatorRole, status: EscrowPartyStatus.ACCEPTED, respondedAt: new Date() },
              ...dto.invitedParties.map((p) => ({ userId: p.userId, role: p.role })),
            ],
          },
        },
      });

      const termVersion = await tx.escrowTermVersion.create({
        data: {
          escrowId: created.id,
          version: 1,
          transactionAmountMinorUnits: BigInt(dto.transactionAmountMinorUnits),
          feePercent,
          feeAllocation: dto.feeAllocation,
          buyerFeeSharePercent: dto.buyerFeeSharePercent,
          proposedByUserId: creatorUserId,
          conditions: dto.conditions
            ? { create: dto.conditions.map((description, index) => ({ description, displayOrder: index })) }
            : undefined,
        },
        include: { conditions: true },
      });

      await tx.escrowTransaction.update({
        where: { id: created.id },
        data: { activeTermVersionId: termVersion.id },
      });

      // The creator implicitly accepts the terms they themselves proposed.
      await tx.escrowAcceptance.create({ data: { termVersionId: termVersion.id, userId: creatorUserId } });

      return { ...created, activeTermVersionId: termVersion.id, termVersion };
    });

    await this.auditService.record({
      actorId: creatorUserId,
      action: "escrow.create",
      resourceType: "EscrowTransaction",
      resourceId: escrow.id,
      afterState: escrow,
      ipAddress,
    });

    this.eventEmitter.emit("escrow.created", { escrowId: escrow.id, originType: dto.originType });

    return this.get(escrow.id, creatorUserId);
  }

  // Marketplace -> Optional Escrow handoff (CLAUDE.md SS4/SS9: "Secure This Deal With
  // TrustMart Escrow"). Prefills origin/counterparty/amount from an existing Lead, but
  // this is still just a DRAFT proposal through the normal create() path below — the
  // counterparty must still explicitly accept, same as any other escrow. Never silently
  // converts Marketplace data into binding terms.
  async createFromLead(leadId: string, initiatorUserId: string, dto: CreateEscrowFromLeadDto, ipAddress?: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException("Lead not found.");
    }
    if (lead.buyerUserId !== initiatorUserId && lead.sellerUserId !== initiatorUserId) {
      throw new ForbiddenException("You are not a party to this lead.");
    }

    const listing = await this.prisma.listing.findUnique({ where: { id: lead.listingId } });
    if (!listing) {
      throw new NotFoundException("The listing behind this lead no longer exists.");
    }

    const initiatorIsBuyer = initiatorUserId === lead.buyerUserId;
    const counterpartyUserId = initiatorIsBuyer ? lead.sellerUserId : lead.buyerUserId;

    const createDto: CreateEscrowDto = {
      originType: EscrowOriginType.MARKETPLACE,
      originListingId: listing.id,
      title: listing.title,
      description: `Escrow for lead ${lead.id}, listing "${listing.title}".`,
      currency: listing.currency,
      creatorRole: initiatorIsBuyer ? EscrowPartyRole.BUYER : EscrowPartyRole.SELLER,
      invitedParties: [
        { userId: counterpartyUserId, role: initiatorIsBuyer ? EscrowPartyRole.SELLER : EscrowPartyRole.BUYER },
      ],
      transactionAmountMinorUnits: dto.transactionAmountMinorUnits ?? Number(listing.askingPriceMinorUnits),
      feeAllocation: dto.feeAllocation,
      buyerFeeSharePercent: dto.buyerFeeSharePercent,
      conditions: dto.conditions,
    };

    const escrow = await this.create(initiatorUserId, createDto, ipAddress);

    this.eventEmitter.emit("escrow.draft_created_from_marketplace", { escrowId: escrow.id, leadId });

    return escrow;
  }

  async proposeAmendment(escrowId: string, proposerUserId: string, dto: ProposeAmendmentDto, ipAddress?: string) {
    const { escrow } = await this.assertIsParty(escrowId, proposerUserId);
    if (escrow.status === EscrowStatus.CANCELLED) {
      throw new ForbiddenException("This escrow transaction is cancelled.");
    }
    if (dto.feeAllocation === "SHARED" && dto.buyerFeeSharePercent === undefined) {
      throw new ConflictException("buyerFeeSharePercent is required when feeAllocation is SHARED.");
    }

    const latest = await this.prisma.escrowTermVersion.findFirst({
      where: { escrowId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latest?.version ?? 0) + 1;
    const feePercent = latest?.feePercent ?? (await this.configService.getValue<number>("escrow.fee_percent"));

    const termVersion = await this.prisma.$transaction(async (tx) => {
      const created = await tx.escrowTermVersion.create({
        data: {
          escrowId,
          version: nextVersion,
          transactionAmountMinorUnits: BigInt(dto.transactionAmountMinorUnits),
          feePercent,
          feeAllocation: dto.feeAllocation,
          buyerFeeSharePercent: dto.buyerFeeSharePercent,
          proposedByUserId: proposerUserId,
          conditions: dto.conditions
            ? { create: dto.conditions.map((description, index) => ({ description, displayOrder: index })) }
            : undefined,
        },
        include: { conditions: true },
      });

      // A material amendment resets to TERMS_PROPOSED and requires fresh acceptance from
      // everyone, including whoever proposed it (CLAUDE.md SS14).
      await tx.escrowTransaction.update({
        where: { id: escrowId },
        data: { activeTermVersionId: created.id, status: EscrowStatus.TERMS_PROPOSED },
      });
      await tx.escrowAcceptance.create({ data: { termVersionId: created.id, userId: proposerUserId } });

      return created;
    });

    await this.auditService.record({
      actorId: proposerUserId,
      action: "escrow.propose_amendment",
      resourceType: "EscrowTransaction",
      resourceId: escrowId,
      afterState: termVersion,
      ipAddress,
    });

    return this.get(escrowId, proposerUserId);
  }

  async accept(escrowId: string, userId: string, ipAddress?: string) {
    const { escrow, party } = await this.assertIsParty(escrowId, userId);
    if (escrow.status !== EscrowStatus.TERMS_PROPOSED) {
      throw new ForbiddenException(`Terms cannot be accepted while status is ${escrow.status}.`);
    }
    if (!escrow.activeTermVersionId) {
      throw new ConflictException("No active term version to accept.");
    }

    const existingAcceptance = await this.prisma.escrowAcceptance.findUnique({
      where: { termVersionId_userId: { termVersionId: escrow.activeTermVersionId, userId } },
    });
    if (!existingAcceptance) {
      await this.prisma.escrowAcceptance.create({
        data: { termVersionId: escrow.activeTermVersionId, userId },
      });
    }
    if (party.status === EscrowPartyStatus.INVITED) {
      await this.prisma.escrowParty.update({
        where: { id: party.id },
        data: { status: EscrowPartyStatus.ACCEPTED, respondedAt: new Date() },
      });
    }

    const allParties = await this.prisma.escrowParty.findMany({ where: { escrowId } });
    const acceptances = await this.prisma.escrowAcceptance.findMany({
      where: { termVersionId: escrow.activeTermVersionId },
    });
    const acceptedUserIds = new Set(acceptances.map((a) => a.userId));
    const everyonePartyAccepted = allParties.every(
      (p) => p.status !== EscrowPartyStatus.DECLINED && acceptedUserIds.has(p.userId),
    );

    let finalStatus: EscrowStatus = escrow.status;
    if (everyonePartyAccepted) {
      const updated = await this.prisma.escrowTransaction.update({
        where: { id: escrowId },
        data: { status: EscrowStatus.ACCEPTED },
      });
      finalStatus = updated.status;
      this.eventEmitter.emit("escrow.terms_accepted", { escrowId, termVersionId: escrow.activeTermVersionId });
    }

    await this.auditService.record({
      actorId: userId,
      action: "escrow.accept",
      resourceType: "EscrowTransaction",
      resourceId: escrowId,
      afterState: { status: finalStatus },
      ipAddress,
    });

    return this.get(escrowId, userId);
  }

  async decline(escrowId: string, userId: string, ipAddress?: string) {
    const { escrow, party } = await this.assertIsParty(escrowId, userId);
    if (escrow.status !== EscrowStatus.DRAFT && escrow.status !== EscrowStatus.TERMS_PROPOSED) {
      throw new ForbiddenException(`This escrow transaction cannot be declined while status is ${escrow.status}.`);
    }

    await this.prisma.$transaction([
      this.prisma.escrowParty.update({
        where: { id: party.id },
        data: { status: EscrowPartyStatus.DECLINED, respondedAt: new Date() },
      }),
      this.prisma.escrowTransaction.update({
        where: { id: escrowId },
        data: { status: EscrowStatus.CANCELLED, cancelledAt: new Date(), cancelReason: "Declined by a party" },
      }),
    ]);

    await this.auditService.record({
      actorId: userId,
      action: "escrow.decline",
      resourceType: "EscrowTransaction",
      resourceId: escrowId,
      afterState: { status: EscrowStatus.CANCELLED },
      ipAddress,
    });

    return this.get(escrowId, userId);
  }

  async cancel(escrowId: string, userId: string, reason: string, ipAddress?: string) {
    const { escrow } = await this.assertIsParty(escrowId, userId);
    if (escrow.status === EscrowStatus.CANCELLED) {
      throw new ForbiddenException("This escrow transaction is already cancelled.");
    }

    const updated = await this.prisma.escrowTransaction.update({
      where: { id: escrowId },
      data: { status: EscrowStatus.CANCELLED, cancelledAt: new Date(), cancelReason: reason },
    });

    await this.auditService.record({
      actorId: userId,
      action: "escrow.cancel",
      resourceType: "EscrowTransaction",
      resourceId: escrowId,
      beforeState: { status: escrow.status },
      afterState: { status: updated.status, cancelReason: reason },
      ipAddress,
    });

    return this.get(escrowId, userId);
  }

  async get(escrowId: string, requestingUserId: string) {
    const escrow = await this.prisma.escrowTransaction.findUnique({
      where: { id: escrowId },
      include: {
        parties: true,
        termVersions: {
          orderBy: { version: "desc" },
          include: { conditions: { orderBy: { displayOrder: "asc" } }, acceptances: true },
        },
      },
    });
    if (!escrow) {
      throw new NotFoundException("Escrow transaction not found.");
    }
    if (!escrow.parties.some((p) => p.userId === requestingUserId)) {
      throw new ForbiddenException("You are not a party to this escrow transaction.");
    }
    return escrow;
  }

  async listMine(userId: string) {
    return this.prisma.escrowTransaction.findMany({
      where: { parties: { some: { userId } } },
      orderBy: { updatedAt: "desc" },
      include: {
        parties: true,
        termVersions: {
          orderBy: { version: "desc" },
          include: { conditions: { orderBy: { displayOrder: "asc" } }, acceptances: true },
        },
      },
    });
  }
}
