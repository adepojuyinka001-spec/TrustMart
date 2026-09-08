import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { LeadService } from "./lead.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { PermissionGuard } from "../rbac/permission.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { ListLeadsForModerationDto } from "./dto/list-leads-for-moderation.dto";

// Separate from LeadController ("/leads") for the same reason Analytics/Audit live under
// "admin/..." — a moderator/admin isn't a party to most leads, so the ordinary
// buyer/seller-scoped endpoints (which 403 non-parties) can't serve this. Without this,
// the lead:moderate permission and LeadController's existing POST
// /leads/:id/moderate/spam-fraud had no way to ever be reached in practice: nothing let a
// moderator discover or view a lead they aren't a party to. The moderate-as-spam-fraud
// action itself stays on LeadController (already built, tested, and correctly
// ownership-free) — this controller only adds the missing read paths.
@ApiTags("Admin — Lead Moderation")
@Controller("admin/leads")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("lead:moderate")
export class LeadAdminController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  list(@Query() query: ListLeadsForModerationDto) {
    return this.leadService.listForModeration({ status: query.status }, { take: query.take ?? 50, skip: query.skip ?? 0 });
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.leadService.getForModeration(id);
  }
}
