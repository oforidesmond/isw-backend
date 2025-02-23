import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'staffId' }); 
  }

  async validate(staffId: string, password: string){
    const user = await this.authService.validateUser(staffId, password);
    if (!user) {
      throw new UnauthorizedException('Invalid staffId or password');
    }
    return user;
  }
}
