import { Controller, Post, Body, Request, UseGuards, UnauthorizedException, Req, ForbiddenException, Patch, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from 'prisma/prisma.service';


@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private prisma: PrismaService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Body() body: { staffId: string; password: string }) {
    const user = await this.authService.validateUser(body.staffId, body.password);
    return this.authService.login(user);
  }

  @Patch('reset-password')
  @UseGuards(JwtAuthGuard)
  async resetPassword(@Body() { newPassword }: { newPassword: string }, @Req() req) {
    if (!newPassword) throw new ForbiddenException('New password is required');
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new BadRequestException('Password must be at least 8 chars with a letter and number');
    }
    return this.authService.resetPassword(req.user.userId, newPassword);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout() {
    // tell frontend to discard token
    return { message: 'Logged out successfully' };
  }
}