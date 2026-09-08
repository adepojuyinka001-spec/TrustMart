import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { VerificationService } from "./verification.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { PermissionGuard } from "../rbac/permission.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { ListVerificationCasesDto } from "./dto/list-verification-cases.dto";

// Same shape as LeadAdminController's fix the same day: VerificationController's
// PATCH :id/status is correctly reviewer-gated with no ownership check, but there was no
// way for a reviewer to ever discover or view a case to act on — only GET /mine,
// scoped to the subject. This adds the missing read paths; the status-update action
// itself stays exactly where it already correctly lived, on VerificationController.
@ApiTags("Admin — Verification")
@Controller("admin/verification-cases")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("verification:review")
export class VerificationAdminController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get()
  list(@Query() query: ListVerificationCasesDto) {
    return this.verificationService.listForReview({ status: query.status }, { take: query.take ?? 50, skip: query.skip ?? 0 });
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.verificationService.getForReview(id);
  }
}
