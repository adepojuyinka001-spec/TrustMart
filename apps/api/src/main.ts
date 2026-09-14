import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Watermarked listing photos (local-disk MediaStorage — see media-storage.service.ts).
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
  // ("REST/JSON; OpenAPI"). Gated out of production: the first real deployment is the
  // "revisit before a real deployment" moment this comment always pointed at. No
  // production secrets/rates are exposed by route/DTO shapes, but the full API surface
  // (every route, every field) still shouldn't be handed to an anonymous public visitor
  // by default — dev/staging keeps it for convenience.
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

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
}

bootstrap();
