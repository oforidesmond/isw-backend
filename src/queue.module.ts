import { Module, Global } from '@nestjs/common';
// import { BullModule } from '@nestjs/bull';
// import { EmailProcessor } from 'email.processor';

@Global()
@Module({
  imports: [
    // BullModule.forRoot({
    //   redis: {
    //     host: process.env.REDIS_HOST || 'localhost',
    //     port: Number(process.env.REDIS_PORT) || 6379,
    //   },
    // }),
    // BullModule.registerQueue({
    //   name: 'email-queue',
    // }),
  ],
  // providers: [EmailProcessor],
  // exports: [BullModule],
})
export class QueueModule {}