import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { ListingStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { WatermarkService } from "./watermark.service";
import type { MediaStorage } from "./media-storage.service";

const OPEN_FOR_EDIT: ListingStatus[] = [ListingStatus.DRAFT, ListingStatus.ACTIVE];
const MAX_PHOTOS_PER_LISTING = 8;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface UploadedPhoto {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

// Listing photo gallery (CLAUDE.md SS8: listings support "media"). Every stored photo is
// watermarked (WatermarkService) before it ever touches storage — the API never persists
// or serves a pre-watermark original. Storage itself is provider-agnostic
// (MediaStorage — see media-storage.service.ts for why).
@Injectable()
export class ListingMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly watermarkService: WatermarkService,
    @Inject("MediaStorage") private readonly storage: MediaStorage,
  ) {}

  private async assertOwnsOpenListing(listingId: string, userId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }
    if (listing.sellerUserId !== userId) {
      throw new ForbiddenException("You do not own this listing.");
    }
    if (!OPEN_FOR_EDIT.includes(listing.status)) {
      throw new ForbiddenException(`Photos cannot be changed while a listing is ${listing.status}.`);
    }
    return listing;
  }

  async upload(listingId: string, userId: string, files: UploadedPhoto[]) {
    await this.assertOwnsOpenListing(listingId, userId);

    if (files.length === 0) {
      throw new BadRequestException("No photos were provided.");
    }
    const existingCount = await this.prisma.listingMedia.count({ where: { listingId } });
    if (existingCount + files.length > MAX_PHOTOS_PER_LISTING) {
      throw new BadRequestException(
        `A listing can have at most ${MAX_PHOTOS_PER_LISTING} photos (${existingCount} already uploaded).`,
      );
    }
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException(`Unsupported file type: ${file.mimetype}. Use JPEG, PNG, or WebP.`);
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException("Each photo must be 8MB or smaller.");
      }
    }

    // Watermarking + storage for each file is independent, so run the batch concurrently
    // rather than one-by-one — meaningful latency difference at the 8-photo cap.
    const created = await Promise.all(
      files.map(async (file, index) => {
        const watermarked = await this.watermarkService.apply(file.buffer);
        const storageKey = `listings/${listingId}/${randomUUID()}.jpg`;
        await this.storage.save(storageKey, watermarked);
        return this.prisma.listingMedia.create({
          data: {
            listingId,
            storageKey,
            isPrimary: existingCount === 0 && index === 0,
            displayOrder: existingCount + index,
          },
        });
      }),
    );

    return created.map((m) => this.toDto(m));
  }

  async listForListing(listingId: string) {
    const media = await this.prisma.listingMedia.findMany({
      where: { listingId },
      orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
    });
    return media.map((m) => this.toDto(m));
  }

  async remove(listingId: string, mediaId: string, userId: string) {
    await this.assertOwnsOpenListing(listingId, userId);
    const media = await this.prisma.listingMedia.findUnique({ where: { id: mediaId } });
    if (!media || media.listingId !== listingId) {
      throw new NotFoundException("Photo not found.");
    }

    await this.prisma.listingMedia.delete({ where: { id: mediaId } });
    await this.storage.delete(media.storageKey);

    // Never leave a listing with remaining photos but no primary one.
    if (media.isPrimary) {
      const next = await this.prisma.listingMedia.findFirst({
        where: { listingId },
        orderBy: { displayOrder: "asc" },
      });
      if (next) {
        await this.prisma.listingMedia.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }
  }

  async setPrimary(listingId: string, mediaId: string, userId: string) {
    await this.assertOwnsOpenListing(listingId, userId);
    const media = await this.prisma.listingMedia.findUnique({ where: { id: mediaId } });
    if (!media || media.listingId !== listingId) {
      throw new NotFoundException("Photo not found.");
    }

    await this.prisma.$transaction([
      this.prisma.listingMedia.updateMany({ where: { listingId }, data: { isPrimary: false } }),
      this.prisma.listingMedia.update({ where: { id: mediaId }, data: { isPrimary: true } }),
    ]);
  }

  private toDto(media: { id: string; storageKey: string; isPrimary: boolean; displayOrder: number; createdAt: Date }) {
    return {
      id: media.id,
      url: this.storage.resolveUrl(media.storageKey),
      isPrimary: media.isPrimary,
      displayOrder: media.displayOrder,
      createdAt: media.createdAt,
    };
  }
}
