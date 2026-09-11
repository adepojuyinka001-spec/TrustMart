import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// In-app notifications (CLAUDE.md SS26/SS31): the first consumer of the domain events
// already emitted throughout the app. Before this, marketplace.interest.created,
// marketplace.lead.status_changed, marketplace.match.created, escrow.created,
// escrow.terms_accepted, and the listing-expiry events were all emitted into the void.
describe("TrustMart Notifications (e2e)", () => {
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
    return { token: res.body.accessToken as string, userId: res.body.user?.id as string | undefined };
  };

  const registerWithId = async (email: string) => {
    const token = (await register(email)).token;
    const meRes = await request(app.getHttpServer()).get("/users/me").set("Authorization", `Bearer ${token}`);
    return { token, userId: meRes.body.id as string };
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const adminEmail = `admin+notification+${Date.now()}@example.com`;
    adminToken = (await register(adminEmail)).token;
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });

    const suffix = Date.now();
    const category = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `notif-cat-${suffix}`, label: "Notification Category" });
    const subcategory = await request(app.getHttpServer())
      .post(`/categories/${category.body.id}/subcategories`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `notif-sub-${suffix}`, label: "Notification Subcategory" });
    subcategoryId = subcategory.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("notifies the seller when a buyer expresses interest, and the buyer when the seller updates lead status", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();
    const seller = await registerWithId(`seller+notif+${suffix}@example.com`);
    const buyer = await registerWithId(`buyer+notif+${suffix}@example.com`);

    const listingRes = await request(httpServer).post("/listings").set("Authorization", `Bearer ${seller.token}`).send({
      subcategoryId,
      title: "Notification test listing",
      description: "A listing to test notifications.",
      askingPriceMinorUnits: 1_000_000,
    });
    const listingId = listingRes.body.id as string;
    await request(httpServer).post(`/listings/${listingId}/submit`).set("Authorization", `Bearer ${seller.token}`);
    await request(httpServer).post(`/listings/${listingId}/approve`).set("Authorization", `Bearer ${adminToken}`);

    await request(httpServer).post("/interests").set("Authorization", `Bearer ${buyer.token}`).send({ listingId });

    const sellerNotifs = await request(httpServer).get("/notifications/mine").set("Authorization", `Bearer ${seller.token}`);
    expect(sellerNotifs.status).toBe(200);
    expect(sellerNotifs.body.unreadCount).toBeGreaterThanOrEqual(1);
    const interestNotif = sellerNotifs.body.items.find((n: { type: string }) => n.type === "interest.created");
    expect(interestNotif).toBeDefined();
    expect(interestNotif.body).toContain("Notification test listing");
    expect(interestNotif.isRead).toBe(false);

    const interestsRes = await request(httpServer)
      .get(`/listings/${listingId}/interests`)
      .set("Authorization", `Bearer ${seller.token}`);
    const leadId = interestsRes.body[0].lead.id as string;

    await request(httpServer)
      .patch(`/leads/${leadId}/status`)
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ status: "CONTACTED" });

    const buyerNotifs = await request(httpServer).get("/notifications/mine").set("Authorization", `Bearer ${buyer.token}`);
    const statusNotif = buyerNotifs.body.items.find((n: { type: string }) => n.type === "lead.status_changed");
    expect(statusNotif).toBeDefined();
    expect(statusNotif.body).toContain("contacted");

    // Mark the seller's interest notification as read.
    const markReadRes = await request(httpServer)
      .patch(`/notifications/${interestNotif.id}/read`)
      .set("Authorization", `Bearer ${seller.token}`);
    expect(markReadRes.status).toBe(200);
    expect(markReadRes.body.isRead).toBe(true);

    // A different user can't mark someone else's notification as read.
    const forbiddenRead = await request(httpServer)
      .patch(`/notifications/${interestNotif.id}/read`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(forbiddenRead.status).toBe(403);

    const unreadOnly = await request(httpServer)
      .get("/notifications/mine")
      .query({ unreadOnly: true })
      .set("Authorization", `Bearer ${seller.token}`);
    expect(unreadOnly.body.items.some((n: { id: string }) => n.id === interestNotif.id)).toBe(false);
  });

  it("notifies invited escrow parties (not the creator) when an escrow is created, and all parties when terms are accepted", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();
    const buyer = await registerWithId(`buyer+escrownotif+${suffix}@example.com`);
    const seller = await registerWithId(`seller+escrownotif+${suffix}@example.com`);

    const createRes = await request(httpServer)
      .post("/escrows")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        originType: "DIRECT",
        title: "Notification escrow test",
        creatorRole: "BUYER",
        invitedParties: [{ userId: seller.userId, role: "SELLER" }],
        transactionAmountMinorUnits: 500_000,
        feeAllocation: "BUYER_PAYS",
      });
    const escrowId = createRes.body.id as string;

    // Creator (buyer) should NOT get an "invited" notification for their own escrow.
    const buyerNotifsAfterCreate = await request(httpServer)
      .get("/notifications/mine")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(
      buyerNotifsAfterCreate.body.items.some(
        (n: { type: string; resourceId: string }) => n.type === "escrow.created" && n.resourceId === escrowId,
      ),
    ).toBe(false);

    // Invited seller should get one.
    const sellerNotifsAfterCreate = await request(httpServer)
      .get("/notifications/mine")
      .set("Authorization", `Bearer ${seller.token}`);
    const invitedNotif = sellerNotifsAfterCreate.body.items.find(
      (n: { type: string; resourceId: string }) => n.type === "escrow.created" && n.resourceId === escrowId,
    );
    expect(invitedNotif).toBeDefined();
    expect(invitedNotif.body).toContain("Notification escrow test");

    await request(httpServer).post(`/escrows/${escrowId}/accept`).set("Authorization", `Bearer ${seller.token}`);

    const buyerNotifsAfterAccept = await request(httpServer)
      .get("/notifications/mine")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(
      buyerNotifsAfterAccept.body.items.some(
        (n: { type: string; resourceId: string }) => n.type === "escrow.terms_accepted" && n.resourceId === escrowId,
      ),
    ).toBe(true);
  });
});
