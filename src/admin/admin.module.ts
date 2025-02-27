import { forwardRef, Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { RolesGuard } from 'auth/roles.guard';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { PrismaModule } from 'prisma/prisma.module';
import { AuthModule } from 'auth/auth.module';
import { JwtModule } from '@nestjs/jwt';


@Module({
  imports: [
    forwardRef(() => AuthModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '1h' },
    }),
    PrismaModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, JwtAuthGuard, RolesGuard],
  exports: [AdminService],
})
export class AdminModule {}
