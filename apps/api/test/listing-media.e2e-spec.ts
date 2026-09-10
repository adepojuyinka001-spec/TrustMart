import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// A minimal, well-known valid 1x1 red-pixel PNG (standard test fixture) — small enough to
// process quickly through the real Jimp watermarking pipeline, not mocked.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

// Listing photos (CLAUDE.md SS8). Every uploaded photo is watermarked server-side before
// storage (WatermarkService, real Jimp compositing — not mocked, to actually exercise the
// pipeline against the bundled logo asset). Storage is the local-disk MediaStorage
// implementation (object storage provider is an unresolved Open Decision, SS39).
describe("TrustMart Listing photos (e2e)", () => {
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

    const adminEmail = `admin+media+${Date.now()}@example.com`;
    adminToken = await register(adminEmail);
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });

    const suffix = Date.now();
    const category = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `media-cat-${suffix}`, label: "Media Category" });
    const subcategory = await request(app.getHttpServer())
      .post(`/categories/${category.body.id}/subcategories`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `media-sub-${suffix}`, label: "Media Subcategory" });
    subcategoryId = subcategory.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const createListing = async (sellerToken: string, title: string) => {
    const res = await request(app.getHttpServer()).post("/listings").set("Authorization", `Bearer ${sellerToken}`).send({
      subcategoryId,
      title,
      description: "A listing to test photo uploads.",
      askingPriceMinorUnits: 1_000_000,
    });
    return res.body.id as string;
  };

  it("uploads photos, watermarks them, sets the first as primary, and serves resolved URLs on listing reads", async () => {
    const httpServer = app.getHttpServer();
    const sellerToken = await register(`seller+media+${Date.now()}@example.com`);
    const listingId = await createListing(sellerToken, "Photo upload test listing");

    const strangerToken = await register(`stranger+media+${Date.now()}@example.com`);
    const forbiddenUpload = await request(httpServer)
      .post(`/listings/${listingId}/media`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .attach("photos", TINY_PNG, "a.png");
    expect(forbiddenUpload.status).toBe(403);

    const uploadRes = await request(httpServer)
      .post(`/listings/${listingId}/media`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .attach("photos", TINY_PNG, "a.png")
      .attach("photos", TINY_PNG, "b.png");
    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body).toHaveLength(2);
    expect(uploadRes.body[0].isPrimary).toBe(true);
    expect(uploadRes.body[1].isPrimary).toBe(false);
    expect(uploadRes.body[0].url).toContain("/uploads/listings/");

    const listRes = await request(httpServer).get(`/listings/${listingId}/media`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(2);

    // Public listing read includes the resolved photo URLs, primary first.
    const listingRes = await request(httpServer).get(`/listings/${listingId}`);
    expect(listingRes.body.media).toHaveLength(2);
    expect(listingRes.body.media[0].isPrimary).toBe(true);

    // Switch primary to the second photo.
    const secondMediaId = uploadRes.body[1].id as string;
    const setPrimaryRes = await request(httpServer)
      .patch(`/listings/${listingId}/media/${secondMediaId}/primary`)
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(setPrimaryRes.status).toBe(200);

    const afterSwitch = await request(httpServer).get(`/listings/${listingId}/media`);
    expect(afterSwitch.body.find((m: { id: string }) => m.id === secondMediaId).isPrimary).toBe(true);

    // Deleting the current primary promotes the remaining photo automatically.
    const deleteRes = await request(httpServer)
      .delete(`/listings/${listingId}/media/${secondMediaId}`)
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(deleteRes.status).toBe(200);

    const afterDelete = await request(httpServer).get(`/listings/${listingId}/media`);
    expect(afterDelete.body).toHaveLength(1);
    expect(afterDelete.body[0].isPrimary).toBe(true);
  });

  it("rejects uploading more than the per-listing photo cap once the cap is already reached", async () => {
    // 8 photos each go through real Jimp read/resize/watermark/encode sequentially, which
    // can exceed the default 30s under full-suite parallel load (verified standalone in
    // ~16s) — this is legitimate processing time, not a hang.
    const httpServer = app.getHttpServer();
    const sellerToken = await register(`seller+mediacap+${Date.now()}@example.com`);
    const listingId = await createListing(sellerToken, "Photo cap test listing");

    let fullReq = request(httpServer).post(`/listings/${listingId}/media`).set("Authorization", `Bearer ${sellerToken}`);
    for (let i = 0; i < 8; i++) {
      fullReq = fullReq.attach("photos", TINY_PNG, `p${i}.png`);
    }
    const fullRes = await fullReq;
    expect(fullRes.status).toBe(201);
    expect(fullRes.body).toHaveLength(8);

    const overCapRes = await request(httpServer)
      .post(`/listings/${listingId}/media`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .attach("photos", TINY_PNG, "one-too-many.png");
    expect(overCapRes.status).toBe(400);
  }, 60000);
});
