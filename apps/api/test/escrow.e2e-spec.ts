import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";

// Standalone Escrow, non-financial scaffolding only (CLAUDE.md SS14-15). Covers
// creation, versioned terms, conditions, mutual acceptance, amendment (which must reset
// acceptance and bump the version), decline, and cancel. Deliberately does NOT test
// funding/release/ledger — those don't exist yet, by design (Open Decision #1).
describe("TrustMart Escrow scaffolding (e2e)", () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates an escrow with versioned terms, requires mutual acceptance, and rejects a stranger", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();
    const buyer = await registerWithId(`buyer+escrow+${suffix}@example.com`);
    const seller = await registerWithId(`seller+escrow+${suffix}@example.com`);
    const stranger = await register(`stranger+escrow+${suffix}@example.com`);

    const createRes = await request(httpServer)
      .post("/escrows")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        originType: "DIRECT",
        title: "Laptop purchase",
        creatorRole: "BUYER",
        invitedParties: [{ userId: seller.userId, role: "SELLER" }],
        transactionAmountMinorUnits: 500_000,
        feeAllocation: "BUYER_PAYS",
        conditions: ["Item must match the listed description", "Delivered within 3 days"],
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe("TERMS_PROPOSED");
    expect(createRes.body.termVersions).toHaveLength(1);
    const version1 = createRes.body.termVersions[0];
    expect(version1.version).toBe(1);
    expect(version1.feePercent).toBe(2.5);
    expect(version1.conditions).toHaveLength(2);
    // Creator (buyer) auto-accepted their own proposal; seller has not yet.
    expect(version1.acceptances).toHaveLength(1);
    const escrowId = createRes.body.id as string;

    const strangerReads = await request(httpServer).get(`/escrows/${escrowId}`).set("Authorization", `Bearer ${stranger.token}`);
    expect(strangerReads.status).toBe(403);

    const strangerAccepts = await request(httpServer).post(`/escrows/${escrowId}/accept`).set("Authorization", `Bearer ${stranger.token}`);
    expect(strangerAccepts.status).toBe(403);

    // Seller accepts -> both parties have now accepted -> escrow moves to ACCEPTED.
    const sellerAccepts = await request(httpServer).post(`/escrows/${escrowId}/accept`).set("Authorization", `Bearer ${seller.token}`);
    expect(sellerAccepts.status).toBe(201);
    expect(sellerAccepts.body.status).toBe("ACCEPTED");
  });

  it("a material amendment bumps the version and resets acceptance, requiring full re-acceptance", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();
    const buyer = await registerWithId(`buyer+amend+${suffix}@example.com`);
    const seller = await registerWithId(`seller+amend+${suffix}@example.com`);

    const createRes = await request(httpServer)
      .post("/escrows")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        originType: "DIRECT",
        title: "Car purchase",
        creatorRole: "BUYER",
        invitedParties: [{ userId: seller.userId, role: "SELLER" }],
        transactionAmountMinorUnits: 2_000_000,
        feeAllocation: "SHARED",
        buyerFeeSharePercent: 50,
      });
    const escrowId = createRes.body.id as string;

    await request(httpServer).post(`/escrows/${escrowId}/accept`).set("Authorization", `Bearer ${seller.token}`);
    const acceptedState = await request(httpServer).get(`/escrows/${escrowId}`).set("Authorization", `Bearer ${buyer.token}`);
    expect(acceptedState.body.status).toBe("ACCEPTED");

    // Buyer proposes a lower amount — a material amendment.
    const amendRes = await request(httpServer)
      .post(`/escrows/${escrowId}/amend`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ transactionAmountMinorUnits: 1_800_000, feeAllocation: "SELLER_PAYS" });
    expect(amendRes.status).toBe(201);
    expect(amendRes.body.status).toBe("TERMS_PROPOSED");
    expect(amendRes.body.termVersions[0].version).toBe(2);
    // Only the proposer (buyer) has accepted the new version so far.
    expect(amendRes.body.termVersions[0].acceptances).toHaveLength(1);

    // Seller must accept again for the amended terms to take effect.
    const sellerReacceptsRes = await request(httpServer).post(`/escrows/${escrowId}/accept`).set("Authorization", `Bearer ${seller.token}`);
    expect(sellerReacceptsRes.status).toBe(201);
    expect(sellerReacceptsRes.body.status).toBe("ACCEPTED");
    expect(sellerReacceptsRes.body.termVersions[0].transactionAmountMinorUnits).toBe("1800000");
  });

  it("a party can decline before acceptance, cancelling the escrow; cannot decline afterward", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();
    const buyer = await registerWithId(`buyer+decline+${suffix}@example.com`);
    const seller = await registerWithId(`seller+decline+${suffix}@example.com`);

    const createRes = await request(httpServer)
      .post("/escrows")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        originType: "DIRECT",
        title: "Declined deal",
        creatorRole: "BUYER",
        invitedParties: [{ userId: seller.userId, role: "SELLER" }],
        transactionAmountMinorUnits: 100_000,
        feeAllocation: "BUYER_PAYS",
      });
    const escrowId = createRes.body.id as string;

    const declineRes = await request(httpServer).post(`/escrows/${escrowId}/decline`).set("Authorization", `Bearer ${seller.token}`);
    expect(declineRes.status).toBe(201);
    expect(declineRes.body.status).toBe("CANCELLED");

    const acceptAfterCancel = await request(httpServer).post(`/escrows/${escrowId}/accept`).set("Authorization", `Bearer ${buyer.token}`);
    expect(acceptAfterCancel.status).toBe(403);
  });

  it("either party can cancel with a reason, and a cancelled escrow cannot be cancelled twice", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();
    const buyer = await registerWithId(`buyer+cancel+${suffix}@example.com`);
    const seller = await registerWithId(`seller+cancel+${suffix}@example.com`);

    const createRes = await request(httpServer)
      .post("/escrows")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        originType: "MARKETPLACE",
        title: "Cancel test",
        creatorRole: "BUYER",
        invitedParties: [{ userId: seller.userId, role: "SELLER" }],
        transactionAmountMinorUnits: 250_000,
        feeAllocation: "BUYER_PAYS",
      });
    const escrowId = createRes.body.id as string;

    const cancelRes = await request(httpServer)
      .post(`/escrows/${escrowId}/cancel`)
      .set("Authorization", `Bearer ${seller.token}`)
      .send({ reason: "Changed my mind" });
    expect(cancelRes.status).toBe(201);
    expect(cancelRes.body.status).toBe("CANCELLED");

    const doubleCancel = await request(httpServer)
      .post(`/escrows/${escrowId}/cancel`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ reason: "Also changed my mind" });
    expect(doubleCancel.status).toBe(403);
  });

  // Regression test: GET /escrows/mine originally only included `parties`, not
  // `termVersions`. Any consumer reading `escrow.termVersions[0]` (e.g. the web
  // dashboard, to show the current amount) crashed once a real escrow existed, since
  // the field was silently undefined rather than an empty array. Caught live in the
  // browser, not by this suite, because every prior escrow.e2e-spec.ts test reads
  // GET /escrows/:id (which always included termVersions), never GET /escrows/mine.
  it("includes termVersions (with conditions and acceptances) in the mine listing, not just parties", async () => {
    const httpServer = app.getHttpServer();
    const suffix = Date.now();
    const buyer = await registerWithId(`buyer+listmine+${suffix}@example.com`);
    const seller = await registerWithId(`seller+listmine+${suffix}@example.com`);

    await request(httpServer)
      .post("/escrows")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        originType: "DIRECT",
        title: "List-mine regression check",
        creatorRole: "BUYER",
        invitedParties: [{ userId: seller.userId, role: "SELLER" }],
        transactionAmountMinorUnits: 555_000,
        feeAllocation: "BUYER_PAYS",
        conditions: ["Condition A"],
      });

    const mineRes = await request(httpServer).get("/escrows/mine").set("Authorization", `Bearer ${buyer.token}`);
    expect(mineRes.status).toBe(200);
    const found = mineRes.body.find((e: { title: string }) => e.title === "List-mine regression check");
    expect(found).toBeDefined();
    expect(found.termVersions).toBeDefined();
    expect(found.termVersions[0].transactionAmountMinorUnits).toBe("555000");
    expect(found.termVersions[0].conditions[0].description).toBe("Condition A");
    expect(found.termVersions[0].acceptances.length).toBeGreaterThan(0);
  });
});
