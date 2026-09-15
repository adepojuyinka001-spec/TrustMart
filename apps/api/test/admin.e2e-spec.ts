import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Admin analytics overview and audit-event browsing (CLAUDE.md SS25/SS35): read-only
// aggregate endpoints, RBAC-gated. No mutation, no financial figures (nothing here has
// completed/funded yet).
describe("TrustMart Admin analytics/audit (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let buyerToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const suffix = Date.now();
    const adminEmail = `admin+adminpanel+${suffix}@example.com`;
    const adminRes = await request(app.getHttpServer()).post("/auth/register").send({
      email: adminEmail,
      password: "correct-horse-battery-staple",
      firstName: "Test",
      lastName: "Admin",
    });
    adminToken = adminRes.body.accessToken;
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });

    const buyerRes = await request(app.getHttpServer()).post("/auth/register").send({
      email: `buyer+adminpanel+${suffix}@example.com`,
      password: "correct-horse-battery-staple",
      firstName: "Test",
      lastName: "Buyer",
    });
    buyerToken = buyerRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("blocks a non-admin from reading the analytics overview, and allows an admin (RBAC positive + negative)", async () => {
    const forbidden = await request(app.getHttpServer())
      .get("/admin/analytics/overview")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app.getHttpServer())
      .get("/admin/analytics/overview")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.users.total).toBeGreaterThanOrEqual(2);
    expect(allowed.body).toHaveProperty("listings");
    expect(allowed.body).toHaveProperty("buyerRequests");
    expect(allowed.body).toHaveProperty("matching");
    expect(allowed.body).toHaveProperty("leads");
    expect(allowed.body).toHaveProperty("escrows");
    expect(allowed.body).toHaveProperty("referrals");
  });

  it("blocks a non-admin from reading the funnel, and allows an admin with honest untracked stages", async () => {
    const forbidden = await request(app.getHttpServer())
      .get("/admin/analytics/funnel")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app.getHttpServer())
      .get("/admin/analytics/funnel")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    expect(Array.isArray(allowed.body.stages)).toBe(true);
    const stageKeys = allowed.body.stages.map((s: { key: string }) => s.key);
    expect(stageKeys).toEqual([
      "registered",
      "listing_or_request",
      "match",
      "interest",
      "contact",
      "transaction_started",
      "transaction_completed",
    ]);
    const registeredStage = allowed.body.stages.find((s: { key: string }) => s.key === "registered");
    expect(registeredStage.count).toBeGreaterThanOrEqual(2);
    expect(registeredStage.conversionFromPrevious).toBeNull();
    // Transaction Completed is never fabricated as 0 -- Escrow completion doesn't exist yet.
    const completedStage = allowed.body.stages.find((s: { key: string }) => s.key === "transaction_completed");
    expect(completedStage.count).toBeNull();
    expect(completedStage.note).toBeTruthy();
  });

  it("blocks a non-admin from reading liquidity, and allows an admin with a correct demand/supply classification", async () => {
    const forbiddenBase = await request(app.getHttpServer())
      .get("/admin/analytics/liquidity")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(forbiddenBase.status).toBe(403);

    const suffix = Date.now();
    const category = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `liquidity-cat-${suffix}`, label: "Liquidity Category" });
    const subcategory = await request(app.getHttpServer())
      .post(`/categories/${category.body.id}/subcategories`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `liquidity-sub-${suffix}`, label: "Liquidity Subcategory" });
    const subcategoryId = subcategory.body.id as string;

    const sellerRes = await request(app.getHttpServer()).post("/auth/register").send({
      email: `seller+liquidity+${suffix}@example.com`,
      password: "correct-horse-battery-staple",
      firstName: "Test",
      lastName: "Seller",
    });
    const sellerToken = sellerRes.body.accessToken as string;

    // One ACTIVE listing (supply) vs. three ACTIVE buyer requests (demand) in the same,
    // freshly-created subcategory -- an unambiguous 3:1 ratio, UNDERSUPPLIED.
    const listingRes = await request(app.getHttpServer())
      .post("/listings")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ subcategoryId, title: "Liquidity test listing", description: "For liquidity analytics.", askingPriceMinorUnits: 100_000, state: "Lagos" });
    await request(app.getHttpServer()).post(`/listings/${listingRes.body.id}/submit`).set("Authorization", `Bearer ${sellerToken}`);
    await request(app.getHttpServer()).post(`/listings/${listingRes.body.id}/approve`).set("Authorization", `Bearer ${adminToken}`);

    for (let i = 0; i < 3; i++) {
      const buyerRes = await request(app.getHttpServer()).post("/auth/register").send({
        email: `buyer+liquidity+${suffix}+${i}@example.com`,
        password: "correct-horse-battery-staple",
        firstName: "Test",
        lastName: "Buyer",
      });
      const buyerToken2 = buyerRes.body.accessToken as string;
      const brRes = await request(app.getHttpServer())
        .post("/buyer-requests")
        .set("Authorization", `Bearer ${buyerToken2}`)
        .send({ subcategoryId });
      await request(app.getHttpServer())
        .post(`/buyer-requests/${brRes.body.id}/activate`)
        .set("Authorization", `Bearer ${buyerToken2}`);
    }

    const allowed = await request(app.getHttpServer())
      .get("/admin/analytics/liquidity")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    const row = allowed.body.subcategories.find((s: { subcategoryId: string }) => s.subcategoryId === subcategoryId);
    expect(row).toBeDefined();
    expect(row.activeBuyerRequests).toBe(3);
    expect(row.activeListings).toBe(1);
    expect(row.demandToSupplyRatio).toBe(3);
    expect(row.classification).toBe("UNDERSUPPLIED");
    expect(row.topSupplyLocations).toEqual(expect.arrayContaining([expect.objectContaining({ location: "Lagos", listingCount: 1 })]));
  });

  it("rejects unauthenticated access to both admin endpoints", async () => {
    const overviewRes = await request(app.getHttpServer()).get("/admin/analytics/overview");
    expect(overviewRes.status).toBe(401);

    const auditRes = await request(app.getHttpServer()).get("/admin/audit-events");
    expect(auditRes.status).toBe(401);
  });

  it("blocks a non-admin from browsing audit events, and allows an admin with filtering and pagination", async () => {
    const forbidden = await request(app.getHttpServer())
      .get("/admin/audit-events")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app.getHttpServer())
      .get("/admin/audit-events")
      .query({ action: "auth.register", take: 2 })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.items.length).toBeLessThanOrEqual(2);
    expect(allowed.body.total).toBeGreaterThanOrEqual(2);
    expect(allowed.body.items.every((e: { action: string }) => e.action === "auth.register")).toBe(true);
  });

  // Regression: /users/me exposes effective RBAC permission keys so the web app can
  // decide whether to show the Admin nav section — a UX convenience only, never the
  // authorization decision itself (the 403s above are what actually enforce it).
  it("exposes effective permissions on /users/me, reflecting each account's actual RBAC grant", async () => {
    const adminMe = await request(app.getHttpServer()).get("/users/me").set("Authorization", `Bearer ${adminToken}`);
    expect(adminMe.status).toBe(200);
    expect(adminMe.body.permissions).toEqual(expect.arrayContaining(["analytics:read", "audit:read"]));

    const buyerMe = await request(app.getHttpServer()).get("/users/me").set("Authorization", `Bearer ${buyerToken}`);
    expect(buyerMe.status).toBe(200);
    expect(buyerMe.body.permissions).toEqual([]);
  });
});
