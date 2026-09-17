import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { RiskCaseService } from "./risk-case.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { PermissionGuard } from "../rbac/permission.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { ListRiskCasesDto } from "./dto/list-risk-cases.dto";
import { ReviewRiskCaseDto } from "./dto/review-risk-case.dto";

// TrustGuard risk queue (CLAUDE.md SS23/SS25: "Risk controls... manual review"). Scan is a
// manual/n8n-schedulable trigger, same split as the listing lifecycle sweep — deterministic
// backend detection, never AI-decided, never auto-acting on what it finds.
@ApiTags("Admin — Risk")
@Controller("admin/risk-cases")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("risk:manage")
export class RiskAdminController {
  constructor(private readonly riskCaseService: RiskCaseService) {}

  @Post("scan")
  scan() {
    return this.riskCaseService.scan();
  }

  @Get()
  list(@Query() query: ListRiskCasesDto) {
    return this.riskCaseService.listCases({ status: query.status }, { take: query.take ?? 50, skip: query.skip ?? 0 });
  }

  @Patch(":id/review")
  review(
    @Param("id") id: string,
    @Body() dto: ReviewRiskCaseDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.riskCaseService.reviewCase(id, dto.status, dto.notes, user.userId, req.ip);
  }
}
