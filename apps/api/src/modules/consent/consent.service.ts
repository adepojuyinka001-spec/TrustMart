import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { SetConsentDto } from "./dto/set-consent.dto";
import type { UpdateNotificationPreferenceDto } from "./dto/update-notification-preference.dto";

// Buyer contact reveal (CLAUDE.md SS5) depends on consent recorded here, in addition to
// subscription entitlement and interest/lead context handled by the (later) Marketplace phase.
@Injectable()
export class ConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async setConsent(userId: string, dto: SetConsentDto, ipAddress?: string) {
    const before = await this.prisma.consent.findUnique({
      where: { userId_type: { userId, type: dto.type } },
    });

    const now = new Date();
    const updated = await this.prisma.consent.upsert({
      where: { userId_type: { userId, type: dto.type } },
      update: {
        granted: dto.granted,
        grantedAt: dto.granted ? now : before?.grantedAt ?? null,
        revokedAt: dto.granted ? null : now,
      },
      create: {
        userId,
        type: dto.type,
        granted: dto.granted,
        grantedAt: dto.granted ? now : null,
        revokedAt: dto.granted ? null : now,
      },
    });

    await this.auditService.record({
      actorId: userId,
      action: "consent.set",
      resourceType: "Consent",
      resourceId: updated.id,
      beforeState: before ?? undefined,
      afterState: updated,
      ipAddress,
    });

    return updated;
  }

  async listForUser(userId: string) {
    return this.prisma.consent.findMany({ where: { userId } });
  }

  async hasGrantedConsent(userId: string, type: SetConsentDto["type"]): Promise<boolean> {
    const consent = await this.prisma.consent.findUnique({
      where: { userId_type: { userId, type } },
    });
    return Boolean(consent?.granted);
  }

  async getOrCreateNotificationPreference(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async updateNotificationPreference(
    userId: string,
    dto: UpdateNotificationPreferenceDto,
    ipAddress?: string,
  ) {
    const before = await this.getOrCreateNotificationPreference(userId);
    const updated = await this.prisma.notificationPreference.update({
      where: { userId },
      data: dto,
    });

    await this.auditService.record({
      actorId: userId,
      action: "notification_preference.update",
      resourceType: "NotificationPreference",
      resourceId: updated.id,
      beforeState: before,
      afterState: updated,
      ipAddress,
    });

    return updated;
  }
}
