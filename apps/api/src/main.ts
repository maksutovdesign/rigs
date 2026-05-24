import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import helmet from 'helmet'
import { AppModule } from './app.module'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule, { rawBody: true })

  // ─── Security headers ────────────────────────────────────────────────────
  app.use(helmet())

  // ─── CORS ────────────────────────────────────────────────────────────────
  const allowedOrigins = (process.env['WEB_URL'] ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  app.setGlobalPrefix('api/v1')

  const config = new DocumentBuilder()
    .setTitle('Rigs API')
    .setDescription('Платформа аренды снаряжения для активного отдыха')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env['PORT'] ?? 3001
  await app.listen(port)
  logger.log(`🚀 API running at http://localhost:${port}/api/v1`)
  logger.log(`📖 Swagger at http://localhost:${port}/api/docs`)
}

bootstrap()
