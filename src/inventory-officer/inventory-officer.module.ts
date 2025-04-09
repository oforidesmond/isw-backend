import { forwardRef, Module } from '@nestjs/common';
import { InventoryOfficerService } from './inventory-officer.service';
import { InventoryOfficerController } from './inventory-officer.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { PrismaService } from 'prisma/prisma.service';
import { AuditModule } from 'audit/audit.module';

@Module({
  imports: [AuditModule, PrismaModule],
  controllers: [InventoryOfficerController],
  providers: [InventoryOfficerService,JwtAuthGuard, RolesGuard, PrismaService],
    exports: [InventoryOfficerService],
})
export class InventoryOfficerModule {}
