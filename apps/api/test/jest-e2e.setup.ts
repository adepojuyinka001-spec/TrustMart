// Points e2e tests at a dedicated `trustmart_test` database instead of the dev database
// the web app demos against (see docs/00-ssot/DECISION_LOG.md, 2026-09-08 entry). Every
// e2e run was previously writing ~20 junk rows into `trustmart_dev`, requiring repeated
// manual cleanup to keep the Marketplace UI presentable.
//
// No `dotenv` dependency available directly (pnpm's strict node_modules only hoists
// @nestjs/config's own transitive copy, not one this package can `require`), so this
// parses the tiny .env.test file by hand rather than adding a dependency for it.
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const envPath = resolve(__dirname, "../.env.test");
if (existsSync(envPath)) {
  const contents = readFileSync(envPath, "utf-8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    process.env[key] = value;
  }
}
