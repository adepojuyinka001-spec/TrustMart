import { Module } from "@nestjs/common";
import { ListingController } from "./listing.controller";
import { ListingService } from "./listing.service";
import { ListingLifecycleService } from "./listing-lifecycle.service";
import { PlatformConfigModule } from "../platform-config/platform-config.module";
import { AuditModule } from "../audit/audit.module";
import { MatchingModule } from "../matching/matching.module";

@Module({
  imports: [PlatformConfigModule, AuditModule, MatchingModule],
  controllers: [ListingController],
  providers: [ListingService, ListingLifecycleService],
  exports: [ListingService, ListingLifecycleService],
})
export class ListingModule {}
