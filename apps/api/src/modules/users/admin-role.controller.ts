import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { PermissionGuard } from "../rbac/permission.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";

// The full set of assignable roles (CLAUDE.md SS30 Identity domain: Role/Permission) — used
// by the User Management admin UI to populate its role-assignment control. Gated on the
// same user:manage permission as AdminUserController, not a public/listing-facing endpoint.
@ApiTags("Admin — Users")
@Controller("admin/roles")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("user:manage")
export class AdminRoleController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.adminListRoles();
  }
}
