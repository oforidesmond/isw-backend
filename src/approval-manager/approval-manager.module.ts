import { forwardRef, Module } from '@nestjs/common';
import { ApprovalManagerService } from './approval-manager.service';
import { ApprovalManagerController } from './approval-manager.controller';
import { AuthModule } from 'auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'prisma/prisma.module';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { AuditModule } from 'audit/audit.module';
import { ItdApprovalManagerService } from 'itd-approval-manager/itd-approval-manager.service';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [
    PrismaModule, AuditModule
  ],
  controllers: [ApprovalManagerController],
  providers: [ApprovalManagerService,ItdApprovalManagerService,JwtAuthGuard, RolesGuard, PrismaService],
  exports: [ApprovalManagerService],
})
export class ApprovalManagerModule {}
