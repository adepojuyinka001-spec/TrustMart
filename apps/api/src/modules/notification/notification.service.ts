import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  resourceType?: string;
  resourceId?: string;
}

// In-app notifications only (CLAUDE.md SS26/SS31 — email/SMS/WhatsApp delivery is n8n
// orchestration territory, Phase 11). This is the first consumer of the domain events
// already emitted throughout the app (match/interest/lead/escrow/listing-lifecycle) —
// before this module, every one of them was emitted into the void with nothing listening.
@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  // Respects NotificationPreference.inAppEnabled where the user has one; defaults to
  // notifying (the preference row is opt-out, not opt-in — matches its own schema default
  // of `inAppEnabled: true`).
  async create(input: CreateNotificationInput) {
    const preference = await this.prisma.notificationPreference.findUnique({ where: { userId: input.userId } });
    if (preference && !preference.inAppEnabled) {
      return null;
    }
    return this.prisma.notificationRecord.create({ data: input });
  }

  async listMine(userId: string, filter: { unreadOnly?: boolean }, page: { take: number; skip: number }) {
    const where = { userId, ...(filter.unreadOnly ? { isRead: false } : {}) };
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notificationRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: page.take,
        skip: page.skip,
      }),
      this.prisma.notificationRecord.count({ where }),
      this.prisma.notificationRecord.count({ where: { userId, isRead: false } }),
    ]);
    return { items, total, unreadCount };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notificationRecord.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException("Notification not found.");
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException("This notification does not belong to you.");
    }
    return this.prisma.notificationRecord.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notificationRecord.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }
}
