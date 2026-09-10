import { ApiTags } from "@nestjs/swagger";
import { Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { SavedListingService } from "./saved-listing.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { CurrentUser } from "../identity/current-user.decorator";
import type { RequestUser } from "../identity/authenticated-request";

@ApiTags("Saved Listings")
@Controller()
@UseGuards(JwtAuthGuard)
export class SavedListingController {
  constructor(private readonly savedListingService: SavedListingService) {}

  @Get("saved-listings/mine")
  listMine(@CurrentUser() user: RequestUser) {
    return this.savedListingService.listMine(user.userId);
  }

  @Post("listings/:id/save")
  save(@Param("id") listingId: string, @CurrentUser() user: RequestUser) {
    return this.savedListingService.save(user.userId, listingId);
  }

  @Delete("listings/:id/save")
  @HttpCode(204)
  async unsave(@Param("id") listingId: string, @CurrentUser() user: RequestUser) {
    await this.savedListingService.unsave(user.userId, listingId);
  }
}
