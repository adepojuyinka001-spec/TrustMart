import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigValueType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { UpsertConfigDto } from "./dto/upsert-config.dto";

function parseValue(valueType: ConfigValueType, raw: string): string | number | boolean | unknown {
  switch (valueType) {
    case ConfigValueType.NUMBER:
      return Number(raw);
    case ConfigValueType.BOOLEAN:
      return raw === "true";
    case ConfigValueType.JSON:
      return JSON.parse(raw);
    case ConfigValueType.STRING:
    default:
      return raw;
  }
}

// Shared Core config engine. Other modules (Marketplace matching threshold, listing
// lifecycle, subscription pricing, Escrow fee, etc.) must read values through this
// service instead of hard-coding constants (CLAUDE.md SS4, SS6).
@Injectable()
export class PlatformConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list() {
    return this.prisma.platformConfiguration.findMany({ orderBy: { key: "asc" } });
  }

  async getRaw(key: string) {
    const config = await this.prisma.platformConfiguration.findUnique({ where: { key } });
    if (!config) {
      throw new NotFoundException(`Unknown configuration key: ${key}`);
    }
    return config;
  }

  async getValue<T = unknown>(key: string): Promise<T> {
    const config = await this.getRaw(key);
    return parseValue(config.valueType, config.value) as T;
  }

  async upsert(key: string, dto: UpsertConfigDto, actorId: string, ipAddress?: string) {
    const before = await this.prisma.platformConfiguration.findUnique({ where: { key } });

    const updated = await this.prisma.platformConfiguration.upsert({
      where: { key },
      update: {
        valueType: dto.valueType,
        value: dto.value,
        description: dto.description,
        updatedById: actorId,
        version: (before?.version ?? 0) + 1,
      },
      create: {
        key,
        valueType: dto.valueType,
        value: dto.value,
        description: dto.description,
        updatedById: actorId,
      },
    });

    await this.auditService.record({
      actorId,
      action: "platform_config.upsert",
      resourceType: "PlatformConfiguration",
      resourceId: updated.id,
      beforeState: before ?? undefined,
      afterState: updated,
      ipAddress,
    });

    return updated;
  }
}
