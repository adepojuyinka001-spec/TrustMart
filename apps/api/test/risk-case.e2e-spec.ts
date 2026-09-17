import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// TrustGuard risk-signal detection (CLAUDE.md SS23): deterministic backend scans, never
// AI-decided, never auto-acting. Both scans only ever flag a RiskCase for manual review.
describe("TrustMart Risk Cases / TrustGuard (e2e)", () => {
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
    const adminEmail = `admin+risk+${suffix}@example.com`;
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
      email: `buyer+risk+${suffix}@example.com`,
      password: "correct-horse-battery-staple",
      firstName: "Test",
      lastName: "Buyer",
    });
    buyerToken = buyerRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("blocks a non-admin from scanning/listing/reviewing, and allows an admin (RBAC positive + negative)", async () => {
    const forbiddenScan = await request(app.getHttpServer())
      .post("/admin/risk-cases/scan")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(forbiddenScan.status).toBe(403);

    const forbiddenList = await request(app.getHttpServer())
      .get("/admin/risk-cases")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(forbiddenList.status).toBe(403);

    const allowedScan = await request(app.getHttpServer())
      .post("/admin/risk-cases/scan")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(allowedScan.status).toBe(201);
    expect(allowedScan.body).toHaveProperty("duplicateAccounts");
    expect(allowedScan.body).toHaveProperty("suspiciousPricing");
  });

  it("flags multiple accounts registered from the same IP, and is idempotent (no duplicate OPEN case on rescan)", async () => {
    const suffix = Date.now();
    const sharedIp = `10.0.${suffix % 255}.${(suffix + 1) % 255}`;

    await request(app.getHttpServer())
      .post("/auth/register")
      .set("X-Forwarded-For", sharedIp)
      .send({ email: `dup1+risk+${suffix}@example.com`, password: "correct-horse-battery-staple", firstName: "A", lastName: "One" });
    await request(app.getHttpServer())
      .post("/auth/register")
      .set("X-Forwarded-For", sharedIp)
      .send({ email: `dup2+risk+${suffix}@example.com`, password: "correct-horse-battery-staple", firstName: "B", lastName: "Two" });

    const registrations = await prisma.auditEvent.findMany({ where: { action: "auth.register" }, orderBy: { createdAt: "desc" }, take: 5 });
    const actualIp = registrations.find((r) => r.ipAddress)?.ipAddress as string;
    expect(actualIp).toBeTruthy();

    // Not asserting scan1.body.duplicateAccounts >= 1 here: the very first test in this
    // file already registered an admin + a buyer from this same test-runner IP and ran a
    // scan, so that case may already be OPEN by the time this test's scan runs -- creating
    // zero *new* cases is the correct, idempotent behavior in that case. What actually
    // matters is that an OPEN case for this IP exists afterward, checked below.
    const scan1 = await request(app.getHttpServer()).post("/admin/risk-cases/scan").set("Authorization", `Bearer ${adminToken}`);
    expect(scan1.status).toBe(201);

    const listRes = await request(app.getHttpServer())
      .get("/admin/risk-cases")
      .query({ status: "OPEN" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    const caseForIp = listRes.body.items.find(
      (c: { category: string; subjectId: string }) => c.category === "DUPLICATE_ACCOUNTS" && c.subjectId === actualIp,
    );
    expect(caseForIp).toBeDefined();

    // Re-running the scan must not create a second OPEN case for the same IP.
    const scan2 = await request(app.getHttpServer()).post("/admin/risk-cases/scan").set("Authorization", `Bearer ${adminToken}`);
    const countForIp = await prisma.riskCase.count({
      where: { category: "DUPLICATE_ACCOUNTS", subjectId: actualIp, status: "OPEN" },
    });
    expect(countForIp).toBe(1);
    expect(scan2.status).toBe(201);
  });

  it("reviews a case (dismiss), and rejects reviewing an already-reviewed case again", async () => {
    const suffix = Date.now();
    const sharedIp = `10.1.${suffix % 255}.${(suffix + 2) % 255}`;
    await request(app.getHttpServer())
      .post("/auth/register")
      .set("X-Forwarded-For", sharedIp)
      .send({ email: `dupA+risk+${suffix}@example.com`, password: "correct-horse-battery-staple", firstName: "A", lastName: "One" });
    await request(app.getHttpServer())
      .post("/auth/register")
      .set("X-Forwarded-For", sharedIp)
      .send({ email: `dupB+risk+${suffix}@example.com`, password: "correct-horse-battery-staple", firstName: "B", lastName: "Two" });

    await request(app.getHttpServer()).post("/admin/risk-cases/scan").set("Authorization", `Bearer ${adminToken}`);

    const registrations = await prisma.auditEvent.findMany({ where: { action: "auth.register" }, orderBy: { createdAt: "desc" }, take: 5 });
    const actualIp = registrations.find((r) => r.ipAddress)?.ipAddress as string;
    const caseRow = await prisma.riskCase.findFirst({
      where: { category: "DUPLICATE_ACCOUNTS", subjectId: actualIp, status: "OPEN" },
    });
    expect(caseRow).toBeTruthy();

    const forbidden = await request(app.getHttpServer())
      .patch(`/admin/risk-cases/${caseRow!.id}/review`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ status: "DISMISSED" });
    expect(forbidden.status).toBe(403);

    const reviewRes = await request(app.getHttpServer())
      .patch(`/admin/risk-cases/${caseRow!.id}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "DISMISSED", notes: "Shared office network, not abuse." });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.status).toBe("DISMISSED");
    expect(reviewRes.body.reviewNotes).toBe("Shared office network, not abuse.");

    const reReviewRes = await request(app.getHttpServer())
      .patch(`/admin/risk-cases/${caseRow!.id}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ACTIONED" });
    expect(reReviewRes.status).toBe(400);
  });
});
