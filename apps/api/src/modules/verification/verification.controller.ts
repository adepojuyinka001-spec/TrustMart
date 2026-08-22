import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { VerificationService } from "./verification.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { PermissionGuard } from "../rbac/permission.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { CreateVerificationCaseDto } from "./dto/create-verification-case.dto";
import { UpdateVerificationStatusDto } from "./dto/update-verification-status.dto";

@Controller("verification-cases")
@UseGuards(JwtAuthGuard)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateVerificationCaseDto, @Req() req: AuthenticatedRequest) {
    return this.verificationService.create(user.userId, dto, req.ip);
  }

  @Get("mine")
  listMine(@CurrentUser() user: RequestUser) {
    return this.verificationService.listForUser(user.userId);
  }

  @Patch(":id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("verification:review")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateVerificationStatusDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.verificationService.updateStatus(id, dto, user.userId, req.ip);
  }
}
