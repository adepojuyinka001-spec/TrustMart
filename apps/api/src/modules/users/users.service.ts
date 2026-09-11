import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { UserStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { RbacService } from "../rbac/rbac.service";
import type { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly rbacService: RbacService,
  ) {}

  // `permissions` here is a UX convenience only (e.g. so the web app knows whether to
  // show the Admin nav section) — it is never the authorization decision itself. Every
  // admin endpoint still independently enforces via PermissionGuard server-side
  // (CLAUDE.md SS32: "Never rely on frontend hiding for authorization").
  async getSelf(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) {
      throw new NotFoundException("User not found.");
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    const permissions = await this.rbacService.getPermissionKeysForUser(userId);
    return { ...safeUser, permissions };
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

  // --- Admin (CLAUDE.md SS25: "users" is the first Admin Control Centre area, and had no
  // read/manage surface at all before this — a real gap, not a nice-to-have, since there
  // was previously no way to promote an account to ADMIN except a direct database edit). ---

  async adminList(filter: { search?: string; status?: UserStatus }, page: { take: number; skip: number }) {
    const where = {
      status: filter.status,
      ...(filter.search
        ? {
            OR: [
              { email: { contains: filter.search, mode: "insensitive" as const } },
              { profile: { firstName: { contains: filter.search, mode: "insensitive" as const } } },
              { profile: { lastName: { contains: filter.search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { profile: true, userRoles: { include: { role: true } } },
        orderBy: { createdAt: "desc" },
        take: page.take,
        skip: page.skip,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map(({ passwordHash: _passwordHash, ...safeUser }) => safeUser),
      total,
    };
  }

  // Self-modification is blocked on every admin user-management action below — not a
  // permission a narrower role is missing, a hard rule so an admin can never accidentally
  // suspend or de-role their own only-admin account and lock the platform's Admin Control
  // Centre out from under themselves.
  private assertNotSelf(actorUserId: string, targetUserId: string) {
    if (actorUserId === targetUserId) {
      throw new ForbiddenException("You cannot change your own account status or roles here.");
    }
  }

  async adminUpdateStatus(targetUserId: string, status: UserStatus, actorUserId: string, ipAddress?: string) {
    this.assertNotSelf(actorUserId, targetUserId);
    const existing = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!existing) {
      throw new NotFoundException("User not found.");
    }

    const updated = await this.prisma.user.update({ where: { id: targetUserId }, data: { status } });

    await this.auditService.record({
      actorId: actorUserId,
      action: "user.status.update",
      resourceType: "User",
      resourceId: targetUserId,
      beforeState: { status: existing.status },
      afterState: { status },
      ipAddress,
    });

    const { passwordHash: _passwordHash, ...safeUser } = updated;
    return safeUser;
  }

  async adminAssignRole(targetUserId: string, roleKey: string, actorUserId: string, ipAddress?: string) {
    this.assertNotSelf(actorUserId, targetUserId);
    const existing = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!existing) {
      throw new NotFoundException("User not found.");
    }

    await this.rbacService.assignRole(targetUserId, roleKey);

    await this.auditService.record({
      actorId: actorUserId,
      action: "user.role.assign",
      resourceType: "User",
      resourceId: targetUserId,
      afterState: { roleKey },
      ipAddress,
    });

    return this.getRolesForUser(targetUserId);
  }

  async adminRevokeRole(targetUserId: string, roleKey: string, actorUserId: string, ipAddress?: string) {
    this.assertNotSelf(actorUserId, targetUserId);
    const role = await this.prisma.role.findUnique({ where: { key: roleKey } });
    if (!role) {
      throw new NotFoundException("Role not found.");
    }

    await this.prisma.userRole.deleteMany({ where: { userId: targetUserId, roleId: role.id } });

    await this.auditService.record({
      actorId: actorUserId,
      action: "user.role.revoke",
      resourceType: "User",
      resourceId: targetUserId,
      beforeState: { roleKey },
      ipAddress,
    });

    return this.getRolesForUser(targetUserId);
  }

  private async getRolesForUser(userId: string) {
    const userRoles = await this.prisma.userRole.findMany({ where: { userId }, include: { role: true } });
    return userRoles.map((ur) => ur.role);
  }

  async adminListRoles() {
    return this.prisma.role.findMany({ orderBy: { key: "asc" } });
  }
}
