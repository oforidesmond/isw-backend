import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UserService } from './user.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { AuthService } from 'auth/auth.service';
import { AuthModule } from 'auth/auth.module';
import { AuditService } from 'audit/audit.service';
import { PrismaService } from 'prisma/prisma.service';
import { RolesGuard } from 'auth/roles.guard';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '1h' },
    }),
    PrismaModule
  ],
  controllers: [UserController],
  providers: [UserService, JwtAuthGuard, AuthService, AuditService, PrismaService, RolesGuard],
  exports: [UserService],
})
export class UserModule {}
