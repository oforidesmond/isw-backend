import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from 'src/users/user.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService)) 
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async login(user: any) {
    // Extract roles & permissions
    const roles = user.roles.map((userRole) => userRole.role.name);
    const permissions = user.roles.flatMap((userRole) =>
      userRole.role.permissions.map((rp) => ({
        resource: rp.permission.resource,
        actions: rp.permission.actions,
      }))
    );

    const payload = {
      sub: user.id,
      email: user.email,
      roles,
      permissions,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
