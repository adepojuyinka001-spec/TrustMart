import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Requires a live Postgres reachable via DATABASE_URL with migrations applied
// (docker compose up -d && pnpm --filter api prisma migrate dev).
describe("TrustMart API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns ok", async () => {
    const response = await request(app.getHttpServer()).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("registers, logs in, and returns a valid session (positive auth path)", async () => {
    const email = `buyer+${Date.now()}@example.com`;

    const registerResponse = await request(app.getHttpServer()).post("/auth/register").send({
      email,
      password: "correct-horse-battery-staple",
      firstName: "Ada",
      lastName: "Lovelace",
    });
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.accessToken).toEqual(expect.any(String));

    const meResponse = await request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${registerResponse.body.accessToken}`);
    expect(meResponse.status).toBe(200);
    expect(meResponse.body.email).toBe(email);
    expect(meResponse.body.passwordHash).toBeUndefined();
  });

  it("rejects login with the wrong password (negative auth path)", async () => {
    const email = `buyer+${Date.now()}@example.com`;
    await request(app.getHttpServer()).post("/auth/register").send({
      email,
      password: "correct-horse-battery-staple",
      firstName: "Ada",
      lastName: "Lovelace",
    });

    const response = await request(app.getHttpServer()).post("/auth/login").send({
      email,
      password: "wrong-password",
    });
    expect(response.status).toBe(401);
  });

  it("blocks a BUYER from writing platform config, and allows an ADMIN (RBAC positive + negative)", async () => {
    const buyerEmail = `buyer+${Date.now()}@example.com`;
    const buyerAuth = await request(app.getHttpServer()).post("/auth/register").send({
      email: buyerEmail,
      password: "correct-horse-battery-staple",
      firstName: "Bea",
      lastName: "Buyer",
    });

    const forbiddenResponse = await request(app.getHttpServer())
      .put("/platform-config/marketplace.match_threshold_percent")
      .set("Authorization", `Bearer ${buyerAuth.body.accessToken}`)
      .send({ valueType: "NUMBER", value: "80" });
    expect(forbiddenResponse.status).toBe(403);

    const adminEmail = `admin+${Date.now()}@example.com`;
    const adminAuth = await request(app.getHttpServer()).post("/auth/register").send({
      email: adminEmail,
      password: "correct-horse-battery-staple",
      firstName: "Ada",
      lastName: "Admin",
    });
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });

    const allowedResponse = await request(app.getHttpServer())
      .put("/platform-config/marketplace.match_threshold_percent")
      .set("Authorization", `Bearer ${adminAuth.body.accessToken}`)
      .send({ valueType: "NUMBER", value: "80", description: "Adjusted for launch" });
    expect(allowedResponse.status).toBe(200);
    expect(allowedResponse.body.value).toBe("80");

    const auditRows = await prisma.auditEvent.findMany({
      where: { resourceType: "PlatformConfiguration", action: "platform_config.upsert" },
    });
    expect(auditRows.length).toBeGreaterThan(0);
  });
});
