import { ApiTags } from "@nestjs/swagger";
import { Controller, Delete, Get, Param, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Express } from "express";
import { memoryStorage } from "multer";
import { ListingMediaService } from "./listing-media.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { CurrentUser } from "../identity/current-user.decorator";
import type { RequestUser } from "../identity/authenticated-request";

@ApiTags("Listing Photos")
@Controller("listings/:id/media")
export class ListingMediaController {
  constructor(private readonly listingMediaService: ListingMediaService) {}

  @Get()
  list(@Param("id") listingId: string) {
    return this.listingMediaService.listForListing(listingId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor("photos", 8, { storage: memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } }))
  upload(
    @Param("id") listingId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: RequestUser,
  ) {
    return this.listingMediaService.upload(
      listingId,
      user.userId,
      (files ?? []).map((f) => ({ buffer: f.buffer, mimetype: f.mimetype, size: f.size })),
    );
  }

  @Patch(":mediaId/primary")
  @UseGuards(JwtAuthGuard)
  setPrimary(@Param("id") listingId: string, @Param("mediaId") mediaId: string, @CurrentUser() user: RequestUser) {
    return this.listingMediaService.setPrimary(listingId, mediaId, user.userId);
  }

  @Delete(":mediaId")
  @UseGuards(JwtAuthGuard)
  remove(@Param("id") listingId: string, @Param("mediaId") mediaId: string, @CurrentUser() user: RequestUser) {
    return this.listingMediaService.remove(listingId, mediaId, user.userId);
  }
}
