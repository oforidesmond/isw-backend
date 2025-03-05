import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from 'audit/audit.service';
import { Prisma } from '@prisma/client';
// import * as QRCode from 'qrcode';

@Injectable()
export class AdminService {
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

      // Create the user
      return this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
        data: {
          staffId: data.staffId,
          name: data.name,
          email: data.email,
          department: data.departmentId
            ? { connect: { id: data.departmentId } }
            : undefined,
          unit: data.unitId ? { connect: { id: data.unitId } } : undefined,
          roomNo: data.roomNo,
          password: hashedPassword,
          mustResetPassword: true,
        },
      });

      // Assign role to user
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      // Generate one-time login token
      const loginTokenPayload = {
        staffId: data.staffId,
        tempPassword: randomPassword,
        type: 'temp-login',
        sub: user.id,
      };
      const loginToken = this.jwtService.sign(loginTokenPayload, {
        expiresIn: '3 days',
      });
      const loginUrl = `http://localhost:3000/auth/login-with-token?token=${encodeURIComponent(
        loginToken,
      )}`;

      let emailFailed = false;
      // Send email with temp password
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
      } catch (error) {
        console.error(`Failed to send email to ${data.email}:`, error.message);
        emailFailed = true;
      }

      // Log USER_SIGNED_UP within transaction
      const newState: Prisma.JsonObject = {
        staffId: user.staffId,
        name: user.name,
        email: user.email,
        role: data.roleName,
      };
      // Log USER_SIGNED_UP
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
        { emailSent: !emailFailed },
        tx,
      );

      return {
        message:
          'User created' + (emailFailed ? '; email failed to send' : ' and emailed'),
        userId: user.id,
        tempPassword: randomPassword, // remove in prod
      };
    });
  }

  async getAllUsers() {
    return this.prisma.user.findMany();
  }

  async findByStaffId(staffId: string) {
    return this.prisma.user.findUnique({
      where: { staffId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}