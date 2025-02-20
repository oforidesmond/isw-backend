import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './users/user.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { SupervisorModule } from './supervisor/supervisor.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), 
    AuthModule, PrismaModule, UserModule, AdminModule, SupervisorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
