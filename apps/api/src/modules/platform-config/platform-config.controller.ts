import { Body, Controller, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import { PlatformConfigService } from "./platform-config.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { PermissionGuard } from "../rbac/permission.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { UpsertConfigDto } from "./dto/upsert-config.dto";

@Controller("platform-config")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PlatformConfigController {
  constructor(private readonly configService: PlatformConfigService) {}

  @Get()
  @RequirePermission("platform_config:read")
  list() {
    return this.configService.list();
  }

  @Get(":key")
  @RequirePermission("platform_config:read")
  getOne(@Param("key") key: string) {
    return this.configService.getRaw(key);
  }

  @Put(":key")
  @RequirePermission("platform_config:write")
  upsert(
    @Param("key") key: string,
    @Body() dto: UpsertConfigDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.configService.upsert(key, dto, user.userId, req.ip);
  }
}
