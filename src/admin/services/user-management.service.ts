import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from 'audit/audit.service';
import { CreateUserDto } from 'admin/dto/create-user.dto';
import { PrismaService } from 'prisma/prisma.service';
import { UpdateUserDto } from 'admin/dto/update-user.dto';
import { AuditPayload } from 'admin/interfaces/audit-payload.interface';

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
        } as Prisma.UserRoleUncheckedCreateInput,
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

        const auditPayload: AuditPayload = {
          actionType: 'USER_SIGNED_UP',
          performedById: adminId,
          affectedUserId: user.id,
         entityType: 'User',
         entityId: user.id,
         oldState: null,
         newState,
         ipAddress,
         userAgent,
         details: { emailSent: true }, 
     };
     await this.auditService.logAction(auditPayload, tx);

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

        const auditPayload: AuditPayload = {
             actionType: 'USER_SIGNED_UP',
             performedById: adminId,
             affectedUserId: user.id,
            entityType: 'User',
            entityId: user.id,
            oldState: null,
            newState,
            ipAddress,
            userAgent,
            details: { emailSent: false }, 
        };
        await this.auditService.logAction(auditPayload, tx);
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
      const auditPayload: AuditPayload = {
        actionType:'USER_DELETED',
        performedById: adminId,
        affectedUserId: user.id,
        entityType:'User',
        entityId: user.id,
        oldState,
        newState: null,
        ipAddress,
        userAgent,
        details: { softDelete: true },
      };

      await this.auditService.logAction(auditPayload, tx);
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

      const auditPayload: AuditPayload = {
         actionType: 'USER_RESTORED',
         performedById: adminId,
         affectedUserId: user.id,
         entityType: 'User',
         entityId: user.id,
        oldState,
        newState,
        ipAddress,
        userAgent,
        details: { softRestore: true },
        tx,
      };

      await this.auditService.logAction(auditPayload, tx);
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

  //Update User Details
  async updateUser(staffId: string, data: UpdateUserDto, adminId: string, ipAddress?: string, userAgent?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { staffId },
        include: { roles: { include: { role: true } } },
      });
      if (!user) throw new NotFoundException(`User with staffId ${staffId} not found`);
      if (user.deletedAt) throw new BadRequestException(`User with staffId ${staffId} is deleted`);
  
      const oldState: Prisma.JsonObject = {
        staffId: user.staffId,
        name: user.name,
        email: user.email,
        departmentId: user.departmentId,
        unitId: user.unitId,
        roomNo: user.roomNo,
        roleName: user.roles[0]?.role.name,
      };
  
      const updatedUser = await tx.user.update({
        where: { staffId },
        data: {
          name: data.name,
          email: data.email,
          departmentId: data.departmentId,
          unitId: data.unitId,
          roomNo: data.roomNo,
        },
      });
  
      if (data.roleName && data.roleName !== user.roles[0]?.role.name) {
        const role = await tx.role.findUnique({ where: { name: data.roleName } });
        if (!role) throw new BadRequestException(`Role "${data.roleName}" does not exist`);
        await tx.userRole.deleteMany({ where: { userId: user.id } });
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
          } as Prisma.UserRoleUncheckedCreateInput, 
        });
      }
  
      const newState: Prisma.JsonObject = {
        staffId: updatedUser.staffId,
        name: updatedUser.name,
        email: updatedUser.email,
        departmentId: updatedUser.departmentId,
        unitId: updatedUser.unitId,
        roomNo: updatedUser.roomNo,
        roleName: data.roleName || user.roles[0]?.role.name,
      };
  
      const auditPayload: AuditPayload = {
        actionType: 'USER_UPDATED',
        performedById: adminId,
        affectedUserId: user.id,
        entityType: 'User',
        entityId: user.id,
        oldState,
        newState,
        ipAddress,
        userAgent,
        details: { roleChanged: !!data.roleName },
      };
  
      await this.auditService.logAction(auditPayload, tx);
  
      return { message: `User ${staffId} updated successfully` };
    });
  }

  //Manually Reset user password
  async resetPassword(staffId: string, adminId: string, ipAddress?: string, userAgent?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { staffId } });
      if (!user) throw new NotFoundException(`User with staffId ${staffId} not found`);
      if (user.deletedAt) throw new BadRequestException(`User with staffId ${staffId} is deleted`);
      if (!user.isActive) throw new BadRequestException(`User with staffId ${staffId} is inactive`);

      // Generate a new temporary password
      const tempPassword = crypto.randomBytes(5).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Update user's password and set mustResetPassword
      const updatedUser = await tx.user.update({
        where: { staffId },
        data: {
          password: hashedPassword,
          mustResetPassword: true,
        },
      });

      // Generate a temp login token
      const loginTokenPayload = {
        staffId: user.staffId,
        tempPassword,
        type: 'temp-login',
        sub: user.id,
      };
      const loginToken = this.jwtService.sign(loginTokenPayload, { expiresIn: '3d' });
      const loginUrl = `http://localhost:3001/login-with-token?token=${encodeURIComponent(loginToken)}`;

      let emailFailed = false;
      try {
        await this.mailerService.sendMail({
          to: user.email,
          from: process.env.EMAIL_USER,
          subject: 'Account Password Reset',
          html: `
            <p>Hello ${user.name || 'User'},</p>
            <p>An admin has reset your password.</p>
            <p>Click <a href="${loginUrl}">here</a> to log in with your temporary password and reset it. This link expires in 3 days.</p>
            <p>If you didn’t request this, contact support immediately.</p>
            <p>Thanks,<br>ISW Team</p>
          `,
        });
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error.message);
        emailFailed = true;
      }

      const auditPayload: AuditPayload = {
        actionType: 'USER_PASSWORD_RESET',
        performedById: adminId,
        affectedUserId: user.id,
        entityType: 'User',
        entityId: user.id,
        oldState: null, // No old password tracking for security
        newState: { staffId: user.staffId, email: user.email, mustResetPassword: true },
        ipAddress,
        userAgent,
        details: { emailSent: !emailFailed },
      };

      await this.auditService.logAction(auditPayload, tx);

      return {
        message: `Password for user ${staffId} has been reset${emailFailed ? '; email failed to send' : ' and emailed'}`,
        tempPassword, // Remove in prod
      };
    });
  }

  // toggle activeStatus of User
  async toggleStatus(staffId: string, isActive: boolean, adminId: string, ipAddress?: string, userAgent?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { staffId } });
      if (!user) throw new NotFoundException(`User with staffId ${staffId} not found`);
      if (user.deletedAt) throw new BadRequestException(`User with staffId ${staffId} is deleted`);
      if (user.isActive === isActive) throw new BadRequestException(`User with staffId ${staffId} is already ${isActive ? 'active' : 'inactive'}`);

      const oldState: Prisma.JsonObject = {
        staffId: user.staffId,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      };

      const updatedUser = await tx.user.update({
        where: { staffId },
        data: { isActive },
      });

      const newState: Prisma.JsonObject = {
        staffId: updatedUser.staffId,
        name: updatedUser.name,
        email: updatedUser.email,
        isActive: updatedUser.isActive,
      };

      const auditPayload: AuditPayload = {
        actionType: 'USER_STATUS_CHANGED',
        performedById: adminId,
        affectedUserId: user.id,
        entityType: 'User',
        entityId: user.id,
        oldState,
        newState,
        ipAddress,
        userAgent,
        details: { status: isActive ? 'activated' : 'deactivated' },
      };

      await this.auditService.logAction(auditPayload, tx);

      return { message: `User ${staffId} has been ${isActive ? 'activated' : 'deactivated'}` };
    });
  }
}