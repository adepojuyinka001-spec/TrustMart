import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getSelf(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) {
      throw new NotFoundException("User not found.");
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, ipAddress?: string) {
    const before = await this.prisma.profile.findUnique({ where: { userId } });
    const updated = await this.prisma.profile.update({
      where: { userId },
      data: dto,
    });

    await this.auditService.record({
      actorId: userId,
      action: "user.profile.update",
      resourceType: "Profile",
      resourceId: updated.id,
      beforeState: before ?? undefined,
      afterState: updated,
      ipAddress,
    });

    return updated;
  }
}
