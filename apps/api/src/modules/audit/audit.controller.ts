import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { PermissionGuard } from "../rbac/permission.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { ListAuditEventsDto } from "./dto/list-audit-events.dto";

@ApiTags("Admin — Audit")
@Controller("admin/audit-events")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("audit:read")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query() query: ListAuditEventsDto) {
    return this.auditService.listRecent(
      { resourceType: query.resourceType, action: query.action },
      { take: query.take ?? 50, skip: query.skip ?? 0 },
    );
  }
}
