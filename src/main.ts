import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
 const port = configService.get<number>('PORT') || 3000;

  // Start the application
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
}
bootstrap();
