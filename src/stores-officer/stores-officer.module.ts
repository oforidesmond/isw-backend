import { forwardRef, Module } from '@nestjs/common';
import { StoresOfficerService } from './stores-officer.service';
import { StoresOfficerController } from './stores-officer.controller';
import { AuthModule } from 'auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'prisma/prisma.module';
import { RolesGuard } from 'auth/roles.guard';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { ApprovalManagerService } from 'approval-manager/approval-manager.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '1h' },
    }),
    PrismaModule,
  ],
  controllers: [StoresOfficerController],
  providers: [StoresOfficerService,JwtAuthGuard, RolesGuard],
    exports: [StoresOfficerService],
})
export class StoresOfficerModule {}
