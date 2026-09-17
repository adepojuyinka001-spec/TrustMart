import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

// CLAUDE.md SS18: the confidential reward/referral rates (buyer/seller appreciation,
// referral reward) "must never" reach customer-facing APIs, DTOs, frontend bundles, logs,
// or AI responses -- this is a hard rule, not a best-effort one. Nothing in the codebase
// computes or exposes a reward amount yet (Reward computation/payout is blocked on Open
// Decision #1, per docs/00-ssot/IMPLEMENTATION_STATUS.md), so this test is a forward-
// looking tripwire: it starts green today and stays green only as long as no future
// change accidentally hardcodes or surfaces the actual confidential figures anywhere
// under apps/api/src or apps/web (the only places "customer-facing" code lives -- CLAUDE.md
// itself, which documents the real figures for internal/founder reference, lives outside
// both directories and is never scanned here).
//
describe("Confidential reward/referral rate leakage guard", () => {
  // The exact figures below are copied from CLAUDE.md SS18 (the founder-approved source of
  // truth) so this test can actually check for them -- a test file is backend-only, never
  // bundled/shipped/returned by any API, so holding the literal here isn't itself the kind
  // of customer-facing exposure SS18 prohibits (the same trust level the eventual Reward
  // Engine's own backend code will need). If the real figures ever change, update this
  // array from CLAUDE.md directly -- never invent new ones here.
  const FORBIDDEN_LITERALS = ["0.1%", "0.3%"];

  const REPO_ROOT = join(__dirname, "..", "..", "..", "..", "..");
  const SCAN_ROOTS = [join(REPO_ROOT, "apps", "api", "src"), join(REPO_ROOT, "apps", "web")];
  const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "dist", "coverage", ".turbo"]);
  const SELF_PATH = __filename;

  function collectSourceFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        if (!SKIP_DIR_NAMES.has(entry)) collectSourceFiles(fullPath, out);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry) && fullPath !== SELF_PATH) {
        out.push(fullPath);
      }
    }
    return out;
  }

  it("never appears in application source (apps/api/src, apps/web)", () => {
    const offenders: { file: string; literal: string }[] = [];

    for (const root of SCAN_ROOTS) {
      for (const file of collectSourceFiles(root)) {
        const content = readFileSync(file, "utf-8");
        for (const literal of FORBIDDEN_LITERALS) {
          if (content.includes(literal)) {
            offenders.push({ file: file.replace(REPO_ROOT, ""), literal });
          }
        }
      }
    }

    if (offenders.length > 0) {
      throw new Error(
        `Confidential reward rate literal(s) found outside CLAUDE.md (CLAUDE.md SS18: never expose to ` +
          `customer-facing code):\n${offenders.map((o) => `  ${o.file}: "${o.literal}"`).join("\n")}`,
      );
    }
  });
});
