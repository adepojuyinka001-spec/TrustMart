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
}
