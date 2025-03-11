import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MailerModule, MailerTransportFactory } from '@nestjs-modules/mailer';
import * as nodemailer from 'nodemailer';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './users/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { SupervisorModule } from './supervisor/supervisor.module';
import { ItdApprovalManagerModule } from './itd-approval-manager/itd-approval-manager.module';
import { ApprovalManagerModule } from './approval-manager/approval-manager.module';
import { StoresOfficerModule } from './stores-officer/stores-officer.module';
import { InventoryOfficerModule } from './inventory-officer/inventory-officer.module';
import { HardwareTechnicianModule } from './hardware-technician/hardware-technician.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [ ConfigModule.forRoot({
    envFilePath: 'C:/Users/Admin/Documents/ISW/isw-backend/.env',
    isGlobal: true, 
  }), 
  EventEmitterModule.forRoot(),

     // MailerModule for sending emails
     MailerModule.forRoot({
      transport: {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      },
    }),

    AuthModule, UserModule, PrismaModule, UserModule, AdminModule, SupervisorModule, ItdApprovalManagerModule, ApprovalManagerModule, StoresOfficerModule, InventoryOfficerModule, HardwareTechnicianModule, AuditModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
