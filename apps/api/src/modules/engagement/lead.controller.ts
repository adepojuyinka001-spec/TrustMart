import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { LeadService } from "./lead.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { PermissionGuard } from "../rbac/permission.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { UpdateLeadStatusDto } from "./dto/update-lead-status.dto";
import { ModerateLeadDto } from "./dto/moderate-lead.dto";

@Controller("leads")
@UseGuards(JwtAuthGuard)
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get("mine")
  listMine(@CurrentUser() user: RequestUser) {
    return this.leadService.listForSeller(user.userId);
  }

  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.leadService.get(id, user.userId);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateLeadStatusDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.leadService.updateStatus(id, user.userId, dto.status, dto.note, req.ip);
  }

  @Post(":id/moderate/spam-fraud")
  @UseGuards(PermissionGuard)
  @RequirePermission("lead:moderate")
  moderateAsSpamFraud(
    @Param("id") id: string,
    @Body() dto: ModerateLeadDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.leadService.moderateAsSpamFraud(id, user.userId, dto.reason, req.ip);
  }
}
