import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { SubscriptionPlanController } from "./subscription-plan.controller";
import { SubscriptionPlanService } from "./subscription-plan.service";

@Module({
  imports: [AuditModule],
  controllers: [SubscriptionPlanController],
  providers: [SubscriptionPlanService],
  exports: [SubscriptionPlanService],
})
export class SubscriptionModule {}
