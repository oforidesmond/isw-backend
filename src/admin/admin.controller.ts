import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { Roles } from 'auth/roles.decorator';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  //get amdin profile
  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getProfile(@Request() req) {
    return req.user;
  }
  
  //get all active users
  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  //get deleted users
  @Get('users/deleted')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllDeletedUsers() {
    return this.adminService.getAllDeletedUsers();
  }

  //create user
  @Post('user') // Route: POST /admin/user
  @UseGuards(JwtAuthGuard, RolesGuard) 
  @Roles('admin') 
  async createUser(@Body() createUserDto: CreateUserDto, @Request() req) {
    return this.adminService.createUser(createUserDto, req.user.userId, req.ip, req.headers['user-agent']);
  }

//Softdelete user
  @Patch('user/:staffId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async softDeleteUser(@Param('staffId') staffId: string, @Request() req) {
  return this.adminService.softDeleteUser(staffId, req.user.userId, req.ip, req.headers['user-agent']);
}

//restore a user
@Patch('user/:staffId/restore')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async restoreUser(@Param('staffId') staffId: string, @Request() req) {
  return this.adminService.restoreUser(staffId, req.user.userId, req.ip, req.headers['user-agent']);
}
}

  