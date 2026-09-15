import { Module } from "@nestjs/common";
import { LedgerAdminController } from "./ledger-admin.controller";
import { LedgerService } from "./ledger.service";

@Module({
  controllers: [LedgerAdminController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
