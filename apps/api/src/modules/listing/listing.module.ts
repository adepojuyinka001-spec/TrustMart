import { Module } from "@nestjs/common";
import { ListingController } from "./listing.controller";
import { ListingService } from "./listing.service";
import { PlatformConfigModule } from "../platform-config/platform-config.module";
import { MatchingModule } from "../matching/matching.module";

@Module({
  imports: [PlatformConfigModule, MatchingModule],
  controllers: [ListingController],
  providers: [ListingService],
  exports: [ListingService],
})
export class ListingModule {}
