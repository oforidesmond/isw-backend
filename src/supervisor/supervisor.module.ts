import { forwardRef, Module } from '@nestjs/common';
import { SupervisorService } from './supervisor.service';
import { SupervisorController } from './supervisor.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { AuditModule } from 'audit/audit.module';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [
    PrismaModule, AuditModule
  ],
  controllers: [SupervisorController],
  providers: [SupervisorService,JwtAuthGuard, RolesGuard, PrismaService],
    exports: [SupervisorService],
})
export class SupervisorModule {}
