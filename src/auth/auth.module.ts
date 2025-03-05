import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from 'users/user.module';
import { ConfigModule } from '@nestjs/config';
import { LocalStrategy } from './local.strategy';
import { PrismaService } from 'prisma/prisma.service';
import { UserService } from 'users/user.service';
import { AuditService } from 'audit/audit.service';

@Module({
  imports: [
    ConfigModule,
    ConfigModule.forRoot(),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '1h' },
    }),
    forwardRef(() => UserModule),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PrismaService, LocalStrategy, UserService, AuditService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
