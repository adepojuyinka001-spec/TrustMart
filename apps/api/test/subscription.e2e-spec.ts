import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Subscription CATALOG only — plans and entitlements. No activation/payment path exists
// yet (founder decision, 2026-09-07): building one would mean inventing money-handling
// behavior ahead of the payment-provider decision (Open Decision #1). This spec verifies
// the catalog is publicly readable, admin-manageable, and RBAC-gated — not that anyone
// can actually subscribe.
describe("TrustMart Subscription catalog (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const adminEmail = `admin+subscription+${Date.now()}@example.com`;
    const res = await request(app.getHttpServer()).post("/auth/register").send({
      email: adminEmail,
      password: "correct-horse-battery-staple",
      firstName: "Test",
      lastName: "Admin",
    });
    adminToken = res.body.accessToken;
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });
  });

  afterAll(async () => {
    await app.close();
  });

  it("exposes the seeded default plans publicly, with money fields as strings", async () => {
    const res = await request(app.getHttpServer()).get("/subscription-plans");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3);

    const weekly = res.body.find((p: { key: string }) => p.key === "WEEKLY_SELLER");
    expect(weekly).toBeDefined();
    expect(weekly.priceMinorUnits).toBe("500000"); // BigInt serialized as string, not a lossy number
    expect(weekly.billingPeriod).toBe("WEEKLY");
    expect(weekly.entitlements.some((e: { key: string }) => e.key === "lead_contact_access")).toBe(true);
  });

  it("blocks a non-admin from creating a plan or an entitlement, and allows an admin (RBAC positive + negative)", async () => {
    const buyerRes = await request(app.getHttpServer()).post("/auth/register").send({
      email: `buyer+subplan+${Date.now()}@example.com`,
      password: "correct-horse-battery-staple",
      firstName: "Buyer",
      lastName: "NoAccess",
    });
    const buyerToken = buyerRes.body.accessToken;

    const forbiddenCreate = await request(app.getHttpServer())
      .post("/subscription-plans")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ key: `sneaky-${Date.now()}`, label: "Sneaky Plan" });
    expect(forbiddenCreate.status).toBe(403);

    const suffix = Date.now();
    const allowedCreate = await request(app.getHttpServer())
      .post("/subscription-plans")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        key: `professional-${suffix}`,
        label: "Professional",
        priceMinorUnits: 3_000_000,
        billingPeriod: "MONTHLY",
        entitlements: [{ key: "listing_limit", valueType: "NUMBER", value: "200" }],
      });
    expect(allowedCreate.status).toBe(201);
    expect(allowedCreate.body.entitlements).toHaveLength(1);
    const planId = allowedCreate.body.id as string;

    const forbiddenEntitlement = await request(app.getHttpServer())
      .post(`/subscription-plans/${planId}/entitlements`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ key: "analytics", valueType: "BOOLEAN", value: "true" });
    expect(forbiddenEntitlement.status).toBe(403);

    const allowedEntitlement = await request(app.getHttpServer())
      .post(`/subscription-plans/${planId}/entitlements`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: "analytics", valueType: "BOOLEAN", value: "true" });
    expect(allowedEntitlement.status).toBe(201);

    // Creating a plan with a duplicate key is rejected.
    const duplicateKey = await request(app.getHttpServer())
      .post("/subscription-plans")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `professional-${suffix}`, label: "Duplicate" });
    expect(duplicateKey.status).toBe(409);

    // Deactivating a plan removes it from the public listing but not from admin's "all" view.
    const deactivate = await request(app.getHttpServer())
      .patch(`/subscription-plans/${planId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(deactivate.status).toBe(200);

    const publicList = await request(app.getHttpServer()).get("/subscription-plans");
    expect(publicList.body.find((p: { id: string }) => p.id === planId)).toBeUndefined();

    const forbiddenAllList = await request(app.getHttpServer())
      .get("/subscription-plans/all")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(forbiddenAllList.status).toBe(403);

    const adminAllList = await request(app.getHttpServer())
      .get("/subscription-plans/all")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminAllList.status).toBe(200);
    expect(adminAllList.body.find((p: { id: string }) => p.id === planId)).toBeDefined();
  });
});
