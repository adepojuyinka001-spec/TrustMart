import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Exercises the full Marketplace Foundation + Matching wiring end-to-end: category ->
// subcategory -> attribute -> listing -> buyer request -> deterministic match, including
// the hard-requirement disqualification path and RBAC-gated matching-profile management.
describe("TrustMart Marketplace matching (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  const register = async (email: string) => {
    const res = await request(app.getHttpServer()).post("/auth/register").send({
      email,
      password: "correct-horse-battery-staple",
      firstName: "Test",
      lastName: "User",
    });
    return { token: res.body.accessToken as string, userId: res.body.user?.id as string | undefined };
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const adminEmail = `admin+matching+${Date.now()}@example.com`;
    const admin = await register(adminEmail);
    adminToken = admin.token;
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });
  });

  afterAll(async () => {
    await app.close();
  });

  it("blocks a non-admin from managing categories, and allows an admin (RBAC positive + negative)", async () => {
    const buyer = await register(`buyer+cat+${Date.now()}@example.com`);

    const forbidden = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ key: `real-estate-${Date.now()}`, label: "Real Estate" });
    expect(forbidden.status).toBe(403);

    const allowed = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `real-estate-${Date.now()}`, label: "Real Estate" });
    expect(allowed.status).toBe(201);
  });

  it("runs a full listing<->buyer-request match and respects the configured threshold and hard requirements", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();

    const category = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `re-${suffix}`, label: "Real Estate" });
    expect(category.status).toBe(201);

    const subcategory = await request(httpServer)
      .post(`/categories/${category.body.id}/subcategories`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `duplex-${suffix}`, label: "Duplex" });
    expect(subcategory.status).toBe(201);

    const bedroomsAttr = await request(httpServer)
      .post("/attribute-definitions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `bedrooms-${suffix}`, label: "Bedrooms", dataType: "NUMBER" });
    expect(bedroomsAttr.status).toBe(201);

    const linkAttr = await request(httpServer)
      .post(`/subcategories/${subcategory.body.id}/attributes`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ attributeId: bedroomsAttr.body.id, required: true, matchable: true });
    expect(linkAttr.status).toBe(201);

    const seller = await register(`seller+${suffix}@example.com`);
    const buyer = await register(`buyer+${suffix}@example.com`);

    const createListing = async (bedrooms: string, price: number) => {
      const res = await request(httpServer)
        .post("/listings")
        .set("Authorization", `Bearer ${seller.token}`)
        .send({
          subcategoryId: subcategory.body.id,
          title: `Duplex ${bedrooms}br`,
          description: "A nice duplex.",
          askingPriceMinorUnits: price,
          country: "Nigeria",
          state: "Lagos",
          city: "Lekki",
          attributeValues: [{ attributeId: bedroomsAttr.body.id, value: bedrooms }],
        });
      expect(res.status).toBe(201);
      const submitRes = await request(httpServer)
        .post(`/listings/${res.body.id}/submit`)
        .set("Authorization", `Bearer ${seller.token}`);
      expect(submitRes.status).toBe(201);
      const approveRes = await request(httpServer)
        .post(`/listings/${res.body.id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(approveRes.status).toBe(201);
      return res.body.id as string;
    };

    // A 4-bedroom listing that should satisfy the buyer's hard requirement, and a
    // 2-bedroom listing (same subcategory) that must be hard-disqualified.
    const matchingListingId = await createListing("4", 100_000_000);
    const nonMatchingListingId = await createListing("2", 100_000_000);

    const buyerRequestRes = await request(httpServer)
      .post("/buyer-requests")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        subcategoryId: subcategory.body.id,
        minBudgetMinorUnits: 50_000_000,
        maxBudgetMinorUnits: 150_000_000,
        preferredLocations: ["Lekki"],
        requirements: [
          {
            attributeId: bedroomsAttr.body.id,
            operator: "EQUALS",
            value: "4",
            requirementType: "HARD",
          },
        ],
      });
    expect(buyerRequestRes.status).toBe(201);
    const buyerRequestId = buyerRequestRes.body.id as string;

    const activateRes = await request(httpServer)
      .post(`/buyer-requests/${buyerRequestId}/activate`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(activateRes.status).toBe(201);

    const matchesRes = await request(httpServer)
      .get(`/buyer-requests/${buyerRequestId}/matches`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(matchesRes.status).toBe(200);

    const matchForMatchingListing = matchesRes.body.find((m: { listingId: string }) => m.listingId === matchingListingId);
    const matchForNonMatchingListing = matchesRes.body.find(
      (m: { listingId: string }) => m.listingId === nonMatchingListingId,
    );

    expect(matchForMatchingListing).toBeDefined();
    expect(matchForMatchingListing.qualified).toBe(true);
    expect(matchForMatchingListing.hardFailed).toBe(false);
    expect(matchForMatchingListing.scorePercent).toBeGreaterThanOrEqual(70);

    expect(matchForNonMatchingListing).toBeDefined();
    expect(matchForNonMatchingListing.qualified).toBe(false);
    expect(matchForNonMatchingListing.hardFailed).toBe(true);
    expect(matchForNonMatchingListing.hardFailureReason).toContain("hard_requirement_failed");

    // Seller-facing view exposes only the qualifying match, with no buyer budget/requirement data.
    const sellerMatchesRes = await request(httpServer)
      .get(`/listings/${matchingListingId}/matches`)
      .set("Authorization", `Bearer ${seller.token}`);
    expect(sellerMatchesRes.status).toBe(200);
    expect(sellerMatchesRes.body).toHaveLength(1);
    expect(sellerMatchesRes.body[0].buyerRequestId).toBe(buyerRequestId);
    expect(sellerMatchesRes.body[0]).not.toHaveProperty("minBudgetMinorUnits");
  });

  it("blocks a non-admin from creating a matching profile, and allows an admin", async () => {
    const buyer = await register(`buyer+profile+${Date.now()}@example.com`);
    const category = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `cat-${Date.now()}`, label: "Category" });
    const subcategory = await request(app.getHttpServer())
      .post(`/categories/${category.body.id}/subcategories`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `sub-${Date.now()}`, label: "Sub" });

    const forbidden = await request(app.getHttpServer())
      .post("/matching-profiles")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ subcategoryId: subcategory.body.id, criteria: [] });
    expect(forbidden.status).toBe(403);

    const allowed = await request(app.getHttpServer())
      .post("/matching-profiles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ subcategoryId: subcategory.body.id, criteria: [] });
    expect(allowed.status).toBe(201);
    expect(allowed.body.version).toBe(1);
  });

  // Regression: creating a profile worked, but nothing let an admin see which
  // subcategories already had one before this — the same "write with no matching read"
  // gap shape found in Lead/Verification moderation the same week.
  it("blocks a non-admin from listing active matching profiles, and lets an admin see one just created", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();
    const buyer = await register(`buyer+listprofiles+${suffix}@example.com`);
    const category = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `listprofiles-cat-${suffix}`, label: "List Profiles Category" });
    const subcategory = await request(httpServer)
      .post(`/categories/${category.body.id}/subcategories`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `listprofiles-sub-${suffix}`, label: "List Profiles Sub" });

    const forbidden = await request(httpServer).get("/matching-profiles").set("Authorization", `Bearer ${buyer.token}`);
    expect(forbidden.status).toBe(403);

    await request(httpServer)
      .post("/matching-profiles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ subcategoryId: subcategory.body.id, thresholdOverridePercent: 60, criteria: [] });

    const allowed = await request(httpServer).get("/matching-profiles").set("Authorization", `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    const created = allowed.body.find((p: { subcategoryId: string }) => p.subcategoryId === subcategory.body.id);
    expect(created).toBeDefined();
    expect(created.thresholdOverridePercent).toBe(60);
    expect(created.subcategory.label).toBe("List Profiles Sub");
  });
});
