import { Body, Controller, Get, Patch, Put, Req, UseGuards } from "@nestjs/common";
import { ConsentService } from "./consent.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { SetConsentDto } from "./dto/set-consent.dto";
import { UpdateNotificationPreferenceDto } from "./dto/update-notification-preference.dto";

@Controller("consent")
@UseGuards(JwtAuthGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.consentService.listForUser(user.userId);
  }

  @Put()
  set(@CurrentUser() user: RequestUser, @Body() dto: SetConsentDto, @Req() req: AuthenticatedRequest) {
    return this.consentService.setConsent(user.userId, dto, req.ip);
  }

  @Get("notification-preference")
  getNotificationPreference(@CurrentUser() user: RequestUser) {
    return this.consentService.getOrCreateNotificationPreference(user.userId);
  }

  @Patch("notification-preference")
  updateNotificationPreference(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateNotificationPreferenceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.consentService.updateNotificationPreference(user.userId, dto, req.ip);
  }
}
