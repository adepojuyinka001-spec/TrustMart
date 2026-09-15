import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { LedgerService } from "./ledger.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { PermissionGuard } from "../rbac/permission.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { ListLedgerEntriesDto } from "./dto/list-ledger-entries.dto";

// Read-only (CLAUDE.md SS25 Admin Control Centre: "ledger views"). Nothing posts to the
// ledger yet — this exists so the engine is inspectable as soon as something does, and so
// its own correctness (balances, immutability) is visible without a raw DB query.
@ApiTags("Admin — Ledger")
@Controller("admin/ledger")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("ledger:read")
export class LedgerAdminController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get("accounts")
  listAccounts() {
    return this.ledgerService.listAccounts();
  }

  @Get("accounts/:key/entries")
  listEntries(@Param("key") key: string, @Query() query: ListLedgerEntriesDto) {
    return this.ledgerService.listEntriesForAccount(key, { take: query.take ?? 50, skip: query.skip ?? 0 });
  }
}
