import { forwardRef, Module } from '@nestjs/common';
// import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { RolesGuard } from 'auth/roles.guard';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { PrismaModule } from 'prisma/prisma.module';
import { AuthModule } from 'auth/auth.module';
// import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuditService } from 'audit/audit.service';
import { UserManagementService } from './services/user-management.service';
import { UserQueryService } from './services/user-query.service';
import { PrismaService } from 'prisma/prisma.service';
import { AuditModule } from 'audit/audit.module';
// import { MailerService } from '@nestjs-modules/mailer';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    PrismaModule,
    AuditModule
  ],
  controllers: [AdminController],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    AuditService,
    UserManagementService,
    UserQueryService,
    PrismaService,
  ],
})
export class AdminModule {}
