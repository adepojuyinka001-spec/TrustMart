import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ListingStatus } from "@prisma/client";

// Listing expiry/renewal (CLAUDE.md SS10): ACTIVE -> EXPIRING (warning window) ->
// EXPIRED, with an explicit seller decision (renew, or mark SOLD) rather than silent
// auto-renewal. The sweep is deterministic backend logic that n8n would call on a
// schedule in production; here we call it directly and manipulate expiresAt via Prisma
// to avoid a real-time wait in the test.
describe("TrustMart Listing lifecycle (e2e)", () => {
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

    const adminEmail = `admin+lifecycle+${Date.now()}@example.com`;
    adminToken = await register(adminEmail);
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });

    const suffix = Date.now();
    const category = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `lifecycle-cat-${suffix}`, label: "Lifecycle Category" });
    const subcategory = await request(app.getHttpServer())
      .post(`/categories/${category.body.id}/subcategories`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `lifecycle-sub-${suffix}`, label: "Lifecycle Subcategory" });
    subcategoryId = subcategory.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const createActiveListing = async (sellerToken: string) => {
    const listingRes = await request(app.getHttpServer())
      .post("/listings")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({
        subcategoryId,
        title: "Lifecycle test listing",
        description: "A listing to test expiry/renewal.",
        askingPriceMinorUnits: 1_000_000,
      });
    const listingId = listingRes.body.id as string;
    await request(app.getHttpServer()).post(`/listings/${listingId}/submit`).set("Authorization", `Bearer ${sellerToken}`);
    await request(app.getHttpServer()).post(`/listings/${listingId}/approve`).set("Authorization", `Bearer ${adminToken}`);
    return listingId;
  };

  it("blocks a non-admin from running the sweep, and allows an admin (RBAC positive + negative)", async () => {
    const sellerToken = await register(`seller+sweep-rbac+${Date.now()}@example.com`);
    const forbidden = await request(app.getHttpServer())
      .post("/listings/lifecycle/sweep")
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app.getHttpServer())
      .post("/listings/lifecycle/sweep")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(allowed.status).toBe(201);
    expect(allowed.body).toHaveProperty("warned");
    expect(allowed.body).toHaveProperty("expired");
  });

  it("moves an ACTIVE listing to EXPIRING within the warning window, then to EXPIRED past expiresAt, via the sweep", async () => {
    const httpServer = app.getHttpServer();
    const sellerToken = await register(`seller+sweep+${Date.now()}@example.com`);
    const listingId = await createActiveListing(sellerToken);

    // Simulate a listing 1 day from expiry (inside the default 2-day warning window).
    await prisma.listing.update({
      where: { id: listingId },
      data: { expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    const firstSweep = await request(httpServer).post("/listings/lifecycle/sweep").set("Authorization", `Bearer ${adminToken}`);
    expect(firstSweep.status).toBe(201);
    expect(firstSweep.body.warned).toBeGreaterThanOrEqual(1);

    const afterWarn = await prisma.listing.findUniqueOrThrow({ where: { id: listingId } });
    expect(afterWarn.status).toBe(ListingStatus.EXPIRING);

    // Now push it into the past, then sweep again.
    await prisma.listing.update({ where: { id: listingId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const secondSweep = await request(httpServer).post("/listings/lifecycle/sweep").set("Authorization", `Bearer ${adminToken}`);
    expect(secondSweep.body.expired).toBeGreaterThanOrEqual(1);

    const afterExpire = await prisma.listing.findUniqueOrThrow({ where: { id: listingId } });
    expect(afterExpire.status).toBe(ListingStatus.EXPIRED);

    // A stranger cannot renew someone else's listing.
    const stranger = await register(`stranger+sweep+${Date.now()}@example.com`);
    const strangerRenew = await request(httpServer)
      .post(`/listings/${listingId}/renew`)
      .set("Authorization", `Bearer ${stranger}`);
    expect(strangerRenew.status).toBe(403);

    // Seller renews ("STILL AVAILABLE") — back to ACTIVE with a fresh expiresAt.
    const renewRes = await request(httpServer)
      .post(`/listings/${listingId}/renew`)
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(renewRes.status).toBe(201);
    expect(renewRes.body.status).toBe(ListingStatus.ACTIVE);
    expect(new Date(renewRes.body.expiresAt).getTime()).toBeGreaterThan(Date.now());

    // Renewing an already-ACTIVE listing is rejected.
    const doubleRenew = await request(httpServer).post(`/listings/${listingId}/renew`).set("Authorization", `Bearer ${sellerToken}`);
    expect(doubleRenew.status).toBe(403);
  });

  it("allows marking SOLD from EXPIRING (the other branch of the SOLD-vs-STILL-AVAILABLE prompt)", async () => {
    const httpServer = app.getHttpServer();
    const sellerToken = await register(`seller+sold-expiring+${Date.now()}@example.com`);
    const listingId = await createActiveListing(sellerToken);

    await prisma.listing.update({ where: { id: listingId }, data: { status: ListingStatus.EXPIRING } });

    const markSoldRes = await request(httpServer).post(`/listings/${listingId}/mark-sold`).set("Authorization", `Bearer ${sellerToken}`);
    expect(markSoldRes.status).toBe(201);
    expect(markSoldRes.body.status).toBe(ListingStatus.SOLD);
  });
});
