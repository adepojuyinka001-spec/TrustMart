import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { LedgerService } from "../src/modules/ledger/ledger.service";
import { LedgerDirection, LedgerAccountType } from "@prisma/client";

// Financial Ledger engine (CLAUDE.md SS17): balanced double-entry, exact-safe BigInt
// arithmetic, immutable posted entries, idempotent via external reference. Nothing in the
// app posts to it yet (no payment provider is wired, Open Decision #1) — this exercises
// the engine directly, plus its read-only admin endpoints.
describe("TrustMart Financial Ledger (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ledgerService: LedgerService;
  let adminToken: string;
  let buyerToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    ledgerService = app.get(LedgerService);

    const suffix = Date.now();
    const adminEmail = `admin+ledger+${suffix}@example.com`;
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
      email: `buyer+ledger+${suffix}@example.com`,
      password: "correct-horse-battery-staple",
      firstName: "Test",
      lastName: "Buyer",
    });
    buyerToken = buyerRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects an unbalanced journal (debits must exactly equal credits)", async () => {
    await expect(
      ledgerService.postJournal({
        description: "Unbalanced test",
        currency: "NGN",
        lines: [
          { accountKey: `test:unbalanced:${Date.now()}`, accountType: LedgerAccountType.ASSET, direction: LedgerDirection.DEBIT, amountMinorUnits: 1000n },
          { accountKey: `test:unbalanced-other:${Date.now()}`, accountType: LedgerAccountType.LIABILITY, direction: LedgerDirection.CREDIT, amountMinorUnits: 999n },
        ],
      }),
    ).rejects.toThrow(/unbalanced/i);
  });

  it("rejects a journal with fewer than two lines, and a non-positive amount", async () => {
    await expect(
      ledgerService.postJournal({
        description: "Single line",
        currency: "NGN",
        lines: [{ accountKey: "test:single", accountType: LedgerAccountType.ASSET, direction: LedgerDirection.DEBIT, amountMinorUnits: 100n }],
      }),
    ).rejects.toThrow(/at least two lines/i);

    await expect(
      ledgerService.postJournal({
        description: "Zero amount",
        currency: "NGN",
        lines: [
          { accountKey: "test:zero-a", accountType: LedgerAccountType.ASSET, direction: LedgerDirection.DEBIT, amountMinorUnits: 0n },
          { accountKey: "test:zero-b", accountType: LedgerAccountType.LIABILITY, direction: LedgerDirection.CREDIT, amountMinorUnits: 0n },
        ],
      }),
    ).rejects.toThrow(/positive amount/i);
  });

  it("posts a balanced journal, updates both account balances correctly, and is idempotent via externalRef", async () => {
    const suffix = Date.now();
    const heldKey = `test:funds_held:${suffix}`;
    const payableKey = `test:seller_payable:${suffix}`;

    const journal1 = await ledgerService.postJournal({
      description: "Escrow funded (test)",
      currency: "NGN",
      externalRef: { source: "test_provider", reference: `ref-${suffix}` },
      lines: [
        { accountKey: heldKey, accountLabel: "Funds Held", accountType: LedgerAccountType.ASSET, direction: LedgerDirection.DEBIT, amountMinorUnits: 500_000n },
        { accountKey: payableKey, accountLabel: "Seller Payable", accountType: LedgerAccountType.LIABILITY, direction: LedgerDirection.CREDIT, amountMinorUnits: 500_000n },
      ],
    });
    expect(journal1.entries).toHaveLength(2);

    // Same externalRef posted again (e.g. a retried webhook) must return the SAME journal,
    // not create a second one.
    const journal2 = await ledgerService.postJournal({
      description: "Escrow funded (test) -- retry",
      currency: "NGN",
      externalRef: { source: "test_provider", reference: `ref-${suffix}` },
      lines: [
        { accountKey: heldKey, direction: LedgerDirection.DEBIT, amountMinorUnits: 500_000n },
        { accountKey: payableKey, direction: LedgerDirection.CREDIT, amountMinorUnits: 500_000n },
      ],
    });
    expect(journal2.id).toBe(journal1.id);

    const heldBalance = await ledgerService.getAccountBalance(heldKey);
    expect(heldBalance.balanceMinorUnits).toBe(500_000n);
    const payableBalance = await ledgerService.getAccountBalance(payableKey);
    expect(payableBalance.balanceMinorUnits).toBe(500_000n);

    const totalJournalsForRef = await prisma.ledgerExternalReference.count({
      where: { source: "test_provider", reference: `ref-${suffix}` },
    });
    expect(totalJournalsForRef).toBe(1);
  });

  it("reverses a journal with a new compensating posting, never mutating the original, and can't reverse twice", async () => {
    const suffix = Date.now();
    const cashKey = `test:cash:${suffix}`;
    const revenueKey = `test:revenue:${suffix}`;

    const original = await ledgerService.postJournal({
      description: "Fee charged (test)",
      currency: "NGN",
      lines: [
        { accountKey: cashKey, accountType: LedgerAccountType.ASSET, direction: LedgerDirection.DEBIT, amountMinorUnits: 12_500n },
        { accountKey: revenueKey, accountType: LedgerAccountType.REVENUE, direction: LedgerDirection.CREDIT, amountMinorUnits: 12_500n },
      ],
    });

    const originalEntriesBefore = await prisma.ledgerEntry.findMany({ where: { journalId: original.id } });

    const reversal = await ledgerService.reverseJournal(original.id, "test correction");
    expect(reversal.id).not.toBe(original.id);

    const originalEntriesAfter = await prisma.ledgerEntry.findMany({ where: { journalId: original.id } });
    expect(originalEntriesAfter).toEqual(originalEntriesBefore);

    const cashBalance = await ledgerService.getAccountBalance(cashKey);
    expect(cashBalance.balanceMinorUnits).toBe(0n);

    const secondReversal = await ledgerService.reverseJournal(original.id, "duplicate attempt");
    expect(secondReversal.id).toBe(reversal.id);
  });

  it("blocks a non-admin from reading the ledger, and allows an admin (RBAC positive + negative)", async () => {
    const suffix = Date.now();
    const key = `test:rbac_check:${suffix}`;
    await ledgerService.postJournal({
      description: "RBAC check fixture",
      currency: "NGN",
      lines: [
        { accountKey: key, accountType: LedgerAccountType.ASSET, direction: LedgerDirection.DEBIT, amountMinorUnits: 100n },
        { accountKey: `test:rbac_check_other:${suffix}`, accountType: LedgerAccountType.EQUITY, direction: LedgerDirection.CREDIT, amountMinorUnits: 100n },
      ],
    });

    const forbidden = await request(app.getHttpServer())
      .get("/admin/ledger/accounts")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app.getHttpServer())
      .get("/admin/ledger/accounts")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    const account = allowed.body.find((a: { key: string }) => a.key === key);
    expect(account).toBeDefined();
    expect(account.balanceMinorUnits).toBe("100");

    const entriesRes = await request(app.getHttpServer())
      .get(`/admin/ledger/accounts/${key}/entries`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(entriesRes.status).toBe(200);
    expect(entriesRes.body.items).toHaveLength(1);
  });
});
