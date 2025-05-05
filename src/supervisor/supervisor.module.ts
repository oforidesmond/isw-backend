import { forwardRef, Module } from '@nestjs/common';
import { SupervisorService } from './supervisor.service';
import { SupervisorController } from './supervisor.controller';
import { AuthModule } from 'auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'prisma/prisma.module';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { PrismaService } from 'prisma/prisma.service';
import { AuditModule } from 'audit/audit.module';

@Module({
  imports: [
    PrismaModule, AuditModule
  ],
  controllers: [SupervisorController],
  providers: [SupervisorService,JwtAuthGuard, RolesGuard, PrismaService],
    exports: [SupervisorService],
})
export class SupervisorModule {}
