import { Module } from "@nestjs/common";
import { ListingMediaController } from "./listing-media.controller";
import { ListingMediaService } from "./listing-media.service";
import { WatermarkService } from "./watermark.service";
import { LocalDiskMediaStorage } from "./media-storage.service";

@Module({
  controllers: [ListingMediaController],
  providers: [ListingMediaService, WatermarkService, { provide: "MediaStorage", useClass: LocalDiskMediaStorage }],
  exports: ["MediaStorage"],
})
export class MediaModule {}
