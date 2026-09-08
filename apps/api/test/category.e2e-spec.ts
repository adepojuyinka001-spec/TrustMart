import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Category Engine admin management (CLAUDE.md SS6/SS25): category:manage-gated writes,
// public reads. Covers the new GET /attribute-definitions admin browse endpoint added
// to support an admin UI that lets an operator reuse an existing attribute (e.g.
// "bedrooms") across categories instead of only ever creating a new one per link.
describe("TrustMart Category admin management (e2e)", () => {
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
    const adminEmail = `admin+category+${suffix}@example.com`;
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
      email: `buyer+category+${suffix}@example.com`,
      password: "correct-horse-battery-staple",
      firstName: "Test",
      lastName: "Buyer",
    });
    buyerToken = buyerRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a category, subcategory, attribute definition, and links them end to end (admin only)", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();

    const forbiddenCreate = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ key: `test-cat-${suffix}`, label: "Test Category" });
    expect(forbiddenCreate.status).toBe(403);

    const categoryRes = await request(httpServer)
      .post("/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `test-cat-${suffix}`, label: "Test Category" });
    expect(categoryRes.status).toBe(201);
    const categoryId = categoryRes.body.id as string;

    const subcategoryRes = await request(httpServer)
      .post(`/categories/${categoryId}/subcategories`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `test-sub-${suffix}`, label: "Test Subcategory" });
    expect(subcategoryRes.status).toBe(201);
    const subcategoryId = subcategoryRes.body.id as string;

    const attributeRes = await request(httpServer)
      .post("/attribute-definitions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `test-attr-${suffix}`, label: "Test Attribute", dataType: "STRING" });
    expect(attributeRes.status).toBe(201);
    const attributeId = attributeRes.body.id as string;

    const linkRes = await request(httpServer)
      .post(`/subcategories/${subcategoryId}/attributes`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ attributeId, required: true });
    expect(linkRes.status).toBe(201);
    expect(linkRes.body.required).toBe(true);
    expect(linkRes.body.attribute.key).toBe(`test-attr-${suffix}`);

    const publicSubRead = await request(httpServer).get(`/subcategories/${subcategoryId}/attributes`);
    expect(publicSubRead.status).toBe(200);
    expect(publicSubRead.body.attributes[0].attribute.key).toBe(`test-attr-${suffix}`);
  });

  it("blocks a non-admin from browsing attribute definitions, and allows an admin to see the newly created one", async () => {
    const httpServer = app.getHttpServer();

    const forbidden = await request(httpServer)
      .get("/attribute-definitions")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(forbidden.status).toBe(403);

    const unauthenticated = await request(httpServer).get("/attribute-definitions");
    expect(unauthenticated.status).toBe(401);

    const suffix = Date.now();
    const created = await request(httpServer)
      .post("/attribute-definitions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `browse-attr-${suffix}`, label: "Browse Attribute", dataType: "NUMBER" });
    expect(created.status).toBe(201);

    const allowed = await request(httpServer).get("/attribute-definitions").set("Authorization", `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.some((a: { key: string }) => a.key === `browse-attr-${suffix}`)).toBe(true);
  });
});
