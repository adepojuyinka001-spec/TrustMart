import { Module } from "@nestjs/common";
import { RiskAdminController } from "./risk-admin.controller";
import { RiskCaseService } from "./risk-case.service";

@Module({
  controllers: [RiskAdminController],
  providers: [RiskCaseService],
  exports: [RiskCaseService],
})
export class RiskModule {}
