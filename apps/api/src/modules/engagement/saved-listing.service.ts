import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

// Buyer bookmarks (CLAUDE.md SS30/SS34: "Saved" is its own Marketplace dashboard area).
// Deliberately no audit trail or domain event — unlike Interest, saving a listing creates
// no Lead, no seller-visible signal, and no downstream business process; it's a personal
// bookmark, not an engagement milestone.
@Injectable()
export class SavedListingService {
  constructor(private readonly prisma: PrismaService) {}

  async save(buyerUserId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }
    // Idempotent by design — a save button toggles, it shouldn't error on a second click.
    return this.prisma.savedListing.upsert({
      where: { buyerUserId_listingId: { buyerUserId, listingId } },
      update: {},
      create: { buyerUserId, listingId },
    });
  }

  async unsave(buyerUserId: string, listingId: string) {
    await this.prisma.savedListing.deleteMany({ where: { buyerUserId, listingId } });
  }

  async listMine(buyerUserId: string) {
    return this.prisma.savedListing.findMany({
      where: { buyerUserId },
      orderBy: { createdAt: "desc" },
      include: { listing: { include: { subcategory: { include: { category: true } } } } },
    });
  }
}
