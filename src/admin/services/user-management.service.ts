import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from 'audit/audit.service';
import { CreateUserDto } from 'admin/dto/create-user.dto';
import { PrismaService } from 'prisma/prisma.service';
import { UpdateUserDto } from 'admin/dto/update-user.dto';
import { AuditPayload } from 'admin/interfaces/audit-payload.interface';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CreateDepartmentDto } from 'admin/dto/create-department.dto';
import { CreateUnitDto } from 'admin/dto/create-unit.dto';

interface ExtendedAuditPayload extends AuditPayload {
  details: {
    departmentName: string;
    emailsQueued: {
      approver: boolean;
    };
  };
}

@Injectable()
export class UserManagementService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async getAllDepartments(includeUnits: boolean = false) {
    return this.prisma.department.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        location: true,
        createdAt: true,
        updatedAt: true,
        ...(includeUnits && {
          units: {
            select: {
              id: true,
              name: true,
            },
            where: {
              deletedAt: null,
            },
          },
        }),
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async createDepartment(
    data: CreateDepartmentDto,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existingDepartment = await this.prisma.department.findFirst({
      where: { name: data.name },
    });

    if (existingDepartment) {
      throw new BadRequestException('Department name already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const department = await tx.department.create({
        data: {
          name: data.name,
          location: data.location,
        },
      });

      const newState: Prisma.JsonObject = {
        name: department.name,
        location: department.location,
      };

      const auditPayload: AuditPayload = {
        actionType: 'DEPARTMENT_CREATED',
        performedById: adminId,
        affectedUserId: null,
        entityType: 'Department',
        entityId: department.id,
        oldState: null,
        newState,
        ipAddress,
        userAgent,
        details: { createdBy: adminId },
      };

      await this.auditService.logAction(auditPayload, tx);

      return {
        message: 'Department created successfully',
        departmentId: department.id,
      };
    });
  }

  async getAllUnits() {
    return this.prisma.unit.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: 'asc', 
      },
    });
  }

  async createUnit(
    data: CreateUnitDto,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {

    const existingUnit = await this.prisma.unit.findUnique({
      where: { name: data.name },
    });

    if (existingUnit) {
      throw new BadRequestException('Unit name already exists');
    }

    const department = await this.prisma.department.findUnique({
      where: { id: data.departmentId },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${data.departmentId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const unit = await tx.unit.create({
        data: {
          name: data.name,
          department: {
            connect: { id: data.departmentId },
          },
        },
      });
      const newState: Prisma.JsonObject = {
        name: unit.name,
        departmentId: data.departmentId,
      };

      const auditPayload: AuditPayload = {
        actionType: 'UNIT_CREATED',
        performedById: adminId,
        affectedUserId: null,
        entityType: 'Unit',
        entityId: unit.id,
        oldState: null,
        newState,
        ipAddress,
        userAgent,
        details: { createdBy: adminId },
      };

      await this.auditService.logAction(auditPayload, tx);

      return {
        message: 'Unit created successfully',
        unitId: unit.id,
      };
    });
  }

   async softDeleteDepartment(
    departmentId: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const department = await tx.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        throw new NotFoundException(`Department with ID ${departmentId} not found`);
      }

      if (department.deletedAt) {
        throw new BadRequestException(`Department with ID ${departmentId} is already deleted`);
      }

      await tx.department.update({
        where: { id: departmentId },
        data: { deletedAt: new Date() },
      });

      await tx.unit.updateMany({
        where: { departmentId: departmentId, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      const oldState: Prisma.JsonObject = {
        name: department.name,
        location: department.location,
      };

      const auditPayload: AuditPayload = {
        actionType: 'DEPARTMENT_DELETED',
        performedById: adminId,
        affectedUserId: null,
        entityType: 'Department',
        entityId: department.id,
        oldState,
        newState: null,
        ipAddress,
        userAgent,
        details: { softDelete: true },
      };

      await this.auditService.logAction(auditPayload, tx);

      return { message: `Department ${department.name} soft-deleted successfully` };
    });
  }

  async softDeleteUnit(
    unitId: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const unit = await tx.unit.findUnique({
        where: { id: unitId },
        include: { department: { select: { id: true, name: true } } },
      });

      if (!unit) {
        throw new NotFoundException(`Unit with ID ${unitId} not found`);
      }

      if (unit.deletedAt) {
        throw new BadRequestException(`Unit with ID ${unitId} is already deleted`);
      }

      await tx.unit.update({
        where: { id: unitId },
        data: { deletedAt: new Date() },
      });

      const oldState: Prisma.JsonObject = {
        name: unit.name,
        departmentId: unit.departmentId,
        departmentName: unit.department.name,
      };

      const auditPayload: AuditPayload = {
        actionType: 'UNIT_DELETED',
        performedById: adminId,
        affectedUserId: null,
        entityType: 'Unit',
        entityId: unit.id,
        oldState,
        newState: null,
        ipAddress,
        userAgent,
        details: { softDelete: true },
      };

      await this.auditService.logAction(auditPayload, tx);

      return { message: `Unit ${unit.name} soft-deleted successfully` };
    });
  }

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
  
      let emailQueued = false;
      try {
        await this.emailQueue.add(
          'send-email',
          {
            to: data.email,
            subject: 'Welcome to ISW App',
            html: `
              <p>Hello ${data.name},</p>
              <p>Your account has been created.</p>
              <p>Click <a href="${loginUrl}">here</a> to log in and reset your password immediately. Please note that this link is only valid for the next 3 days.</p>
              <p>If you have any issues, please don't hesitate to contact us.</p>
              <p>Thanks,<br>ISW Team</p>
            `,
          },
          { attempts: 3, backoff: 5000 },
        );
        emailQueued = true;
      } catch (error) {
        console.error(`Failed to queue email for ${data.email}:`, error.message);
        emailQueued = false;
      }
  
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
        details: { emailSent: emailQueued },
      };
  
      await this.auditService.logAction(auditPayload, tx);
  
      if (!emailQueued) {
        throw new BadRequestException('User created, but email failed to queue.');
      }
  
      return {
        message: 'User created and email queued',
        userId: user.id,
        tempPassword: randomPassword, // Remove in prod
      };
    });
  }

  //softdelete usr
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

  async resetPassword(staffId: string, adminId: string, ipAddress?: string, userAgent?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { staffId } });
      if (!user) throw new NotFoundException(`User with staffId ${staffId} not found`);
      if (user.deletedAt) throw new BadRequestException(`User with staffId ${staffId} is deleted`);
      if (!user.isActive) throw new BadRequestException(`User with staffId ${staffId} is inactive`);

      const tempPassword = crypto.randomBytes(5).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const updatedUser = await tx.user.update({
        where: { staffId },
        data: {
          password: hashedPassword,
          mustResetPassword: true,
        },
      });

      const loginTokenPayload = {
        staffId: user.staffId,
        tempPassword,
        type: 'temp-login',
        sub: user.id,
      };
      const loginToken = this.jwtService.sign(loginTokenPayload, { expiresIn: '3d' });
      const loginUrl = `http://localhost:3001/login-with-token?token=${encodeURIComponent(loginToken)}`;

      let emailQueued = false;
      try {
        await this.emailQueue.add(
          'send-email',
          {
            to: user.email,
            subject: 'Account Password Reset',
            html: `
              <p>Hello ${user.name || 'User'},</p>
              <p>An admin has reset your password.</p>
              <p>Click <a href="${loginUrl}">here</a> to log in with your temporary password and reset it. This link expires in 3 days.</p>
              <p>If you didn’t request this, contact support immediately.</p>
              <p>Thanks,<br>ISW Team</p>
            `,
          },
          { attempts: 3, backoff: 5000 },
        );
        emailQueued = true;
      } catch (error) {
        console.error(`Failed to queue email for ${user.email}:`, error.message);
        emailQueued = false;
      }
  
      const auditPayload: AuditPayload = {
        actionType: 'USER_PASSWORD_RESET',
        performedById: adminId,
        affectedUserId: user.id,
        entityType: 'User',
        entityId: user.id,
        oldState: null,
        newState: { staffId: user.staffId, email: user.email, mustResetPassword: true },
        ipAddress,
        userAgent,
        details: { emailSent: emailQueued },
      };
  
      await this.auditService.logAction(auditPayload, tx);
  
      return {
        message: `Password for user ${staffId} has been reset${emailQueued ? ' and email queued' : '; email failed to queue'}`,
        tempPassword, // Remove in prod
      };
    });
  }

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

  async assignDeptApprover(
    staffId: string,
    departmentId: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { staffId },
        select: { id: true, deptApproverFor: true, isActive: true, email: true, name: true },
      });
      if (!user) throw new NotFoundException(`User with staffId ${staffId} not found`);
      if (!user.isActive) throw new BadRequestException(`User with staffId ${staffId} is not active`);

      if (user.deptApproverFor) {
        throw new BadRequestException(
          `User ${staffId} is already the department approver for ${user.deptApproverFor.name}`,
        );
      }

      const department = await tx.department.findUnique({
        where: { id: departmentId },
        select: { id: true, name: true, deptApproverId: true },
      });
      if (!department) throw new NotFoundException(`Department with id ${departmentId} not found`);

      const updatedDepartment = await tx.department.update({
        where: { id: departmentId },
        data: { deptApproverId: user.id },
      });

      const oldState: Prisma.JsonObject = { deptApproverId: department.deptApproverId || null };
      const newState: Prisma.JsonObject = { deptApproverId: user.id };

      const auditPayload: ExtendedAuditPayload = {
        actionType: 'USER_UPDATED',
        performedById: adminId,
        affectedUserId: user.id,
        entityType: 'Department',
        entityId: departmentId,
        oldState,
        newState,
        ipAddress,
        userAgent,
        details: { departmentName: department.name, emailsQueued: { approver: false } },
      };

      try {
        await this.emailQueue.add(
          'send-email',
          {
            to: user.email,
            subject: `Assigned as Department Requisitions Approver for ${department.name}`,
            html: `
              <p>Hello ${user.name},</p>
              <p>You have been assigned as the Department Requisitions Approver for ${department.name.toUpperCase()}.</p>
              <p>You will now be responsible for approving or declining requisitions for this department.</p>
              <p>If you have any questions, please contact the admin team.</p>
              <p>Thanks,<br>ISW Team</p>
            `,
          },
          { attempts: 3, backoff: 5000 },
        );
        auditPayload.details.emailsQueued.approver = true;
      } catch (error) {
        console.error(`Failed to queue email for ${user.email}:`, error.message);
        auditPayload.details.emailsQueued.approver = false;
      }

      await this.auditService.logAction(auditPayload, tx);

      if (!auditPayload.details.emailsQueued.approver) {
        throw new BadRequestException(
          `User ${staffId} assigned as department approver for ${department.name}, but email failed to queue`,
        );
      }

      return {
        message: `User ${staffId} assigned as department approver for ${department.name} and email queued`,
      };
    });
  }
}