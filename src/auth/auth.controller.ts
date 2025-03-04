import { Controller, Post, Body, Request, UseGuards, UnauthorizedException, Req, ForbiddenException, Patch, BadRequestException, Get } from '@nestjs/common';
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

  @Post('login-with-token')
  async loginWithToken(@Body() body: { token: string }) {
    if (!body.token) throw new BadRequestException('Token is required');
    return this.authService.loginWithToken(body.token);
  }

  @Patch('reset-password')
  @UseGuards(JwtAuthGuard)
  async resetPassword(
    @Body() body: { newPassword: string; securityQuestion?: string; securityAnswer?: string },
    @Req() req,
  ) {
    if (!body.newPassword) throw new ForbiddenException('New password is required');
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(body.newPassword)) {
      throw new BadRequestException('Password must be at least 8 chars with a letter and number');
    }
    
    return this.authService.resetPassword(req.user.userId, body.newPassword, body.securityQuestion, body.securityAnswer);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout() {
    // frontend should discard token
    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string; securityAnswer: string }) {
    if (!body.email || !body.securityAnswer) {
      throw new BadRequestException('Email and security answer are required');
    }
    return this.authService.forgotPassword(body.email, body.securityAnswer);
  }

  @Patch('reset-password-with-token')
  async resetPasswordWithToken(
    @Body() { token, newPassword }: { token: string; newPassword: string },
  ) {
    if (!token || !newPassword) throw new BadRequestException('Token and new password are required');
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new BadRequestException('Password must be at least 8 chars with a letter and number');
    }
    return this.authService.resetPasswordWithToken(token, newPassword);
  }
  @Get('security-questions')
  async getSecurityQuestions() {
    return this.authService.getSecurityQuestions();
  }
}