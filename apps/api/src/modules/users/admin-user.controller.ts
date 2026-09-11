import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { PermissionGuard } from "../rbac/permission.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { ListUsersDto } from "./dto/list-users.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { AssignRoleDto } from "./dto/assign-role.dto";

// Separate from UsersController ("/users") the same way every other Admin Control Centre
// area (Leads, Verification) splits its moderator-facing read/manage surface from the
// ordinary self-service one (CLAUDE.md SS25).
@ApiTags("Admin — Users")
@Controller("admin/users")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("user:manage")
export class AdminUserController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query() query: ListUsersDto) {
    return this.usersService.adminList(
      { search: query.search, status: query.status },
      { take: query.take ?? 25, skip: query.skip ?? 0 },
    );
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.adminUpdateStatus(id, dto.status, actor.userId, req.ip);
  }

  @Post(":id/roles")
  assignRole(
    @Param("id") id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() actor: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.adminAssignRole(id, dto.roleKey, actor.userId, req.ip);
  }

  @Delete(":id/roles/:roleKey")
  revokeRole(
    @Param("id") id: string,
    @Param("roleKey") roleKey: string,
    @CurrentUser() actor: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.adminRevokeRole(id, roleKey, actor.userId, req.ip);
  }
}
