import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { LeadStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { SellerSettableLeadStatus } from "./dto/update-lead-status.dto";

export interface MarketplaceLeadStatusChangedEvent {
  leadId: string;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus;
}

// Lead status changes (CLAUDE.md SS11; Blueprint SS10). WON/LOST/SPAM_FRAUD are terminal
// — no further seller-driven transition is accepted once reached.
const TERMINAL_STATUSES: LeadStatus[] = [LeadStatus.WON, LeadStatus.LOST, LeadStatus.SPAM_FRAUD];

@Injectable()
export class LeadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async assertOwnsLead(leadId: string, sellerUserId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException("Lead not found.");
    }
    if (lead.sellerUserId !== sellerUserId) {
      throw new ForbiddenException("You do not own this lead.");
    }
    return lead;
  }

  private async transition(
    leadId: string,
    actorUserId: string,
    toStatus: LeadStatus,
    note: string | undefined,
    lead: { status: LeadStatus },
    ipAddress?: string,
  ) {
    if (TERMINAL_STATUSES.includes(lead.status)) {
      throw new ForbiddenException(`Lead cannot change status once it is ${lead.status}.`);
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.lead.update({ where: { id: leadId }, data: { status: toStatus } }),
      this.prisma.leadActivity.create({
        data: { leadId, fromStatus: lead.status, toStatus, actorUserId, note },
      }),
    ]);

    await this.auditService.record({
      actorId: actorUserId,
      action: "lead.status_change",
      resourceType: "Lead",
      resourceId: leadId,
      beforeState: { status: lead.status },
      afterState: { status: toStatus },
      ipAddress,
    });

    const event: MarketplaceLeadStatusChangedEvent = { leadId, fromStatus: lead.status, toStatus };
    this.eventEmitter.emit("marketplace.lead.status_changed", event);

    return updated;
  }

  async updateStatus(
    leadId: string,
    sellerUserId: string,
    toStatus: SellerSettableLeadStatus,
    note: string | undefined,
    ipAddress?: string,
  ) {
    const lead = await this.assertOwnsLead(leadId, sellerUserId);
    return this.transition(leadId, sellerUserId, toStatus, note, lead, ipAddress);
  }

  // SPAM_FRAUD is a controlled moderation/risk action (CLAUDE.md SS11), gated by the
  // lead:moderate permission at the controller level — never a normal seller transition.
  async moderateAsSpamFraud(leadId: string, moderatorId: string, reason: string, ipAddress?: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException("Lead not found.");
    }
    return this.transition(leadId, moderatorId, LeadStatus.SPAM_FRAUD, reason, lead, ipAddress);
  }

  async get(leadId: string, requestingUserId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { activities: { orderBy: { createdAt: "asc" } }, interest: true },
    });
    if (!lead) {
      throw new NotFoundException("Lead not found.");
    }
    if (lead.sellerUserId !== requestingUserId && lead.buyerUserId !== requestingUserId) {
      throw new ForbiddenException("You are not a party to this lead.");
    }
    return lead;
  }

  async listForSeller(sellerUserId: string) {
    return this.prisma.lead.findMany({
      where: { sellerUserId },
      orderBy: { updatedAt: "desc" },
    });
  }

  // Moderator/admin browse (CLAUDE.md SS11: SPAM_FRAUD "must use a controlled
  // moderation/risk process"). The `lead:moderate`-gated POST .../spam-fraud endpoint has
  // existed since Engagement, but a moderator who isn't a party to a lead had no way to
  // ever discover or view one — the ordinary `get()` above 403s anyone who isn't the
  // buyer/seller, and there was no list endpoint at all. Found while auditing what admin
  // permissions actually have working UI paths.
  async listForModeration(filter: { status?: LeadStatus }, page: { take: number; skip: number }) {
    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where: { status: filter.status },
        orderBy: { createdAt: "desc" },
        take: page.take,
        skip: page.skip,
        include: { interest: { include: { listing: { select: { title: true } } } } },
      }),
      this.prisma.lead.count({ where: { status: filter.status } }),
    ]);
    return { items, total };
  }

  async getForModeration(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        activities: { orderBy: { createdAt: "asc" } },
        interest: { include: { listing: { select: { title: true } } } },
      },
    });
    if (!lead) {
      throw new NotFoundException("Lead not found.");
    }
    return lead;
  }
}
