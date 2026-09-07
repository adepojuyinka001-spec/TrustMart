import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, UseGuards } from "@nestjs/common";
import { ReferralService } from "./referral.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { CurrentUser } from "../identity/current-user.decorator";
import type { RequestUser } from "../identity/authenticated-request";

@ApiTags("Referrals")
@Controller("referrals")
@UseGuards(JwtAuthGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get("mine")
  getMine(@CurrentUser() user: RequestUser) {
    return this.referralService.getMine(user.userId);
  }
}
