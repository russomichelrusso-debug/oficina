import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import * as express from "express";
import { AppModule } from "./app.module";
import { UPLOADS_ROOT } from "./media/storage.service";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: false,
  });

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Limite maior para upload de fotos/vídeos em base64 (§4.10) até o
  // ambiente ter um object storage S3 configurado — ver StorageService.
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));
  app.useStaticAssets(UPLOADS_ROOT, { prefix: "/uploads" });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[oficina-api] rodando em http://localhost:${port}/api/v1`);
}

bootstrap();
