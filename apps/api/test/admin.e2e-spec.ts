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
