import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({ origin: process.env.WEB_APP_ORIGIN ?? "http://localhost:3000" });

  // Dev-only API reference, generated from the actual controllers/DTOs — CLAUDE.md SS28
  // ("REST/JSON; OpenAPI"). Not gated in this pass since no production secrets/rates are
  // exposed by route/DTO shapes; revisit before a real deployment.
  const swaggerConfig = new DocumentBuilder()
    .setTitle("TrustMart API")
    .setDescription("Marketplace + Escrow API — Find. Secure. Transact.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api-docs", app, swaggerDocument);

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
}

bootstrap();
