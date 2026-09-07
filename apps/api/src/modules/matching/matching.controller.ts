import { Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { PermissionGuard } from "../rbac/permission.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { MatchingProfileService } from "./matching-profile.service";
import { CreateMatchingProfileDto } from "./dto/create-matching-profile.dto";
import { classifyScore } from "./matching-engine.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class MatchingController {
  constructor(
    private readonly matchingProfileService: MatchingProfileService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("matching-profiles")
  @UseGuards(PermissionGuard)
  @RequirePermission("matching:manage")
  createProfile(
    @Body() dto: CreateMatchingProfileDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.matchingProfileService.create(dto, user.userId, req.ip);
  }

  // Buyer-facing: only the owning buyer sees their matches. Alternative (below-threshold)
  // matches are included but explicitly labelled, per CLAUDE.md SS9.
  @Get("buyer-requests/:id/matches")
  async listForBuyerRequest(@Param("id") buyerRequestId: string, @CurrentUser() user: RequestUser) {
    const buyerRequest = await this.prisma.buyerRequest.findUnique({ where: { id: buyerRequestId } });
    if (!buyerRequest || buyerRequest.buyerUserId !== user.userId) {
      throw new ForbiddenException("You do not own this buyer request.");
    }

    const matches = await this.prisma.match.findMany({
      where: { buyerRequestId },
      orderBy: { scorePercent: "desc" },
      include: { listing: true },
    });

    return matches.map((m) => ({ ...m, classification: classifyScore(m.scorePercent) }));
  }

  // Seller-facing: only the owning seller sees which buyer requests matched their listing.
  // Buyer budgets/requirements are not exposed here — only match metadata (CLAUDE.md SS13).
  @Get("listings/:id/matches")
  async listForListing(@Param("id") listingId: string, @CurrentUser() user: RequestUser) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.sellerUserId !== user.userId) {
      throw new ForbiddenException("You do not own this listing.");
    }

    const matches = await this.prisma.match.findMany({
      where: { listingId, qualified: true },
      orderBy: { scorePercent: "desc" },
    });

    return matches.map((m) => ({
      id: m.id,
      buyerRequestId: m.buyerRequestId,
      scorePercent: m.scorePercent,
      classification: classifyScore(m.scorePercent),
      createdAt: m.createdAt,
    }));
  }
}
