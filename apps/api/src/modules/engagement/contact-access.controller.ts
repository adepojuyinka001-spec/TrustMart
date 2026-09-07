import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ContactAccessService } from "./contact-access.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { RequestContactAccessDto } from "./dto/request-contact-access.dto";

@ApiTags("Contact Access")
@Controller("leads/:id/contact-access")
@UseGuards(JwtAuthGuard)
export class ContactAccessController {
  constructor(private readonly contactAccessService: ContactAccessService) {}

  @Post()
  requestAccess(
    @Param("id") leadId: string,
    @Body() dto: RequestContactAccessDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.contactAccessService.requestAccess(leadId, user.userId, dto, req.ip);
  }

  @Get()
  listAttempts(@Param("id") leadId: string, @CurrentUser() user: RequestUser) {
    return this.contactAccessService.listAttemptsForLead(leadId, user.userId);
  }
}
