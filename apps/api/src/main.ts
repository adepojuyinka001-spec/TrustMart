import "reflect-metadata";
import { createApp } from "./bootstrap";

// Traditional long-running entry point — local dev (`nest start --watch`) and any host
// that runs a persistent Node process. Vercel uses api/index.ts instead, which never
// calls app.listen(); both share the same app setup via bootstrap.ts.
async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
}

bootstrap();
