import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { SubscriptionPlanService } from "./subscription-plan.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { PermissionGuard } from "../rbac/permission.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { CreateSubscriptionPlanDto } from "./dto/create-subscription-plan.dto";
import { UpdateSubscriptionPlanDto } from "./dto/update-subscription-plan.dto";
import { EntitlementDto } from "./dto/entitlement.dto";

@ApiTags("Subscription Plans")
@Controller("subscription-plans")
export class SubscriptionPlanController {
  constructor(private readonly subscriptionPlanService: SubscriptionPlanService) {}

  // Public read: buyers/sellers need to see pricing/entitlements before subscribing.
  @Get()
  listActive() {
    return this.subscriptionPlanService.listActive();
  }

  @Get("all")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("subscription:manage")
  listAll() {
    return this.subscriptionPlanService.listAll();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.subscriptionPlanService.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("subscription:manage")
  create(
    @Body() dto: CreateSubscriptionPlanDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.subscriptionPlanService.create(dto, user.userId, req.ip);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("subscription:manage")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.subscriptionPlanService.update(id, dto, user.userId, req.ip);
  }

  @Post(":id/entitlements")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("subscription:manage")
  upsertEntitlement(
    @Param("id") id: string,
    @Body() dto: EntitlementDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.subscriptionPlanService.upsertEntitlement(id, dto, user.userId, req.ip);
  }
}
