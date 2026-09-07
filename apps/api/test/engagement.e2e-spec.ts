import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Exercises Interest -> Lead -> Contact Access, with special attention to the
// non-negotiable rule at CLAUDE.md SS5/SS13: seller subscription alone must never expose
// buyer contact info. Since Subscription/Entitlement (Phase 4) doesn't exist yet,
// ContactAccessService is expected to ALWAYS deny — that is the correct, safe behavior
// being tested here, not a bug.
describe("TrustMart Engagement (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let categoryId: string;
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

    const adminEmail = `admin+engagement+${Date.now()}@example.com`;
    adminToken = await register(adminEmail);
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });

    const suffix = Date.now();
    const category = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `engagement-cat-${suffix}`, label: "Engagement Category" });
    categoryId = category.body.id;
    const subcategory = await request(app.getHttpServer())
      .post(`/categories/${categoryId}/subcategories`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: `engagement-sub-${suffix}`, label: "Engagement Subcategory" });
    subcategoryId = subcategory.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates an interest and a lead when a buyer expresses interest in an active listing", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();
    const sellerToken = await register(`seller+int+${suffix}@example.com`);
    const buyerToken = await register(`buyer+int+${suffix}@example.com`);

    const listingRes = await request(httpServer).post("/listings").set("Authorization", `Bearer ${sellerToken}`).send({
      subcategoryId,
      title: "Test listing",
      description: "A listing to express interest in.",
      askingPriceMinorUnits: 1_000_000,
    });
    const listingId = listingRes.body.id as string;
    await request(httpServer).post(`/listings/${listingId}/submit`).set("Authorization", `Bearer ${sellerToken}`);
    await request(httpServer).post(`/listings/${listingId}/approve`).set("Authorization", `Bearer ${adminToken}`);

    // A seller cannot express interest in their own listing.
    const selfInterest = await request(httpServer)
      .post("/interests")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ listingId });
    expect(selfInterest.status).toBe(403);

    const interestRes = await request(httpServer)
      .post("/interests")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, message: "Interested!" });
    expect(interestRes.status).toBe(201);
    expect(interestRes.body.lead).toBeDefined();
    expect(interestRes.body.lead.status).toBe("NEW");

    // Duplicate interest on the same listing is rejected.
    const duplicate = await request(httpServer)
      .post("/interests")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId });
    expect(duplicate.status).toBe(409);

    const sellerInterests = await request(httpServer)
      .get(`/listings/${listingId}/interests`)
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(sellerInterests.status).toBe(200);
    expect(sellerInterests.body).toHaveLength(1);
    const leadId = sellerInterests.body[0].lead.id as string;

    // Seller can progress the lead through non-terminal statuses.
    const contactedRes = await request(httpServer)
      .patch(`/leads/${leadId}/status`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ status: "CONTACTED", note: "Called the buyer." });
    expect(contactedRes.status).toBe(200);
    expect(contactedRes.body.status).toBe("CONTACTED");

    // The buyer (not just the seller) can read the lead they're a party to.
    const buyerReadsLead = await request(httpServer).get(`/leads/${leadId}`).set("Authorization", `Bearer ${buyerToken}`);
    expect(buyerReadsLead.status).toBe(200);
    expect(buyerReadsLead.body.activities).toHaveLength(1);

    // A stranger cannot read the lead.
    const stranger = await register(`stranger+${suffix}@example.com`);
    const strangerReadsLead = await request(httpServer).get(`/leads/${leadId}`).set("Authorization", `Bearer ${stranger}`);
    expect(strangerReadsLead.status).toBe(403);
  });

  it("always denies contact access because no subscription/entitlement exists yet (fail-closed, by design)", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();
    const sellerToken = await register(`seller+contact+${suffix}@example.com`);
    const buyerToken = await register(`buyer+contact+${suffix}@example.com`);

    // Buyer explicitly grants contact-share consent — this alone must still not be enough.
    const consentRes = await request(httpServer)
      .put("/consent")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ type: "BUYER_CONTACT_SHARE", granted: true });
    expect(consentRes.status).toBe(200);

    const listingRes = await request(httpServer).post("/listings").set("Authorization", `Bearer ${sellerToken}`).send({
      subcategoryId,
      title: "Contact test listing",
      description: "A listing to test contact access.",
      askingPriceMinorUnits: 1_000_000,
    });
    const listingId = listingRes.body.id as string;
    await request(httpServer).post(`/listings/${listingId}/submit`).set("Authorization", `Bearer ${sellerToken}`);
    await request(httpServer).post(`/listings/${listingId}/approve`).set("Authorization", `Bearer ${adminToken}`);

    await request(httpServer).post("/interests").set("Authorization", `Bearer ${buyerToken}`).send({ listingId });
    const interests = await request(httpServer)
      .get(`/listings/${listingId}/interests`)
      .set("Authorization", `Bearer ${sellerToken}`);
    const leadId = interests.body[0].lead.id as string;

    const accessRes = await request(httpServer)
      .post(`/leads/${leadId}/contact-access`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ preferredChannel: "WHATSAPP" });
    expect(accessRes.status).toBe(403);
    expect(accessRes.body.message).toContain("no_active_subscription_entitlement");

    // A different seller cannot even attempt access on a lead they don't own.
    const otherSeller = await register(`other-seller+${suffix}@example.com`);
    const forbiddenAttempt = await request(httpServer)
      .post(`/leads/${leadId}/contact-access`)
      .set("Authorization", `Bearer ${otherSeller}`)
      .send({});
    expect(forbiddenAttempt.status).toBe(403);

    // Every attempt — granted or denied — is recorded for audit.
    const attempts = await request(httpServer)
      .get(`/leads/${leadId}/contact-access`)
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(attempts.status).toBe(200);
    expect(attempts.body).toHaveLength(1);
    expect(attempts.body[0].granted).toBe(false);
    expect(attempts.body[0].denialReason).toBe("no_active_subscription_entitlement");

    const auditRows = await prisma.auditEvent.findMany({
      where: { resourceType: "Lead", action: "contact_access.deny", resourceId: leadId },
    });
    expect(auditRows.length).toBeGreaterThan(0);
  });

  it("blocks a seller from marking a lead as spam/fraud, and allows a risk analyst / admin (RBAC positive + negative)", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();
    const sellerToken = await register(`seller+spam+${suffix}@example.com`);
    const buyerToken = await register(`buyer+spam+${suffix}@example.com`);

    const listingRes = await request(httpServer).post("/listings").set("Authorization", `Bearer ${sellerToken}`).send({
      subcategoryId,
      title: "Spam test listing",
      description: "A listing to test spam moderation.",
      askingPriceMinorUnits: 1_000_000,
    });
    const listingId = listingRes.body.id as string;
    await request(httpServer).post(`/listings/${listingId}/submit`).set("Authorization", `Bearer ${sellerToken}`);
    await request(httpServer).post(`/listings/${listingId}/approve`).set("Authorization", `Bearer ${adminToken}`);
    await request(httpServer).post("/interests").set("Authorization", `Bearer ${buyerToken}`).send({ listingId });
    const interests = await request(httpServer)
      .get(`/listings/${listingId}/interests`)
      .set("Authorization", `Bearer ${sellerToken}`);
    const leadId = interests.body[0].lead.id as string;

    const forbidden = await request(httpServer)
      .post(`/leads/${leadId}/moderate/spam-fraud`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ reason: "Trying to self-moderate" });
    expect(forbidden.status).toBe(403);

    const allowed = await request(httpServer)
      .post(`/leads/${leadId}/moderate/spam-fraud`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Confirmed fraudulent pattern" });
    expect(allowed.status).toBe(201);
    expect(allowed.body.status).toBe("SPAM_FRAUD");

    // Terminal status — no further transition accepted.
    const afterTerminal = await request(httpServer)
      .patch(`/leads/${leadId}/status`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ status: "CONTACTED" });
    expect(afterTerminal.status).toBe(403);
  });
});
