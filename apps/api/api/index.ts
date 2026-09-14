import "reflect-metadata";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverlessExpress from "@vendia/serverless-express";
import { createApp } from "../src/bootstrap";

// Vercel Node.js Serverless Function entry point. Every path is rewritten here (see
// vercel.json) since the Nest app defines its own top-level routes (/auth/login,
// /listings, ...) rather than living under an /api prefix. Never calls app.listen() —
// serverless-express adapts the underlying Express instance to handle one invocation per
// request instead. The Nest app is built once per warm function instance and cached
// across invocations, same idea as any other serverless cold-start pattern.
let cachedHandler: ReturnType<typeof serverlessExpress> | undefined;

async function getHandler() {
  if (!cachedHandler) {
    const app = await createApp();
    await app.init();
    cachedHandler = serverlessExpress({ app: app.getHttpAdapter().getInstance() });
  }
  return cachedHandler;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const server = await getHandler();
  return server(req, res);
}
