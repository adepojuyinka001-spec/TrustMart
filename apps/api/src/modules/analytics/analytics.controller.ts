import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, UseGuards } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { PermissionGuard } from "../rbac/permission.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";

@ApiTags("Admin — Analytics")
@Controller("admin/analytics")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("analytics:read")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get("funnel")
  getFunnel() {
    return this.analyticsService.getFunnel();
  }

  @Get("liquidity")
  getLiquidity() {
    return this.analyticsService.getLiquidity();
  }
}
