import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface RecordAuditEventInput {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditEventInput) {
    return this.prisma.auditEvent.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        beforeState: input.beforeState === undefined ? undefined : (input.beforeState as object),
        afterState: input.afterState === undefined ? undefined : (input.afterState as object),
        ipAddress: input.ipAddress ?? null,
      },
    });
  }

  async listForResource(resourceType: string, resourceId: string) {
    return this.prisma.auditEvent.findMany({
      where: { resourceType, resourceId },
      orderBy: { createdAt: "desc" },
    });
  }

  // Admin-facing browse (CLAUDE.md SS25: Admin Control Centre includes "audit"). No
  // before/after diffing UI here — just filter + page through the append-only log.
  async listRecent(filter: { resourceType?: string; action?: string }, page: { take: number; skip: number }) {
    const [items, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where: { resourceType: filter.resourceType, action: filter.action },
        orderBy: { createdAt: "desc" },
        take: page.take,
        skip: page.skip,
      }),
      this.prisma.auditEvent.count({
        where: { resourceType: filter.resourceType, action: filter.action },
      }),
    ]);
    return { items, total };
  }
}
