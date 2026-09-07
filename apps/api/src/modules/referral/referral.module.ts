import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ReferralController } from "./referral.controller";
import { ReferralService } from "./referral.service";

@Module({
  imports: [AuditModule],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
