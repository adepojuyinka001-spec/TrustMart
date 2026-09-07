import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Marketplace -> Optional Escrow handoff ("Secure This Deal With TrustMart Escrow",
// CLAUDE.md SS4/SS9). Prefills origin/counterparty/amount from a Lead, but only ever
// creates a DRAFT-equivalent proposal that the counterparty must still explicitly
// accept — never a silently binding conversion of Marketplace data.
describe("TrustMart Marketplace-to-Escrow handoff (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let subcategoryId: string;

  const register = async (email: string) => {
    const res = await request(app.getHttpServer()).post("/auth/register").send({
      email,
      password: "correct-horse-battery-staple",
      firstName: "Test",
      lastName: "User",
    });
    return res.body.accessToken as string;
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const adminEmail = `admin+handoff+${Date.now()}@example.com`;
    adminToken = await register(adminEmail);
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });

    const suffix = Date.now();
    const category = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `handoff-cat-${suffix}`, label: "Handoff Category" });
    const subcategory = await request(app.getHttpServer())
      .post(`/categories/${category.body.id}/subcategories`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `handoff-sub-${suffix}`, label: "Handoff Subcategory" });
    subcategoryId = subcategory.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a prefilled Escrow proposal from a Lead, requiring the counterparty's explicit acceptance", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();
    const sellerToken = await register(`seller+handoff+${suffix}@example.com`);
    const buyerToken = await register(`buyer+handoff+${suffix}@example.com`);

    const listingRes = await request(httpServer).post("/listings").set("Authorization", `Bearer ${sellerToken}`).send({
      subcategoryId,
      title: "Handoff test listing",
      description: "A listing to test the Marketplace-to-Escrow handoff.",
      askingPriceMinorUnits: 750_000,
    });
    const listingId = listingRes.body.id as string;
    await request(httpServer).post(`/listings/${listingId}/submit`).set("Authorization", `Bearer ${sellerToken}`);
    await request(httpServer).post(`/listings/${listingId}/approve`).set("Authorization", `Bearer ${adminToken}`);

    await request(httpServer).post("/interests").set("Authorization", `Bearer ${buyerToken}`).send({ listingId });
    const interests = await request(httpServer)
      .get(`/listings/${listingId}/interests`)
      .set("Authorization", `Bearer ${sellerToken}`);
    const leadId = interests.body[0].lead.id as string;

    // A stranger cannot create an escrow off a lead they aren't a party to.
    const stranger = await register(`stranger+handoff+${suffix}@example.com`);
    const strangerAttempt = await request(httpServer)
      .post(`/escrows/from-lead/${leadId}`)
      .set("Authorization", `Bearer ${stranger}`)
      .send({ feeAllocation: "BUYER_PAYS" });
    expect(strangerAttempt.status).toBe(403);

    // Buyer initiates the handoff without specifying an amount — it should default to
    // the listing's current asking price.
    const handoffRes = await request(httpServer)
      .post(`/escrows/from-lead/${leadId}`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ feeAllocation: "BUYER_PAYS" });
    expect(handoffRes.status).toBe(201);
    expect(handoffRes.body.originType).toBe("MARKETPLACE");
    expect(handoffRes.body.originListingId).toBe(listingId);
    expect(handoffRes.body.status).toBe("TERMS_PROPOSED");
    expect(handoffRes.body.termVersions[0].transactionAmountMinorUnits).toBe("750000");
    // Only the buyer (initiator) has accepted so far — it is not yet binding.
    expect(handoffRes.body.termVersions[0].acceptances).toHaveLength(1);
    const escrowId = handoffRes.body.id as string;

    // The seller must still explicitly accept for it to become ACCEPTED.
    const beforeAccept = await request(httpServer).get(`/escrows/${escrowId}`).set("Authorization", `Bearer ${sellerToken}`);
    expect(beforeAccept.body.status).toBe("TERMS_PROPOSED");

    const sellerAccepts = await request(httpServer).post(`/escrows/${escrowId}/accept`).set("Authorization", `Bearer ${sellerToken}`);
    expect(sellerAccepts.status).toBe(201);
    expect(sellerAccepts.body.status).toBe("ACCEPTED");
  });

  it("respects an explicit transactionAmountMinorUnits override instead of the listing's asking price", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();
    const sellerToken = await register(`seller+handoff-override+${suffix}@example.com`);
    const buyerToken = await register(`buyer+handoff-override+${suffix}@example.com`);

    const listingRes = await request(httpServer).post("/listings").set("Authorization", `Bearer ${sellerToken}`).send({
      subcategoryId,
      title: "Negotiated price listing",
      description: "Buyer and seller agreed on a different price than listed.",
      askingPriceMinorUnits: 1_000_000,
    });
    const listingId = listingRes.body.id as string;
    await request(httpServer).post(`/listings/${listingId}/submit`).set("Authorization", `Bearer ${sellerToken}`);
    await request(httpServer).post(`/listings/${listingId}/approve`).set("Authorization", `Bearer ${adminToken}`);
    await request(httpServer).post("/interests").set("Authorization", `Bearer ${buyerToken}`).send({ listingId });
    const interests = await request(httpServer)
      .get(`/listings/${listingId}/interests`)
      .set("Authorization", `Bearer ${sellerToken}`);
    const leadId = interests.body[0].lead.id as string;

    const handoffRes = await request(httpServer)
      .post(`/escrows/from-lead/${leadId}`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ feeAllocation: "SHARED", buyerFeeSharePercent: 50, transactionAmountMinorUnits: 900_000 });
    expect(handoffRes.status).toBe(201);
    expect(handoffRes.body.termVersions[0].transactionAmountMinorUnits).toBe("900000");
    expect(handoffRes.body.termVersions[0].feeAllocation).toBe("SHARED");
  });
});
