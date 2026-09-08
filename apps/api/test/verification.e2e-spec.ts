import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Verification foundation (CLAUDE.md SS23): a provider-agnostic shell — manual/admin
// status transitions only, no live KYC/KYB provider wired in yet (Open Decision). Had no
// e2e coverage at all before this. Also covers the same "reviewer can act but can't
// discover" gap found and fixed for Lead moderation the same day: PATCH :id/status was
// correctly reviewer-gated with no ownership check, but nothing let a reviewer who isn't
// the subject ever list or view a case — only GET /verification-cases/mine, scoped to
// the subject.
describe("TrustMart Verification (e2e)", () => {
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
    return res.body.accessToken as string;
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const adminEmail = `admin+verification+${Date.now()}@example.com`;
    adminToken = await register(adminEmail);
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });
  });

  afterAll(async () => {
    await app.close();
  });

  it("lets a user create and list their own verification case, scoped to them only", async () => {
    const httpServer = app.getHttpServer();
    const userToken = await register(`user+verification+${Date.now()}@example.com`);

    const createRes = await request(httpServer)
      .post("/verification-cases")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ subjectType: "USER" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe("PENDING");

    const mineRes = await request(httpServer).get("/verification-cases/mine").set("Authorization", `Bearer ${userToken}`);
    expect(mineRes.status).toBe(200);
    expect(mineRes.body.some((c: { id: string }) => c.id === createRes.body.id)).toBe(true);
  });

  it("blocks a non-reviewer from updating status, and allows a reviewer (RBAC positive + negative)", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();
    const userToken = await register(`user+reviewrbac+${suffix}@example.com`);

    const createRes = await request(httpServer)
      .post("/verification-cases")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ subjectType: "USER" });
    const caseId = createRes.body.id as string;

    const forbidden = await request(httpServer)
      .patch(`/verification-cases/${caseId}/status`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ status: "APPROVED" });
    expect(forbidden.status).toBe(403);

    const allowed = await request(httpServer)
      .patch(`/verification-cases/${caseId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "IN_REVIEW", notes: "Started review" });
    expect(allowed.status).toBe(200);
    expect(allowed.body.status).toBe("IN_REVIEW");
  });

  // The gap: the subject (not a reviewer) has no admin permission and correctly can't
  // browse the queue; a reviewer who isn't the subject needs to, and previously couldn't.
  it("lets a reviewer (not the subject) list and view cases for review, unlike the subject-scoped /mine endpoint", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();
    const userToken = await register(`user+adminverif+${suffix}@example.com`);

    const createRes = await request(httpServer)
      .post("/verification-cases")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ subjectType: "USER" });
    const caseId = createRes.body.id as string;

    const forbiddenList = await request(httpServer).get("/admin/verification-cases").set("Authorization", `Bearer ${userToken}`);
    expect(forbiddenList.status).toBe(403);
    const forbiddenGet = await request(httpServer)
      .get(`/admin/verification-cases/${caseId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(forbiddenGet.status).toBe(403);

    const list = await request(httpServer)
      .get("/admin/verification-cases")
      .query({ status: "PENDING", take: 100 })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.items.some((c: { id: string }) => c.id === caseId)).toBe(true);

    const detail = await request(httpServer)
      .get(`/admin/verification-cases/${caseId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(caseId);
    expect(detail.body.user.email).toContain("user+adminverif");
  });
});
