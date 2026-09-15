import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { LedgerAccountType, LedgerDirection } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export interface LedgerLine {
  accountKey: string;
  // Only required the first time a key is posted to — that first posting creates the
  // account. Every later posting to the same key is validated against what's already
  // stored, so a caller can't silently redefine what an existing account means.
  accountLabel?: string;
  accountType?: LedgerAccountType;
  direction: LedgerDirection;
  amountMinorUnits: bigint;
}

export interface PostJournalInput {
  description: string;
  currency: string;
  lines: LedgerLine[];
  postedBy?: string;
  // Idempotency (CLAUDE.md SS16/SS17): the same external event must only ever post one
  // journal, even under retry/replay. Omit only for a genuinely internal, non-retryable
  // posting — every provider-originated posting should carry one.
  externalRef?: { source: string; reference: string };
}

// The one place balanced double-entry postings happen (CLAUDE.md SS17: "The Financial
// Ledger is financial truth"). Nothing calls this yet — it exists ahead of any payment
// provider integration, same "build the engine before the vendor" pattern as
// AuthProvider/MediaStorage. Posted journals/entries are never updated or deleted; a
// correction is always a new, separately-posted reversal (reverseJournal below).
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async postJournal(input: PostJournalInput) {
    if (input.lines.length < 2) {
      throw new BadRequestException("A journal needs at least two lines (it must balance).");
    }

    const debitTotal = input.lines
      .filter((l) => l.direction === LedgerDirection.DEBIT)
      .reduce((sum, l) => sum + l.amountMinorUnits, 0n);
    const creditTotal = input.lines
      .filter((l) => l.direction === LedgerDirection.CREDIT)
      .reduce((sum, l) => sum + l.amountMinorUnits, 0n);
    if (debitTotal !== creditTotal) {
      throw new BadRequestException(
        `Unbalanced journal: debits (${debitTotal}) must exactly equal credits (${creditTotal}).`,
      );
    }
    if (input.lines.some((l) => l.amountMinorUnits <= 0n)) {
      throw new BadRequestException("Every line must be a positive amount.");
    }

    if (input.externalRef) {
      const existing = await this.prisma.ledgerExternalReference.findUnique({
        where: { source_reference: input.externalRef },
        include: { journal: { include: { entries: true } } },
      });
      if (existing) {
        return existing.journal;
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const accountsByKey = new Map<string, { id: string; type: LedgerAccountType }>();
        for (const line of input.lines) {
          if (accountsByKey.has(line.accountKey)) continue;
          const existing = await tx.ledgerAccount.findUnique({ where: { key: line.accountKey } });
          if (existing) {
            if (line.accountType && line.accountType !== existing.type) {
              throw new BadRequestException(
                `Account "${line.accountKey}" is already type ${existing.type}, not ${line.accountType}.`,
              );
            }
            accountsByKey.set(line.accountKey, { id: existing.id, type: existing.type });
          } else {
            if (!line.accountType) {
              throw new BadRequestException(`Account "${line.accountKey}" doesn't exist yet — accountType is required to create it.`);
            }
            const created = await tx.ledgerAccount.create({
              data: {
                key: line.accountKey,
                label: line.accountLabel ?? line.accountKey,
                type: line.accountType,
                currency: input.currency,
              },
            });
            accountsByKey.set(line.accountKey, { id: created.id, type: created.type });
          }
        }

        const journal = await tx.ledgerJournal.create({
          data: {
            description: input.description,
            postedBy: input.postedBy,
            entries: {
              create: input.lines.map((line) => ({
                accountId: accountsByKey.get(line.accountKey)!.id,
                direction: line.direction,
                amountMinorUnits: line.amountMinorUnits,
                currency: input.currency,
              })),
            },
          },
          include: { entries: true },
        });

        if (input.externalRef) {
          await tx.ledgerExternalReference.create({
            data: { journalId: journal.id, source: input.externalRef.source, reference: input.externalRef.reference },
          });
        }

        return journal;
      });
    } catch (err) {
      // A concurrent request won the idempotency race between our lookup above and this
      // transaction — re-fetch and return what actually got posted, rather than error the
      // second caller for a journal that (correctly) already exists.
      if (input.externalRef && this.isUniqueConstraintError(err)) {
        const existing = await this.prisma.ledgerExternalReference.findUnique({
          where: { source_reference: input.externalRef },
          include: { journal: { include: { entries: true } } },
        });
        if (existing) return existing.journal;
      }
      throw err;
    }
  }

  // Never mutates or deletes the original — posts a new, opposite-direction journal
  // instead (CLAUDE.md SS17: "compensating/reversal entries for corrections"). Idempotent
  // per original journal via its own external reference, so the same journal can't be
  // reversed twice by a retried request.
  async reverseJournal(journalId: string, reason: string, actorId?: string) {
    const original = await this.prisma.ledgerJournal.findUnique({
      where: { id: journalId },
      include: { entries: { include: { account: true } } },
    });
    if (!original) {
      throw new NotFoundException("Journal not found.");
    }

    const currency = original.entries[0]?.currency ?? "NGN";
    return this.postJournal({
      description: `Reversal of "${original.description}": ${reason}`,
      currency,
      postedBy: actorId,
      externalRef: { source: "ledger_reversal", reference: journalId },
      lines: original.entries.map((e) => ({
        accountKey: e.account.key,
        direction: e.direction === LedgerDirection.DEBIT ? LedgerDirection.CREDIT : LedgerDirection.DEBIT,
        amountMinorUnits: e.amountMinorUnits,
      })),
    });
  }

  async getAccountBalance(accountKey: string): Promise<{ account: { key: string; label: string; type: LedgerAccountType; currency: string }; balanceMinorUnits: bigint }> {
    const account = await this.prisma.ledgerAccount.findUnique({ where: { key: accountKey }, include: { entries: true } });
    if (!account) {
      throw new NotFoundException("Ledger account not found.");
    }
    return { account, balanceMinorUnits: this.computeBalance(account.type, account.entries) };
  }

  async listAccounts() {
    const accounts = await this.prisma.ledgerAccount.findMany({ include: { entries: true }, orderBy: { key: "asc" } });
    return accounts.map((a) => ({
      key: a.key,
      label: a.label,
      type: a.type,
      currency: a.currency,
      balanceMinorUnits: this.computeBalance(a.type, a.entries),
    }));
  }

  async listEntriesForAccount(accountKey: string, page: { take: number; skip: number }) {
    const account = await this.prisma.ledgerAccount.findUnique({ where: { key: accountKey } });
    if (!account) {
      throw new NotFoundException("Ledger account not found.");
    }
    const [items, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: { accountId: account.id },
        include: { journal: true },
        orderBy: { createdAt: "desc" },
        take: page.take,
        skip: page.skip,
      }),
      this.prisma.ledgerEntry.count({ where: { accountId: account.id } }),
    ]);
    return { items, total };
  }

  private computeBalance(type: LedgerAccountType, entries: { direction: LedgerDirection; amountMinorUnits: bigint }[]): bigint {
    const debitNormal = type === LedgerAccountType.ASSET || type === LedgerAccountType.EXPENSE;
    const debits = entries.filter((e) => e.direction === LedgerDirection.DEBIT).reduce((s, e) => s + e.amountMinorUnits, 0n);
    const credits = entries.filter((e) => e.direction === LedgerDirection.CREDIT).reduce((s, e) => s + e.amountMinorUnits, 0n);
    return debitNormal ? debits - credits : credits - debits;
  }

  private isUniqueConstraintError(err: unknown): boolean {
    return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
  }
}
