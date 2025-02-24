import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true, // Key fix: Pass request to validate
    });
  }

  async validate(
    req: any, // Request object now available
    payload: { sub: string; staffId: string; roles: string[]; permissions: any[]; mustResetPassword: boolean },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { staffId: payload.staffId },
      select: { id: true, staffId: true, mustResetPassword: true },
    });

    if (!user) throw new UnauthorizedException('Invalid user credentials');
    if (user.id !== payload.sub) throw new UnauthorizedException('Token subject mismatch');

    // Allow /auth/reset-password even if mustResetPassword is true
    const isResetPasswordRoute = req.url === '/auth/reset-password' || req.originalUrl === '/auth/reset-password';
    if (user.mustResetPassword && !isResetPasswordRoute) {
      throw new UnauthorizedException('You must reset your password before proceeding');
    }

    return { userId: user.id, staffId: user.staffId, roles: payload.roles, permissions: payload.permissions };
  }
}