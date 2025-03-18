import { forwardRef, Module } from '@nestjs/common';
import { ItdApprovalManagerService } from './itd-approval-manager.service';
import { ItdApprovalManagerController } from './itd-approval-manager.controller';
import { AuthModule } from 'auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'prisma/prisma.module';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { AuditModule } from 'audit/audit.module';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [
    AuditModule,
    PrismaModule,
  ],
  controllers: [ItdApprovalManagerController],
  providers: [ItdApprovalManagerService,JwtAuthGuard, RolesGuard, PrismaService],
    exports: [ItdApprovalManagerService],
})
export class ItdApprovalManagerModule {}
