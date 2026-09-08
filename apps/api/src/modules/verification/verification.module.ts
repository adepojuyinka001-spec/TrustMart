import { Module } from "@nestjs/common";
import { VerificationController } from "./verification.controller";
import { VerificationAdminController } from "./verification-admin.controller";
import { VerificationService } from "./verification.service";

@Module({
  controllers: [VerificationController, VerificationAdminController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
