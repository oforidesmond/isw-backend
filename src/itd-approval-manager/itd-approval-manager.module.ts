import { forwardRef, Module } from '@nestjs/common';
import { ItdApprovalManagerService } from './itd-approval-manager.service';
import { ItdApprovalManagerController } from './itd-approval-manager.controller';
import { AuthModule } from 'auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'prisma/prisma.module';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '1h' },
    }),
    PrismaModule,
  ],
  controllers: [ItdApprovalManagerController],
  providers: [ItdApprovalManagerService,JwtAuthGuard, RolesGuard],
    exports: [ItdApprovalManagerService],
})
export class ItdApprovalManagerModule {}
