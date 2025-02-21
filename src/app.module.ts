import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './users/user.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { SupervisorModule } from './supervisor/supervisor.module';
import { ItdApprovalManagerModule } from './itd-approval-manager/itd-approval-manager.module';
import { ApprovalManagerModule } from './approval-manager/approval-manager.module';
import { StoresOfficerModule } from './stores-officer/stores-officer.module';
import { InventoryOfficerModule } from './inventory-officer/inventory-officer.module';
import { HardwareTechnicianModule } from './hardware-technician/hardware-technician.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), 
    AuthModule, PrismaModule, UserModule, AdminModule, SupervisorModule, ItdApprovalManagerModule, ApprovalManagerModule, StoresOfficerModule, InventoryOfficerModule, HardwareTechnicianModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
