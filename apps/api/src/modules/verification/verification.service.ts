import { Injectable } from "@nestjs/common";
import { VerificationSubjectType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateVerificationCaseDto } from "./dto/create-verification-case.dto";
import type { UpdateVerificationStatusDto } from "./dto/update-verification-status.dto";

// Provider-agnostic shell: manual/admin-driven status transitions only. No live KYC/KYB
// provider is wired in — see docs/00-ssot/OPEN_DECISIONS.md for that pending choice.
@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(userId: string, dto: CreateVerificationCaseDto, ipAddress?: string) {
    const created = await this.prisma.verificationCase.create({
      data: {
        subjectType: dto.subjectType,
        userId: dto.subjectType === VerificationSubjectType.USER ? userId : null,
        businessId: dto.subjectType === VerificationSubjectType.BUSINESS ? dto.businessId : null,
      },
    });

    await this.auditService.record({
      actorId: userId,
      action: "verification_case.create",
      resourceType: "VerificationCase",
      resourceId: created.id,
      afterState: created,
      ipAddress,
    });

    return created;
  }

  async updateStatus(
    caseId: string,
    dto: UpdateVerificationStatusDto,
    reviewerUserId: string,
    ipAddress?: string,
  ) {
    const before = await this.prisma.verificationCase.findUniqueOrThrow({ where: { id: caseId } });
    const updated = await this.prisma.verificationCase.update({
      where: { id: caseId },
      data: { status: dto.status, notes: dto.notes },
    });

    await this.auditService.record({
      actorId: reviewerUserId,
      action: "verification_case.status_update",
      resourceType: "VerificationCase",
      resourceId: updated.id,
      beforeState: before,
      afterState: updated,
      ipAddress,
    });

    return updated;
  }

  async listForUser(userId: string) {
    return this.prisma.verificationCase.findMany({ where: { userId } });
  }
}
