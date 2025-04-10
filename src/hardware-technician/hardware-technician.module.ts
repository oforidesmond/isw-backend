import { forwardRef, Module } from '@nestjs/common';
import { HardwareTechnicianService } from './hardware-technician.service';
import { HardwareTechnicianController } from './hardware-technician.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { AuditModule } from 'audit/audit.module';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [
    PrismaModule, AuditModule
  ],
  controllers: [HardwareTechnicianController],
  providers: [HardwareTechnicianService,JwtAuthGuard, RolesGuard, PrismaService],
    exports: [HardwareTechnicianService],
})
export class HardwareTechnicianModule {}
