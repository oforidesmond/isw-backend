// import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';
// import * as bcrypt from 'bcrypt';
// import * as crypto from 'crypto';
// import { CreateUserDto } from './dto/create-user.dto';
// import { MailerService } from '@nestjs-modules/mailer';
// import { JwtService } from '@nestjs/jwt';
// import { AuditService } from 'audit/audit.service';
// import { Prisma } from '@prisma/client';
// // import * as QRCode from 'qrcode';

// @Injectable()
// export class AdminService {
//   constructor(
//     private prisma: PrismaService,
//     private mailerService: MailerService,
//     private jwtService: JwtService,
//     private auditService: AuditService,
//   ) {}

//     //Create User
//   async createUser(data: CreateUserDto, adminId: string, ipAddress?: string, userAgent?: string) {
//     const randomPassword = crypto.randomBytes(5).toString('hex');
//     const hashedPassword = await bcrypt.hash(randomPassword, 10);

//     const role = await this.prisma.role.findUnique({
//       where: { name: data.roleName },
//     });

//     if (!role) {
//       throw new Error(`Role "${data.roleName}" does not exist`);
//     }

//       // Create the user
//       return this.prisma.$transaction(async (tx) => {
//         const user = await tx.user.create({
//         data: {
//           staffId: data.staffId,
//           name: data.name,
//           email: data.email,
//           department: data.departmentId
//             ? { connect: { id: data.departmentId } }
//             : undefined,
//           unit: data.unitId ? { connect: { id: data.unitId } } : undefined,
//           roomNo: data.roomNo,
//           password: hashedPassword,
//           mustResetPassword: true,
//         },
//       });

//       // Assign role to user
//       await tx.userRole.create({
//         data: {
//           userId: user.id,
//           roleId: role.id,
//         },
//       });

//       // Generate one-time login token
//       const loginTokenPayload = {
//         staffId: data.staffId,
//         tempPassword: randomPassword,
//         type: 'temp-login',
//         sub: user.id,
//       };
//       const loginToken = this.jwtService.sign(loginTokenPayload, {
//         expiresIn: '3 days',
//       });
//       const loginUrl = `http://localhost:3001/login-with-token?token=${encodeURIComponent(
//         loginToken,
//       )}`;

//       let emailFailed = false;
//       // Send email with temp password
//       try {
//         await this.mailerService.sendMail({
//           to: data.email,
//           from: process.env.EMAIL_USER,
//           subject: 'Welcome to ISW App',
//           html: `
//             <p>Hello ${data.name},</p>
//             <p>Your account has been created.</p>
//             <p>Click <a href="${loginUrl}">here</a> to log in and reset your password immediately. Please note that this link is only valid for the next 3 days.</p>
//             <p>If you have any issues, please don't hesitate to contact us.</p>
//             <p>Thanks,<br>ISW Team</p>
//           `,
//         });
//       } catch (error) {
//         console.error(`Failed to send email to ${data.email}:`, error.message);
//         emailFailed = true;
//       }

//       // Log USER_SIGNED_UP within transaction
//       const newState: Prisma.JsonObject = {
//         staffId: user.staffId,
//         name: user.name,
//         email: user.email,
//         role: data.roleName,
//       };
//       // Log USER_SIGNED_UP
//       await this.auditService.logAction(
//         'USER_SIGNED_UP',
//         adminId,
//         user.id,
//         'User',
//         user.id,
//         null,
//         newState,
//         ipAddress,
//         userAgent,
//         { emailSent: !emailFailed },
//         tx,
//       );

//       return {
//         message:
//           'User created' + (emailFailed ? '; email failed to send' : ' and emailed'),
//         userId: user.id,
//         tempPassword: randomPassword, // remove in prod
//       };
//     });
//   }

//   //get all active users
//   async getAllUsers() {
//     return this.prisma.user.findMany({
//       where: { deletedAt: null }, // Only active users
//       select: {
//         id: true,
//         staffId: true,
//         email: true,
//         name: true,
//         department: { select: { id: true, name: true } },
//         unit: { select: { id: true, name: true } },
//         roomNo: true,
//         roles: {
//           select: {
//             role: { select: { id: true, name: true } },
//           },
//         },
//         createdAt: true,
//         updatedAt: true,
//       },
//     });
//   }

//   //get all soft deleted users
//   async getAllDeletedUsers() {
//     return this.prisma.user.findMany({
//       where: { deletedAt: { not: null } }, // Only soft-deleted users
//       select: {
//         id: true,
//         staffId: true,
//         email: true,
//         name: true,
//         department: { select: { id: true, name: true } },
//         unit: { select: { id: true, name: true } },
//         roomNo: true,
//         roles: {
//           select: {
//             role: { select: { id: true, name: true } },
//           },
//         },
//         deletedAt: true,
//         createdAt: true,
//         updatedAt: true,
//       },
//     });
//   }

//   async findByStaffId(staffId: string) {
//     return this.prisma.user.findUnique({
//       where: { staffId },
//       include: {
//         roles: {
//           include: {
//             role: {
//               include: {
//                 permissions: {
//                   include: {
//                     permission: true,
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     });
//   };

//   //Delete User

//   async softDeleteUser(staffId: string, adminId: string, ipAddress?: string, userAgent?: string) {
//     return this.prisma.$transaction(async (tx) => {
//       // Find the user to soft-delete
//       const user = await tx.user.findUnique({
//         where: { staffId },
//       });
  
//       if (!user) {
//         throw new NotFoundException(`User with staffId ${staffId} not found`);
//       }

//       if (user.deletedAt) {
//         throw new BadRequestException(`User with staffId ${staffId} is already deleted`);
//       }
  
//       // Soft-delete the user
//       await tx.user.update({
//         where: { staffId },
//         data: {
//           deletedAt: new Date(), // Set the deletedAt timestamp
//         },
//       });
  
//       // Soft-delete related user roles
//       await tx.userRole.updateMany({
//         where: { userId: user.id },
//         data: {
//           deletedAt: new Date(),
//         }
//       });
  
//       // Soft-delete related audit logs where the user is the one who performed the action.
//       await tx.auditLog.updateMany({
//         where: { performedById: user.id },
//         data: { deletedAt: new Date() }
//       });
  
//       // Soft-delete related audit logs where the user is the affected user.
//       await tx.auditLog.updateMany({
//         where: { affectedUserId: user.id },
//         data: { deletedAt: new Date() }
//       });
  
//       // Log the action
//       const oldState: Prisma.JsonObject = {
//         staffId: user.staffId,
//         name: user.name,
//         email: user.email,
//       };
//       await this.auditService.logAction(
//         'USER_DELETED',
//         adminId,
//         user.id,
//         'User',
//         user.id,
//         oldState,
//         null,
//         ipAddress,
//         userAgent,
//         {softDelete: true},
//         tx,
//       );
  
//       return { message: `User ${staffId} soft-deleted successfully` };
//     });
//   }

//   //undelete user
//   async restoreUser(staffId: string, adminId: string, ipAddress?: string, userAgent?: string) {
//     return this.prisma.$transaction(async (tx) => {
//       const user = await tx.user.findUnique({
//         where: { staffId },
//       });
  
//       if (!user) {
//         throw new NotFoundException(`User with staffId ${staffId} not found`);
//       }
  
//       if (!user.deletedAt) {
//         throw new BadRequestException(`User with staffId ${staffId} is not deleted`);
//       }
  
//       const updatedUser = await tx.user.update({
//         where: { staffId },
//         data: { deletedAt: null },
//       });
  
//       const oldState: Prisma.JsonObject = {
//         staffId: user.staffId,
//         name: user.name,
//         email: user.email,
//         deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
//       };
//       const newState: Prisma.JsonObject = {
//         staffId: user.staffId,
//         name: user.name,
//         email: user.email,
//         deletedAt: null,
//       };
  
//       await this.auditService.logAction(
//         'USER_RESTORED',
//         adminId,
//         user.id,
//         'User',
//         user.id,
//         oldState,
//         newState,
//         ipAddress,
//         userAgent,
//         { softRestore: true },
//         tx
//       );
  
//       return { message: `User ${staffId} has been restored` };
//     });
//   }
// }