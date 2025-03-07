import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
 const port = configService.get<number>('PORT') || 3000;

 app.enableCors({
  origin: 'http://localhost:3001', // Allow Next.js origin
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // Allowed methods
  allowedHeaders: 'Content-Type, Authorization', // Allowed headers
  credentials: true, // Allow cookies/auth headers if needed later
});
  // Start the application
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
}
bootstrap();
