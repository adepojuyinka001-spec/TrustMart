import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ListingService } from "./listing.service";
import { ListingLifecycleService } from "./listing-lifecycle.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { PermissionGuard } from "../rbac/permission.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { CreateListingDto } from "./dto/create-listing.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";
import { UpdatePriceDto } from "./dto/update-price.dto";
import { RejectListingDto } from "./dto/reject-listing.dto";

@Controller("listings")
export class ListingController {
  constructor(
    private readonly listingService: ListingService,
    private readonly listingLifecycleService: ListingLifecycleService,
  ) {}

  // n8n (or an admin) triggers this on a schedule; the sweep itself is deterministic
  // backend logic (CLAUDE.md SS26) — n8n never sets listing status directly.
  @Post("lifecycle/sweep")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("listing:lifecycle_sweep")
  sweep(@CurrentUser() user: RequestUser, @Req() req: AuthenticatedRequest) {
    return this.listingLifecycleService.sweep(user.userId, req.ip);
  }

  @Post(":id/renew")
  @UseGuards(JwtAuthGuard)
  renew(@Param("id") id: string, @CurrentUser() user: RequestUser, @Req() req: AuthenticatedRequest) {
    return this.listingLifecycleService.renew(id, user.userId, req.ip);
  }

  @Get()
  listActive(@Query("subcategoryId") subcategoryId?: string) {
    return this.listingService.listActive(subcategoryId);
  }

  @Get("mine")
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: RequestUser) {
    return this.listingService.listMine(user.userId);
  }

  @Get("moderation-queue")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("listing:moderate")
  listAwaitingModeration() {
    return this.listingService.listAwaitingModeration();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.listingService.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateListingDto, @CurrentUser() user: RequestUser, @Req() req: AuthenticatedRequest) {
    return this.listingService.create(user.userId, dto, req.ip);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateListingDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.listingService.update(id, user.userId, dto, req.ip);
  }

  @Post(":id/submit")
  @UseGuards(JwtAuthGuard)
  submit(@Param("id") id: string, @CurrentUser() user: RequestUser, @Req() req: AuthenticatedRequest) {
    return this.listingService.submit(id, user.userId, req.ip);
  }

  @Post(":id/approve")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("listing:moderate")
  approve(@Param("id") id: string, @CurrentUser() user: RequestUser, @Req() req: AuthenticatedRequest) {
    return this.listingService.approve(id, user.userId, req.ip);
  }

  @Post(":id/reject")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("listing:moderate")
  reject(
    @Param("id") id: string,
    @Body() dto: RejectListingDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.listingService.reject(id, user.userId, dto.reason, req.ip);
  }

  @Patch(":id/price")
  @UseGuards(JwtAuthGuard)
  updatePrice(
    @Param("id") id: string,
    @Body() dto: UpdatePriceDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.listingService.updatePrice(id, user.userId, dto.newPriceMinorUnits, req.ip);
  }

  @Post(":id/mark-sold")
  @UseGuards(JwtAuthGuard)
  markSold(@Param("id") id: string, @CurrentUser() user: RequestUser, @Req() req: AuthenticatedRequest) {
    return this.listingService.markSold(id, user.userId, req.ip);
  }
}
