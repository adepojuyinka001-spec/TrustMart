import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PlatformConfigModule } from "../platform-config/platform-config.module";
import { EscrowController } from "./escrow.controller";
import { EscrowService } from "./escrow.service";

@Module({
  imports: [AuditModule, PlatformConfigModule],
  controllers: [EscrowController],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class EscrowModule {}
