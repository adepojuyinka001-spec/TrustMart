import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateMatchingProfileDto } from "./dto/create-matching-profile.dto";

// Admin-managed, versioned per-subcategory weight sets (CLAUDE.md SS9: "these are
// examples/configuration, not permanent hard-coded rules"). Creating a new profile
// version deactivates the previous one; existing Match rows keep pointing at whichever
// profile version scored them until the next recalculation.
@Injectable()
export class MatchingProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateMatchingProfileDto, actorId: string, ipAddress?: string) {
    const subcategory = await this.prisma.subcategory.findUnique({ where: { id: dto.subcategoryId } });
    if (!subcategory) {
      throw new NotFoundException("Subcategory not found.");
    }

    const latest = await this.prisma.matchingProfile.findFirst({
      where: { subcategoryId: dto.subcategoryId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const profile = await this.prisma.$transaction(async (tx) => {
      await tx.matchingProfile.updateMany({
        where: { subcategoryId: dto.subcategoryId, isActive: true },
        data: { isActive: false },
      });

      return tx.matchingProfile.create({
        data: {
          subcategoryId: dto.subcategoryId,
          version: nextVersion,
          isActive: true,
          thresholdOverridePercent: dto.thresholdOverridePercent,
          criteria: {
            create: dto.criteria.map((c) => ({ attributeId: c.attributeId, defaultWeight: c.defaultWeight })),
          },
        },
        include: { criteria: true },
      });
    });

    await this.auditService.record({
      actorId,
      action: "matching_profile.create",
      resourceType: "MatchingProfile",
      resourceId: profile.id,
      afterState: profile,
      ipAddress,
    });

    return profile;
  }

  async getActiveForSubcategory(subcategoryId: string) {
    return this.prisma.matchingProfile.findFirst({
      where: { subcategoryId, isActive: true },
      orderBy: { version: "desc" },
      include: { criteria: { include: { attribute: true } } },
    });
  }

  // Admin overview (`matching:manage`) — before this, there was no way to see which
  // subcategories already have a custom weight profile vs. still running on whatever
  // default the Matching Engine falls back to, short of querying the database directly.
  async listAllActive() {
    return this.prisma.matchingProfile.findMany({
      where: { isActive: true },
      orderBy: { subcategoryId: "asc" },
      include: {
        subcategory: { include: { category: true } },
        criteria: { include: { attribute: true } },
      },
    });
  }
}
