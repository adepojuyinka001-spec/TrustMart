import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ConsentModule } from "../consent/consent.module";
import { InterestController } from "./interest.controller";
import { InterestService } from "./interest.service";
import { LeadController } from "./lead.controller";
import { LeadAdminController } from "./lead-admin.controller";
import { LeadService } from "./lead.service";
import { ContactAccessController } from "./contact-access.controller";
import { ContactAccessService } from "./contact-access.service";
import { SavedListingController } from "./saved-listing.controller";
import { SavedListingService } from "./saved-listing.service";

@Module({
  imports: [AuditModule, ConsentModule],
  controllers: [InterestController, LeadController, LeadAdminController, ContactAccessController, SavedListingController],
  providers: [InterestService, LeadService, ContactAccessService, SavedListingService],
  exports: [InterestService, LeadService, ContactAccessService, SavedListingService],
})
export class EngagementModule {}
