import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { InterestService } from "./interest.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { CreateInterestDto } from "./dto/create-interest.dto";

@Controller()
@UseGuards(JwtAuthGuard)
export class InterestController {
  constructor(private readonly interestService: InterestService) {}

  @Post("interests")
  create(@Body() dto: CreateInterestDto, @CurrentUser() user: RequestUser, @Req() req: AuthenticatedRequest) {
    return this.interestService.create(user.userId, dto, req.ip);
  }

  @Get("interests/mine")
  listMine(@CurrentUser() user: RequestUser) {
    return this.interestService.listMine(user.userId);
  }

  @Get("listings/:id/interests")
  listForListing(@Param("id") listingId: string, @CurrentUser() user: RequestUser) {
    return this.interestService.listForListing(listingId, user.userId);
  }
}
