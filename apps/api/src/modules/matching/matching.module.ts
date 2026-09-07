import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PlatformConfigModule } from "../platform-config/platform-config.module";
import { MatchingEngineService } from "./matching-engine.service";
import { MatchingProfileService } from "./matching-profile.service";
import { MatchingController } from "./matching.controller";

@Module({
  imports: [AuditModule, PlatformConfigModule],
  controllers: [MatchingController],
  providers: [MatchingEngineService, MatchingProfileService],
  exports: [MatchingEngineService, MatchingProfileService],
})
export class MatchingModule {}
