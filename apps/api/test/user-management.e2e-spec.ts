import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Admin User Management (CLAUDE.md SS25/SS30): before this, "users" — the first area
// listed under the Admin Control Centre — had no admin read/manage surface at all. The
// only way to promote an account to ADMIN was a direct database edit.
describe("TrustMart Admin User Management (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let adminUserId: string;
  let buyerToken: string;
  let buyerUserId: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const suffix = Date.now();
    const adminEmail = `admin+usermgmt+${suffix}@example.com`;
    const adminRes = await request(app.getHttpServer()).post("/auth/register").send({
      email: adminEmail,
      password: "correct-horse-battery-staple",
      firstName: "Test",
      lastName: "Admin",
    });
    adminToken = adminRes.body.accessToken;
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    adminUserId = adminUser.id;
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });

    const buyerEmail = `buyer+usermgmt+${suffix}@example.com`;
    const buyerRes = await request(app.getHttpServer()).post("/auth/register").send({
      email: buyerEmail,
      password: "correct-horse-battery-staple",
      firstName: "Test",
      lastName: "Buyer",
    });
    buyerToken = buyerRes.body.accessToken;
    const buyerUser = await prisma.user.findUniqueOrThrow({ where: { email: buyerEmail } });
    buyerUserId = buyerUser.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("blocks a non-admin from listing users, and allows an admin (RBAC positive + negative)", async () => {
    const forbidden = await request(app.getHttpServer())
      .get("/admin/users")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app.getHttpServer())
      .get("/admin/users")
      .query({ search: "usermgmt" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.total).toBeGreaterThanOrEqual(2);
    expect(allowed.body.items.every((u: { passwordHash?: string }) => u.passwordHash === undefined)).toBe(true);
  });

  it("lists assignable roles, admin-only", async () => {
    const forbidden = await request(app.getHttpServer())
      .get("/admin/roles")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app.getHttpServer())
      .get("/admin/roles")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.some((r: { key: string }) => r.key === "SUPPORT")).toBe(true);
  });

  it("assigns and revokes a role on another user, and suspends/reactivates their account", async () => {
    const assignRes = await request(app.getHttpServer())
      .post(`/admin/users/${buyerUserId}/roles`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ roleKey: "SUPPORT" });
    expect(assignRes.status).toBe(201);
    expect(assignRes.body.some((r: { key: string }) => r.key === "SUPPORT")).toBe(true);

    const buyerMeAfterAssign = await request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(buyerMeAfterAssign.body.permissions).toContain("audit:read");

    const suspendRes = await request(app.getHttpServer())
      .patch(`/admin/users/${buyerUserId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "SUSPENDED" });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.status).toBe("SUSPENDED");

    const revokeRes = await request(app.getHttpServer())
      .delete(`/admin/users/${buyerUserId}/roles/SUPPORT`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.some((r: { key: string }) => r.key === "SUPPORT")).toBe(false);

    const reactivateRes = await request(app.getHttpServer())
      .patch(`/admin/users/${buyerUserId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ACTIVE" });
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.status).toBe("ACTIVE");
  });

  it("blocks an admin from changing their own status or roles, to prevent self-lockout", async () => {
    const selfStatusRes = await request(app.getHttpServer())
      .patch(`/admin/users/${adminUserId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "SUSPENDED" });
    expect(selfStatusRes.status).toBe(403);

    const selfRoleRes = await request(app.getHttpServer())
      .post(`/admin/users/${adminUserId}/roles`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ roleKey: "SUPPORT" });
    expect(selfRoleRes.status).toBe(403);
  });
});
