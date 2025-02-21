import { forwardRef, Module } from '@nestjs/common';
import { HardwareTechnicianService } from './hardware-technician.service';
import { HardwareTechnicianController } from './hardware-technician.controller';
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
  controllers: [HardwareTechnicianController],
  providers: [HardwareTechnicianService,JwtAuthGuard, RolesGuard],
    exports: [HardwareTechnicianService],
})
export class HardwareTechnicianModule {}
