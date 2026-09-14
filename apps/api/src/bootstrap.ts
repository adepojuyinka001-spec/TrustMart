import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { join } from "path";
import { AppModule } from "./app.module";

// Shared between the traditional long-running entry point (main.ts, for local dev and any
// host that runs a persistent Node process) and the Vercel serverless entry point
// (api/index.ts, which never calls app.listen() — Vercel invokes the exported handler
// per-request instead). Keeping this in one place means the two entry points can't drift
// on CORS/validation/Swagger behavior.
export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Watermarked listing photos (local-disk MediaStorage — see media-storage.service.ts).
  // On Vercel this directory is not persistent (serverless functions have an ephemeral,
  // largely read-only filesystem outside /tmp) — photo upload will fail there until
  // MediaStorage is backed by a real object storage provider (CLAUDE.md SS39, an
  // unresolved Open Decision). Left as-is rather than silently redirected to /tmp, which
  // would "work" but quietly lose every uploaded photo — an honest failure beats a fake fix.
  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads" });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({ origin: process.env.WEB_APP_ORIGIN ?? "http://localhost:3000" });

  // Dev-only API reference, generated from the actual controllers/DTOs — CLAUDE.md SS28
  // ("REST/JSON; OpenAPI"). Gated out of production: the full API surface (every route,
  // every DTO shape) shouldn't be handed to an anonymous public visitor by default once
  // there's a real deployment to protect. Dev/staging keeps it for convenience.
  if (process.env.NODE_ENV !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("TrustMart API")
      .setDescription("Marketplace + Escrow API — Find. Secure. Transact.")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api-docs", app, swaggerDocument);
  }

  return app;
}
