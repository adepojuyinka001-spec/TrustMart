import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConsentType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ConsentService } from "../consent/consent.service";
import type { RequestContactAccessDto } from "./dto/request-contact-access.dto";

// Buyer contact reveal is the single most safety-critical rule in the Marketplace
// (CLAUDE.md SS5/SS13): "Seller subscription alone must never expose buyer contact
// information." Access requires ALL of:
//   1. valid subscription/entitlement — Subscription/Entitlement is a later, separately
//      approved phase (Phase 4) and does not exist in this codebase yet, so
//      hasActiveEntitlement() below always returns false. This is deliberate fail-closed
//      behavior, not a placeholder bug: contact access CANNOT be granted until Phase 4
//      ships and this method is wired to the real entitlement check. Do not "temporarily"
//      make this return true to unblock testing.
//   2. buyer consent/contact preference (ConsentType.BUYER_CONTACT_SHARE)
//   3. valid interest/lead context (a Lead already implies this)
//   4. server-side authorization (seller must own the lead)
//   5. audit logging of every attempt, granted or denied
@Injectable()
export class ContactAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly consentService: ConsentService,
  ) {}

  // Deliberately always false until Phase 4 (Subscription Plan / Entitlement) exists.
  // See the class-level comment.
  private async hasActiveEntitlement(_sellerUserId: string): Promise<boolean> {
    return false;
  }

  async requestAccess(
    leadId: string,
    sellerUserId: string,
    dto: RequestContactAccessDto,
    ipAddress?: string,
  ): Promise<never | { granted: true; channel: string | null }> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException("Lead not found.");
    }
    if (lead.sellerUserId !== sellerUserId) {
      throw new ForbiddenException("You do not own this lead.");
    }

    const [hasEntitlement, hasConsent] = await Promise.all([
      this.hasActiveEntitlement(sellerUserId),
      this.consentService.hasGrantedConsent(lead.buyerUserId, ConsentType.BUYER_CONTACT_SHARE),
    ]);

    let denialReason: string | null = null;
    if (!hasEntitlement) {
      denialReason = "no_active_subscription_entitlement";
    } else if (!hasConsent) {
      denialReason = "buyer_has_not_consented_to_contact_share";
    }

    const granted = denialReason === null;

    await this.prisma.contactAccessGrant.create({
      data: {
        leadId,
        sellerUserId,
        granted,
        denialReason,
        channel: granted ? dto.preferredChannel ?? null : null,
      },
    });

    await this.auditService.record({
      actorId: sellerUserId,
      action: granted ? "contact_access.grant" : "contact_access.deny",
      resourceType: "Lead",
      resourceId: leadId,
      afterState: { granted, denialReason },
      ipAddress,
    });

    if (!granted) {
      throw new ForbiddenException(`Contact access denied: ${denialReason}`);
    }

    // Unreachable today (hasActiveEntitlement() always returns false) — kept so the
    // success path/response shape is already correct for when Phase 4 lands.
    return { granted: true, channel: dto.preferredChannel ?? null };
  }

  async listAttemptsForLead(leadId: string, sellerUserId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.sellerUserId !== sellerUserId) {
      throw new ForbiddenException("You do not own this lead.");
    }
    return this.prisma.contactAccessGrant.findMany({ where: { leadId }, orderBy: { createdAt: "desc" } });
  }
}
