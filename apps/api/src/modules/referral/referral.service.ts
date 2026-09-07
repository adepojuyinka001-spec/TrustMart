import { Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { ReferralType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid transcription errors
const CODE_LENGTH = 8;

function generateCandidateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

// Company Referral (CLAUDE.md SS19). Assigned exactly once, at registration:
// self-referral and circular referral are structurally impossible here (a brand-new
// user has no referralCode yet at the moment they'd need one to refer themselves, and
// no one can retroactively change who referred them or their referrer). Fake-account/
// fabricated-transaction/collusive-farming detection is TrustGuard territory (Phase 7+)
// and out of scope here — this module only ever records the relationship, never
// computes or pays out a reward (that requires a completed, funded Escrow transaction,
// which doesn't exist yet; see Open Decision #1).
@Injectable()
export class ReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCandidateCode();
      const existing = await this.prisma.user.findUnique({ where: { referralCode: candidate } });
      if (!existing) {
        return candidate;
      }
    }
    throw new Error("Failed to generate a unique referral code after 5 attempts.");
  }

  // Called once, immediately after a new user is created (regardless of which
  // AuthProvider backs identity — see auth-provider.interface.ts). Never leaves referral
  // ownership null: falls back to COMPANY when no code was given or the code doesn't
  // match any existing user.
  async assignReferralOnRegistration(newUserId: string, referralCodeInput: string | undefined, ipAddress?: string) {
    const ownCode = await this.generateUniqueReferralCode();
    await this.prisma.user.update({ where: { id: newUserId }, data: { referralCode: ownCode } });

    let referrer: { id: string } | null = null;
    if (referralCodeInput) {
      referrer = await this.prisma.user.findUnique({
        where: { referralCode: referralCodeInput.trim().toUpperCase() },
        select: { id: true },
      });
    }

    const relationship = await this.prisma.referralRelationship.create({
      data: referrer
        ? { referredUserId: newUserId, referrerType: ReferralType.USER, referrerUserId: referrer.id }
        : { referredUserId: newUserId, referrerType: ReferralType.COMPANY },
    });

    await this.auditService.record({
      actorId: newUserId,
      action: "referral.assign",
      resourceType: "ReferralRelationship",
      resourceId: relationship.id,
      afterState: relationship,
      ipAddress,
    });

    return { ownCode, relationship };
  }

  async getMine(userId: string) {
    const [user, relationship, referralCount] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { referralCode: true } }),
      this.prisma.referralRelationship.findUnique({ where: { referredUserId: userId } }),
      this.prisma.referralRelationship.count({ where: { referrerUserId: userId } }),
    ]);

    return {
      referralCode: user.referralCode,
      referredBy: relationship?.referrerType ?? null,
      peopleReferred: referralCount,
    };
  }
}
