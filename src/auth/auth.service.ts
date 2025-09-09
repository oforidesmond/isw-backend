import { BadRequestException, forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma.service';
import { UserService } from 'users/user.service';
import { AuditService } from 'audit/audit.service';
import { AuditPayload } from 'admin/interfaces/audit-payload.interface';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

interface BaseJwtPayload {
  sub: string;
  type?: string;
}

interface LoginJwtPayload extends BaseJwtPayload {
  staffId: string;
  roles: string[];
  permissions: { resource: string; actions: string[] }[];
  mustResetPassword: boolean;
}

interface TempLoginJwtPayload extends BaseJwtPayload {
  staffId: string;
  tempPassword: string;
  type: 'temp-login';
}

interface ResetPasswordJwtPayload extends BaseJwtPayload {
  type: 'reset-password';
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

  private readonly securityQuestions = [
    "What was the name of your first pet?",
    "What was the name of your childhood best friend?",
    "What is your favorite food?",
  ];

  async validateUser(staffId: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { staffId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async login(user: any, ipAddress?: string, userAgent?: string) {
    return this.prisma.$transaction(async (tx) => {
      const roles = user.roles.map((userRole) => userRole.role.name);
      const permissions = user.roles.flatMap((userRole) =>
        userRole.role.permissions.map((rp) => ({
          resource: rp.permission.resource,
          actions: rp.permission.actions,
        })),
      );

      const payload: LoginJwtPayload = {
        sub: user.id,
        staffId: user.staffId,
        roles,
        permissions,
        mustResetPassword: user.mustResetPassword,
      };

      const auditPayload: AuditPayload = {
        actionType:'USER_SIGNED_IN',
        performedById: user.id,
        affectedUserId: user.id,
        entityType: 'User',
        entityId: user.id,
        oldState: null,
        newState: null,
        ipAddress,
        userAgent,
      };
      await this.auditService.logAction(auditPayload, tx);
      return {
        access_token: this.jwtService.sign(payload),
        mustResetPassword: user.mustResetPassword,
        securityQuestion: user.mustResetPassword ? null : user.securityQuestion,
      };
    });
  }

  async loginWithToken(token: string, ipAddress?: string, userAgent?: string) {
    let decoded: TempLoginJwtPayload;
    try {
      decoded = this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired login token');
    }

    if (decoded.type !== 'temp-login') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.validateUser(decoded.staffId, decoded.tempPassword);

    return this.prisma.$transaction(async (tx) => {
      const auditPayload: AuditPayload = {
        actionType:'USER_SIGNED_IN',
        performedById: user.id,
        affectedUserId: user.id,
        entityType: 'User',
        entityId: user.id,
        oldState: null,
        newState: null,
        ipAddress,
        userAgent,
        details: { viaTempToken: true },
      };
      await this.auditService.logAction(auditPayload, tx);
      return this.login(user, ipAddress, userAgent);
    });
  }

  async resetPassword(
    userId: string,
    newPassword: string,
    securityQuestion?: string,
    securityAnswer?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { mustResetPassword: true, password: true },
      });

      if (!user || !user.mustResetPassword) {
        throw new UnauthorizedException('Password reset already performed on this account');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updateData: any = {
        password: hashedPassword,
        mustResetPassword: false,
      };

      if (securityQuestion && securityAnswer) {
        if (!this.securityQuestions.includes(securityQuestion)) {
          throw new BadRequestException('Invalid security question');
        }
        updateData.securityQuestion = securityQuestion;
        updateData.securityAnswerHash = await bcrypt.hash(securityAnswer.toLowerCase(), 10);
      } else {
        throw new BadRequestException('Security question and answer are required for initial reset');
      }

      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      const auditPayload: AuditPayload = {
        actionType: 'USER_PASSWORD_RESET',
        performedById: userId,
        affectedUserId: userId,
         entityType: 'User',
         entityId: userId,
         oldState: { password: '[hashed]' },
         newState: { password: '[hashed]', securityQuestion, securityAnswer: '[hashed]' },
        ipAddress,
        userAgent,
        details: { initialReset: true },
      };
      await this.auditService.logAction(auditPayload, prisma);
      return { message: 'Password reset successfully' };
    });
  }

  async forgotPassword(email: string, securityAnswer: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, securityQuestion: true, securityAnswerHash: true },
    });
    if (!user || !user.securityQuestion || !user.securityAnswerHash) {
      throw new UnauthorizedException('User not found or security question not set');
    }

    const isAnswerValid = await bcrypt.compare(securityAnswer.toLowerCase(), user.securityAnswerHash);
    if (!isAnswerValid) {
      throw new UnauthorizedException('Invalid security answer. Please contact an Administrator for assistance.');
    }

    const resetTokenPayload: ResetPasswordJwtPayload = { sub: user.id, type: 'reset-password' };
    const resetToken = this.jwtService.sign(resetTokenPayload, { expiresIn: '15m' });
    const resetUrl = `http://localhost:3001/reset-password?token=${encodeURIComponent(resetToken)}`;

    let emailQueued = false;
    await this.prisma.$transaction(async (tx) => {
      const auditPayload: AuditPayload = {
        actionType:'USER_PASSWORD_RESET',
        performedById: user.id,
        affectedUserId: user.id,
        entityType: 'User',
        entityId: user.id,
        oldState: null,
        newState: null,
        ipAddress,
        userAgent,
        details: { stage: 'request_initiated', emailSent: false },
      };
      await this.auditService.logAction(auditPayload, tx);

  try {
    await this.emailQueue.add(
      'send-email',
      {
        to: email,
        subject: 'Reset Your ISW Account Password',
        html: `
          <p>Hello ${user.name},</p>
          <p>You requested a password reset</p>
          <p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 15 minutes.</p>
          <p>If you didn’t request this, ignore this email.</p>
          <p>Thanks,<br>ISW Team</p>
        `,
      },
      { attempts: 3, backoff: 5000 },
    );
    emailQueued = true;

    // queuing success
    const successAuditPayload: AuditPayload = {
      actionType: 'USER_PASSWORD_RESET',
      performedById: user.id,
      affectedUserId: user.id,
      entityType: 'User',
      entityId: user.id,
      oldState: null,
      newState: null,
      ipAddress,
      userAgent,
      details: { stage: 'email_queued', emailSent: true },
    };
    await this.auditService.logAction(successAuditPayload, tx);
  } catch (error) {
    console.error(`Failed to queue reset email to ${email}:`, error.message);

    // queuing failure
    const failureAuditPayload: AuditPayload = {
      actionType: 'USER_PASSWORD_RESET',
      performedById: user.id,
      affectedUserId: user.id,
      entityType: 'User',
      entityId: user.id,
      oldState: null,
      newState: null,
      ipAddress,
      userAgent,
      details: { stage: 'email_queue_failed', emailSent: false },
    };
    await this.auditService.logAction(failureAuditPayload, tx);
    throw new Error('Failed to queue reset email');
  }
});

if (!emailQueued) {
  throw new Error('Failed to queue reset email'); 
}

return { message: 'Password reset email queued' };
}

  async resetPasswordWithToken(token: string, newPassword: string, ipAddress?: string, userAgent?: string) {
    let decoded: ResetPasswordJwtPayload;
    try {
      decoded = await this.jwtService.verifyAsync(token, { secret: process.env.JWT_SECRET });
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (decoded.type !== 'reset-password') {
      throw new UnauthorizedException('Invalid token type');
    }

    return this.prisma.$transaction(async (prisma) => {
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          mustResetPassword: false,
        },
      });

      const auditPayload: AuditPayload = {
        actionType:'USER_PASSWORD_RESET',
        performedById: user.id,
        affectedUserId: user.id,
        entityType: 'User',
        entityId: user.id,
        oldState: { password: '[hashed]' },
        newState: { password: '[hashed]' },
        ipAddress,
        userAgent,
        details: { stage: 'completed' },
      };
      await this.auditService.logAction(auditPayload, prisma);
      return { message: 'Password reset successfully' };
    });
  }

  async logout(userId: string, ipAddress?: string, userAgent?: string) {
    return this.prisma.$transaction(async (tx) => {
      const auditPayload: AuditPayload = {
        actionType:'USER_LOGGED_OUT',
        performedById: userId,
        affectedUserId: userId,
        entityType: 'User',
        entityId: userId,
        oldState: null,
        newState: null,
        ipAddress,
        userAgent,
      };
      await this.auditService.logAction(auditPayload, tx);
      return { message: 'Logged out successfully' };
    });
  }

  async getSecurityQuestions() {
    return this.securityQuestions;
  }
}