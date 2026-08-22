import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateBusinessDto } from "./dto/create-business.dto";

@Injectable()
export class BusinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(ownerUserId: string, dto: CreateBusinessDto, ipAddress?: string) {
    const business = await this.prisma.business.create({
      data: {
        ...dto,
        staff: {
          create: { userId: ownerUserId, role: "OWNER" },
        },
      },
    });

    await this.auditService.record({
      actorId: ownerUserId,
      action: "business.create",
      resourceType: "Business",
      resourceId: business.id,
      afterState: business,
      ipAddress,
    });

    return business;
  }

  async getForUser(businessId: string, userId: string) {
    const staffLink = await this.prisma.businessStaff.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
    if (!staffLink) {
      throw new ForbiddenException("You are not staff of this business.");
    }

    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException("Business not found.");
    }
    return business;
  }

  async listForUser(userId: string) {
    return this.prisma.business.findMany({
      where: { staff: { some: { userId } } },
    });
  }
}
