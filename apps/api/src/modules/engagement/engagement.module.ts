import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ConsentModule } from "../consent/consent.module";
import { InterestController } from "./interest.controller";
import { InterestService } from "./interest.service";
import { LeadController } from "./lead.controller";
import { LeadService } from "./lead.service";
import { ContactAccessController } from "./contact-access.controller";
import { ContactAccessService } from "./contact-access.service";

@Module({
  imports: [AuditModule, ConsentModule],
  controllers: [InterestController, LeadController, ContactAccessController],
  providers: [InterestService, LeadService, ContactAccessService],
  exports: [InterestService, LeadService, ContactAccessService],
})
export class EngagementModule {}
