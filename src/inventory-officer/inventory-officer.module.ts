import { forwardRef, Module } from '@nestjs/common';
import { InventoryOfficerService } from './inventory-officer.service';
import { InventoryOfficerController } from './inventory-officer.controller';
import { AuthModule } from 'src/auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '1h' },
    }),
    PrismaModule,
  ],
  controllers: [InventoryOfficerController],
  providers: [InventoryOfficerService,JwtAuthGuard, RolesGuard],
    exports: [InventoryOfficerService],
})
export class InventoryOfficerModule {}
