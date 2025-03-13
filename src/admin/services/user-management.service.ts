import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from 'audit/audit.service';
import { CreateUserDto } from 'admin/dto/create-user.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class UserManagementService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async createUser(data: CreateUserDto, adminId: string, ipAddress?: string, userAgent?: string) {
    const randomPassword = crypto.randomBytes(5).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const role = await this.prisma.role.findUnique({
      where: { name: data.roleName },
    });

    if (!role) {
      throw new Error(`Role "${data.roleName}" does not exist`);
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          staffId: data.staffId,
          name: data.name,
          email: data.email,
          department: data.departmentId ? { connect: { id: data.departmentId } } : undefined,
          unit: data.unitId ? { connect: { id: data.unitId } } : undefined,
          roomNo: data.roomNo,
          password: hashedPassword,
          mustResetPassword: true,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      const loginTokenPayload = {
        staffId: data.staffId,
        tempPassword: randomPassword,
        type: 'temp-login',
        sub: user.id,
      };
      const loginToken = this.jwtService.sign(loginTokenPayload, { expiresIn: '3 days' });
      const loginUrl = `http://localhost:3001/login-with-token?token=${encodeURIComponent(loginToken)}`;

      try {
        await this.mailerService.sendMail({
            to: data.email,
            from: process.env.EMAIL_USER,
            subject: 'Welcome to ISW App',
            html: `
                <p>Hello ${data.name},</p>
                <p>Your account has been created.</p>
                <p>Click <a href="${loginUrl}">here</a> to log in and reset your password immediately. Please note that this link is only valid for the next 3 days.</p>
                <p>If you have any issues, please don't hesitate to contact us.</p>
                <p>Thanks,<br>ISW Team</p>
            `,
        });

        const newState: Prisma.JsonObject = {
            staffId: user.staffId,
            name: user.name,
            email: user.email,
            role: data.roleName,
        };

        await this.auditService.logAction(
            'USER_SIGNED_UP',
            adminId,
            user.id,
            'User',
            user.id,
            null,
            newState,
            ipAddress,
            userAgent,
            { emailSent: true }, 
            tx, 
        );

        return {
            message: 'User created and emailed',
            userId: user.id,
            tempPassword: randomPassword, 
        };
    } catch (error) {
        console.error(`Failed to send email to ${data.email}:`, error.message);

        const newState: Prisma.JsonObject = {
            staffId: user.staffId,
            name: user.name,
            email: user.email,
            role: data.roleName,
        };

        await this.auditService.logAction(
            'USER_SIGNED_UP',
            adminId,
            user.id,
            'User',
            user.id,
            null,
            newState,
            ipAddress,
            userAgent,
            { emailSent: false }, 
            tx, 
        );

        throw new BadRequestException('User created, but email failed to send.'); 
    }
});
}

  async softDeleteUser(staffId: string, adminId: string, ipAddress?: string, userAgent?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { staffId } });
      if (!user) {
        throw new NotFoundException(`User with staffId ${staffId} not found`);
      }
      if (user.deletedAt) {
        throw new BadRequestException(`User with staffId ${staffId} is already deleted`);
      }

      await tx.user.update({
        where: { staffId },
        data: { deletedAt: new Date() },
      });

      await tx.userRole.updateMany({
        where: { userId: user.id },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.updateMany({
        where: { performedById: user.id },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.updateMany({
        where: { affectedUserId: user.id },
        data: { deletedAt: new Date() },
      });

      const oldState: Prisma.JsonObject = {
        staffId: user.staffId,
        name: user.name,
        email: user.email,
      };
      await this.auditService.logAction(
        'USER_DELETED',
        adminId,
        user.id,
        'User',
        user.id,
        oldState,
        null,
        ipAddress,
        userAgent,
        { softDelete: true },
        tx,
      );

      return { message: `User ${staffId} soft-deleted successfully` };
    });
  }

  async restoreUser(staffId: string, adminId: string, ipAddress?: string, userAgent?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { staffId } });
      if (!user) {
        throw new NotFoundException(`User with staffId ${staffId} not found`);
      }
      if (!user.deletedAt) {
        throw new BadRequestException(`User with staffId ${staffId} is not deleted`);
      }

      const updatedUser = await tx.user.update({
        where: { staffId },
        data: { deletedAt: null },
      });

      const oldState: Prisma.JsonObject = {
        staffId: user.staffId,
        name: user.name,
        email: user.email,
        deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
      };
      const newState: Prisma.JsonObject = {
        staffId: user.staffId,
        name: user.name,
        email: user.email,
        deletedAt: null,
      };

      await this.auditService.logAction(
        'USER_RESTORED',
        adminId,
        user.id,
        'User',
        user.id,
        oldState,
        newState,
        ipAddress,
        userAgent,
        { softRestore: true },
        tx,
      );

      return { message: `User ${staffId} has been restored` };
    });
  }

  //permanent user deletion for testing
  async permanentlyDeleteUser(staffId: string, adminId: string, ipAddress?: string, userAgent?: string) {
    return this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { staffId } });
        if (!user) {
            throw new NotFoundException(`User with staffId ${staffId} not found`);
        }
        await tx.auditLog.deleteMany({ where: { performedById: user.id } });
        await tx.auditLog.deleteMany({ where: { affectedUserId: user.id } });

        await tx.user.delete({ where: { staffId } });

        return { message: `User ${staffId} permanently deleted successfully` };
    });
}

}