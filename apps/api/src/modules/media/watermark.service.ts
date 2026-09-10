import { BadRequestException, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { Jimp, JimpMime } from "jimp";
import { join } from "path";

// Every photo posted to the platform is watermarked with the TrustMart identity before
// storage — the pre-watermark original is never kept (CLAUDE.md SS5: brand identity is
// locked/consistent everywhere the platform shows a photo). Uses the same app icon asset
// the web app uses for its favicon/logo, so the mark always matches the current brand.
const LOGO_PATH = join(process.cwd(), "..", "web", "public", "tm-icon.png");
const MAX_DIMENSION = 1600;
const WATERMARK_WIDTH_RATIO = 0.16;
const WATERMARK_MARGIN_RATIO = 0.03;
const WATERMARK_OPACITY = 0.78;

@Injectable()
export class WatermarkService {
  private readonly logger = new Logger(WatermarkService.name);

  async apply(buffer: Buffer): Promise<Buffer> {
    let image;
    try {
      image = await Jimp.read(buffer);
    } catch {
      throw new BadRequestException("Uploaded file is not a readable image.");
    }

    if (image.width > MAX_DIMENSION || image.height > MAX_DIMENSION) {
      image.scaleToFit({ w: MAX_DIMENSION, h: MAX_DIMENSION });
    }

    try {
      const logo = await Jimp.read(LOGO_PATH);
      const targetWidth = Math.round(image.width * WATERMARK_WIDTH_RATIO);
      logo.resize({ w: targetWidth });
      logo.opacity(WATERMARK_OPACITY);
      const margin = Math.round(image.width * WATERMARK_MARGIN_RATIO);
      const x = image.width - logo.width - margin;
      const y = image.height - logo.height - margin;
      image.composite(logo, x, y);
    } catch (err) {
      // Every photo posted to the platform must be watermarked — no exceptions. This
      // should never fail with the bundled logo asset, so treat it as a real server error
      // (not a silent unwatermarked fallback) rather than ever storing an unbranded photo.
      this.logger.error("Failed to apply watermark to uploaded photo.", err as Error);
      throw new InternalServerErrorException("Could not process the uploaded photo. Please try again.");
    }

    return image.getBuffer(JimpMime.jpeg, { quality: 88 });
  }
}
