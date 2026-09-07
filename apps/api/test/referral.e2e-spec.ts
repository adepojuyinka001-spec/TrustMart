import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";

// Company Referral (CLAUDE.md SS19): relationship tracking only, no reward computation
// (that needs a completed, funded Escrow transaction, which doesn't exist yet).
// "No qualifying external referral => Company Referral. Do not leave referral ownership
// null" — verified for both the valid-code and no/invalid-code paths.
describe("TrustMart Company Referral (e2e)", () => {
  let app: INestApplication;

  const register = async (email: string, referralCode?: string) => {
    const res = await request(app.getHttpServer()).post("/auth/register").send({
      email,
      password: "correct-horse-battery-staple",
      firstName: "Test",
      lastName: "User",
      referralCode,
    });
    return res.body.accessToken as string;
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

  it("assigns every new user a unique referral code and defaults to Company Referral with no code given", async () => {
    const suffix = Date.now();
    const token = await register(`no-referral+${suffix}@example.com`);

    const mineRes = await request(app.getHttpServer()).get("/referrals/mine").set("Authorization", `Bearer ${token}`);
    expect(mineRes.status).toBe(200);
    expect(mineRes.body.referralCode).toEqual(expect.any(String));
    expect(mineRes.body.referralCode).toHaveLength(8);
    expect(mineRes.body.referredBy).toBe("COMPANY");
    expect(mineRes.body.peopleReferred).toBe(0);
  });

  it("assigns USER referral ownership when a valid referral code is given at registration", async () => {
    const suffix = Date.now();
    const referrerToken = await register(`referrer+${suffix}@example.com`);
    const referrerMine = await request(app.getHttpServer()).get("/referrals/mine").set("Authorization", `Bearer ${referrerToken}`);
    const referrerCode = referrerMine.body.referralCode as string;

    const refereeToken = await register(`referee+${suffix}@example.com`, referrerCode);
    const refereeMine = await request(app.getHttpServer()).get("/referrals/mine").set("Authorization", `Bearer ${refereeToken}`);
    expect(refereeMine.body.referredBy).toBe("USER");

    // The referrer's own count reflects the new referral.
    const referrerMineAfter = await request(app.getHttpServer()).get("/referrals/mine").set("Authorization", `Bearer ${referrerToken}`);
    expect(referrerMineAfter.body.peopleReferred).toBe(1);
  });

  it("falls back to Company Referral (never null) when given an invalid/unknown referral code", async () => {
    const suffix = Date.now();
    const token = await register(`bad-code+${suffix}@example.com`, "NOTAREALCODE");

    const mineRes = await request(app.getHttpServer()).get("/referrals/mine").set("Authorization", `Bearer ${token}`);
    expect(mineRes.status).toBe(200);
    expect(mineRes.body.referredBy).toBe("COMPANY");
  });

  it("requires authentication to read referral info", async () => {
    const res = await request(app.getHttpServer()).get("/referrals/mine");
    expect(res.status).toBe(401);
  });
});
