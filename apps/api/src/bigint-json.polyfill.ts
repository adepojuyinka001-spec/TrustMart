// Money fields (e.g. Listing.askingPriceMinorUnits, BuyerRequest.minBudgetMinorUnits) are
// Prisma BigInt to avoid float rounding on financial amounts (CLAUDE.md SS17: "no
// JavaScript floating-point financial truth"). JSON.stringify can't serialize BigInt
// natively, so every process that touches these models needs this patch — imported here
// for its side effect at the top of app.module.ts (not just main.ts's bootstrap) so it
// also covers e2e tests and any future entry point that constructs AppModule directly.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function toJSON(this: bigint) {
  return this.toString();
};
