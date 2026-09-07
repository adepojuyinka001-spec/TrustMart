import { Module } from "@nestjs/common";
import { BuyerRequestController } from "./buyer-request.controller";
import { BuyerRequestService } from "./buyer-request.service";
import { MatchingModule } from "../matching/matching.module";

@Module({
  imports: [MatchingModule],
  controllers: [BuyerRequestController],
  providers: [BuyerRequestService],
  exports: [BuyerRequestService],
})
export class BuyerRequestModule {}
