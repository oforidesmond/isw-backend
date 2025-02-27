import { Module } from '@nestjs/common';
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

@Module({
  imports: [ ConfigModule.forRoot({
    envFilePath: 'C:/Users/Admin/Documents/ISW/isw-backend/.env', // Match your test path
    isGlobal: true, // Makes env vars available everywhere
  }), 

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

    AuthModule, PrismaModule, UserModule, AdminModule, SupervisorModule, ItdApprovalManagerModule, ApprovalManagerModule, StoresOfficerModule, InventoryOfficerModule, HardwareTechnicianModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
