import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async getPermissionKeysForUser(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    const permissionKeys = new Set<string>();
    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.permissions) {
        permissionKeys.add(rolePermission.permission.key);
      }
    }
    return Array.from(permissionKeys);
  }

  async userHasPermission(userId: string, permissionKey: string): Promise<boolean> {
    const keys = await this.getPermissionKeysForUser(userId);
    return keys.includes(permissionKey);
  }

  async assignRole(userId: string, roleKey: string) {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { key: roleKey } });
    return this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    });
  }
}
