import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import {
  VersioningMiddleware,
  CURRENT_VERSION,
} from './common/versioning/versioning.middleware';
import { VersionAnalyticsInterceptor } from './common/versioning/version-analytics.interceptor';
import { VersionAnalyticsService } from './common/versioning/version-analytics.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port');

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: CURRENT_VERSION,
  });

  // Register header-based version negotiation + deprecation warnings
  const versioningMiddleware = new VersioningMiddleware();
  app.use(versioningMiddleware.use.bind(versioningMiddleware));

  // Register version analytics interceptor globally
  const versionAnalytics = app.get(VersionAnalyticsService);
  app.useGlobalInterceptors(new VersionAnalyticsInterceptor(versionAnalytics));

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger setup — one document per supported version
  for (const version of ['1', '2']) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(`Nestera API v${version}`)
      .setDescription(
        version === '1'
          ? 'API v1 — DEPRECATED. Sunset: 2026-09-01. Migrate to v2.'
          : 'API v2 — Current stable version.',
      )
      .setVersion(version)
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`api/v${version}/docs`, app, document);
  }

  await app.listen(port || 3001);
  const logger = app.get(Logger);
  logger.log(`Application is running on: http://localhost:${port}/api`);
  logger.log(
    `Swagger v1 docs (deprecated): http://localhost:${port}/api/v1/docs`,
  );
  logger.log(`Swagger v2 docs: http://localhost:${port}/api/v2/docs`);
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Bootstrap] Application startup failed: ${message}`);
  process.exit(1);
});
