import { BadRequestException, forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma.service';
import { UserService } from 'users/user.service';
import { MailerService } from '@nestjs-modules/mailer';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService)) 
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService, 
    private mailerService: MailerService,
  ) {}

  // Security questions
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
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async login(user: any) {
    const roles = user.roles?.map((userRole) => userRole.role.name) || [];
    const permissions = user.roles?.flatMap((userRole) =>
      userRole.role.permissions.map((rp) => ({
        resource: rp.permission.resource,
        actions: rp.permission.actions,
      }))
    ) || [];

    const payload = {
      sub: user.id,
      staffId: user.staffId,
      roles,
      permissions,
      mustResetPassword: user.mustResetPassword,
    };

    return {
      access_token: this.jwtService.sign(payload),
      mustResetPassword: user.mustResetPassword,
      securityQuestion: user.mustResetPassword ? null : user.securityQuestion, // Send question if reset done
    };
  }

  async loginWithToken(token: string) {
    let decoded;
    try {
      decoded = this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired login token');
    }

    if (decoded.type !== 'temp-login') throw new UnauthorizedException('Invalid token type');

    const user = await this.validateUser(decoded.staffId, decoded.tempPassword);
    return this.login(user); // Reuse existing login logic
  }
  
  async resetPassword(userId: string, newPassword: string, securityQuestion?: string, securityAnswer?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mustResetPassword: true },
    });

    if (!user || !user.mustResetPassword) {
      throw new UnauthorizedException('Password reset already perfomed on this account');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updateData: any = {
      password: hashedPassword,
      mustResetPassword: false,
    };

    // If initial reset, save security question and answer
    if (securityQuestion && securityAnswer) {
      if (!this.securityQuestions.includes(securityQuestion)) {
        throw new BadRequestException('Invalid security question');
      }
      updateData.securityQuestion = securityQuestion;
      updateData.securityAnswerHash = await bcrypt.hash(securityAnswer.toLowerCase(), 10);
    } else {
      throw new BadRequestException('Security question and answer are required for initial reset');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return { message: 'Password reset successfully' };
  }

  async forgotPassword(email: string, securityAnswer: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, securityQuestion: true, securityAnswerHash: true },
    });
    if (!user || !user.securityQuestion || !user.securityAnswerHash) {
      throw new UnauthorizedException('User not found or security question not set');
    }

    const isAnswerValid = await bcrypt.compare(securityAnswer.toLowerCase(), user.securityAnswerHash);
    if (!isAnswerValid) {
      throw new UnauthorizedException(
        'Invalid security answer. Please contact an Administrator for assistance.'
      );
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour expiry

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const resetUrl = `http://localhost:3000/auth/reset-password?token=${resetToken}`;
    try {
      await this.mailerService.sendMail({
        to: email,
        from: process.env.EMAIL_USER,
        subject: 'Reset Your ISW Account Password',
        html: `
          <p>Hello ${user.name},</p>
          <p>You requested a password reset.</p>
          <p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>
          <p>If you didn’t request this, ignore this email.</p>
          <p>Thanks,<br>ISW Team</p>
        `,
      });
    } catch (error) {
      console.error(`Failed to send reset email to ${email}:`, error.message);
      throw new Error('Failed to send reset email');
    }

    return { message: 'Password reset email sent' };
  }

  async resetPasswordWithToken(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }, // Check if token is still valid
      },
    });

    if (!user) throw new UnauthorizedException('Invalid or expired reset token');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustResetPassword: false,
        resetToken: null, // Clear token after use
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password reset successfully' };
  }
  async getSecurityQuestions() {
    return this.securityQuestions;
  }
}