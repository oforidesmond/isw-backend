import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

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

type JwtPayload = LoginJwtPayload | TempLoginJwtPayload | ResetPasswordJwtPayload;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default_secret',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    // Handle reset-password tokens
    if ('type' in payload && payload.type === 'reset-password') {
      return { userId: payload.sub };
    }

    // Handle temp-login tokens
    if ('type' in payload && payload.type === 'temp-login') {
      return { userId: payload.sub, staffId: payload.staffId };
    }

    // Handle regular login tokens
    const loginPayload = payload as LoginJwtPayload;
    const isResetPasswordRoute = req.url === '/auth/reset-password' || req.originalUrl === '/auth/reset-password';
    if (loginPayload.mustResetPassword && !isResetPasswordRoute) {
      throw new UnauthorizedException('You must reset your password before proceeding');
    }

    return {
      userId: loginPayload.sub,
      staffId: loginPayload.staffId,
      roles: loginPayload.roles,
      permissions: loginPayload.permissions,
      mustResetPassword: loginPayload.mustResetPassword,
    };
  }
}