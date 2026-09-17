import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { RiskCaseCategory, RiskCaseStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

// TrustGuard risk-signal detection (CLAUDE.md SS23) — deterministic backend logic, not AI,
// and it only ever flags. Nothing here suspends an account, removes a listing, or blocks
// any action on its own; an admin reviews a flagged case and acts through the existing,
// already-guarded endpoints (listing moderation, user status). Detection is scoped to
// signals needing no payment or KYC provider; both scans are idempotent against currently
// OPEN cases — re-running never spams duplicates for a signal already awaiting review, but
// the same subject CAN be re-flagged after a prior case was dismissed or actioned, since a
// dismissed pattern recurring later is itself worth surfacing again.
@Injectable()
export class RiskCaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async createIfNoOpenCase(category: RiskCaseCategory, subjectType: string, subjectId: string, description: string) {
    const existingOpen = await this.prisma.riskCase.findFirst({
      where: { category, subjectType, subjectId, status: RiskCaseStatus.OPEN },
    });
    if (existingOpen) return false;
    await this.prisma.riskCase.create({ data: { category, subjectType, subjectId, description } });
    return true;
  }

  // Multiple accounts registering from the same IP address. Flags the IP itself (not each
  // account individually) so a large household/office/NAT doesn't explode into one case
  // per pair — a human reviews the cluster once and decides whether it's actually abuse.
  private async scanDuplicateAccounts(): Promise<number> {
    const registrations = await this.prisma.auditEvent.findMany({
      where: { action: "auth.register", ipAddress: { not: null } },
      select: { ipAddress: true, actorId: true },
    });

    const usersByIp = new Map<string, Set<string>>();
    for (const r of registrations) {
      if (!r.ipAddress || !r.actorId) continue;
      const set = usersByIp.get(r.ipAddress) ?? new Set<string>();
      set.add(r.actorId);
      usersByIp.set(r.ipAddress, set);
    }

    let created = 0;
    for (const [ip, userIds] of usersByIp) {
      if (userIds.size < 2) continue;
      const ids = Array.from(userIds);
      const shown = ids.slice(0, 10);
      const remainder = ids.length - shown.length;
      const idList = remainder > 0 ? `${shown.join(", ")}, and ${remainder} more` : shown.join(", ");
      const flagged = await this.createIfNoOpenCase(
        RiskCaseCategory.DUPLICATE_ACCOUNTS,
        "RegistrationIP",
        ip,
        `${userIds.size} accounts registered from the same IP address: ${idList}.`,
      );
      if (flagged) created++;
    }
    return created;
  }

  // A listing priced far outside its own subcategory's typical range (median-relative, so
  // it self-calibrates per category rather than using one fixed absolute threshold across
  // wildly different item types). Only evaluated where a subcategory has enough active
  // listings (>=3) for "typical" to mean anything.
  private async scanSuspiciousPricing(): Promise<number> {
    const listings = await this.prisma.listing.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, subcategoryId: true, askingPriceMinorUnits: true },
    });

    const bySubcategory = new Map<string, typeof listings>();
    for (const listing of listings) {
      const group = bySubcategory.get(listing.subcategoryId) ?? [];
      group.push(listing);
      bySubcategory.set(listing.subcategoryId, group);
    }

    let created = 0;
    for (const group of bySubcategory.values()) {
      if (group.length < 3) continue;
      const sorted = [...group].sort((a, b) => Number(a.askingPriceMinorUnits - b.askingPriceMinorUnits));
      const median = Number(sorted[Math.floor(sorted.length / 2)].askingPriceMinorUnits);
      if (median <= 0) continue;

      for (const listing of group) {
        const price = Number(listing.askingPriceMinorUnits);
        if (price < median * 0.2 || price > median * 5) {
          const flagged = await this.createIfNoOpenCase(
            RiskCaseCategory.SUSPICIOUS_PRICING,
            "Listing",
            listing.id,
            `Asking price ${price} is far from its subcategory's median of ${median} (minor units).`,
          );
          if (flagged) created++;
        }
      }
    }
    return created;
  }

  // Admin/n8n triggers this on a schedule (same "n8n may call authenticated TrustMart
  // APIs, deterministic backend calculates" split as the listing lifecycle sweep,
  // CLAUDE.md SS26) — never both scans running as a hidden side effect of an unrelated
  // request.
  async scan() {
    const [duplicateAccounts, suspiciousPricing] = await Promise.all([
      this.scanDuplicateAccounts(),
      this.scanSuspiciousPricing(),
    ]);
    return { duplicateAccounts, suspiciousPricing, totalCreated: duplicateAccounts + suspiciousPricing };
  }

  async listCases(filter: { status?: RiskCaseStatus }, page: { take: number; skip: number }) {
    const where = { status: filter.status };
    const [items, total] = await Promise.all([
      this.prisma.riskCase.findMany({ where, orderBy: { detectedAt: "desc" }, take: page.take, skip: page.skip }),
      this.prisma.riskCase.count({ where }),
    ]);
    return { items, total };
  }

  async reviewCase(id: string, status: "DISMISSED" | "ACTIONED", notes: string | undefined, actorId: string, ipAddress?: string) {
    const existing = await this.prisma.riskCase.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Risk case not found.");
    }
    if (existing.status !== RiskCaseStatus.OPEN) {
      throw new BadRequestException("Only an OPEN case can be reviewed.");
    }

    const updated = await this.prisma.riskCase.update({
      where: { id },
      data: { status, reviewedBy: actorId, reviewedAt: new Date(), reviewNotes: notes },
    });

    await this.auditService.record({
      actorId,
      action: "risk_case.review",
      resourceType: "RiskCase",
      resourceId: id,
      beforeState: { status: existing.status },
      afterState: { status },
      ipAddress,
    });

    return updated;
  }
}
