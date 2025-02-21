import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getProfile(@Request() req) {
    return req.user;
  }
  
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard) 
  @Roles('admin')
  getAdminData() {
    return { message: 'This is only accessible by Admins' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard) 
  @Roles('admin') 
  @Post('user') // Route: POST /admin/user
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.adminService.createUser(createUserDto);
  }
}

  