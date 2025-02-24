import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/users/user.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService)) 
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService, // Add if not injected via UserService
  ) {}

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
    };
  }

  async resetPassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustResetPassword: false },
    });
    return { message: 'Password reset successfully' };
  }
}