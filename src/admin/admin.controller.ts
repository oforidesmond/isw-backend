import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
// import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { Roles } from 'auth/roles.decorator';
import { UserManagementService } from './services/user-management.service';
import { UserQueryService } from './services/user-query.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly userManagementService: UserManagementService,
    private readonly userQueryService: UserQueryService,
  ) {}

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
    return this.userQueryService.getAllUsers();
  }

  //get deleted users
  @Get('users/deleted')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllDeletedUsers() {
    return this.userQueryService.getAllDeletedUsers();
  }

  //create user
  @Post('user')
  @UseGuards(JwtAuthGuard, RolesGuard) 
  @Roles('admin') 
  async createUser(@Body() createUserDto: CreateUserDto, @Request() req) {
    return this.userManagementService.createUser(createUserDto, req.user.userId, req.ip, req.headers['user-agent']);
  }

//Softdelete user
  @Patch('user/:staffId/delete')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async softDeleteUser(@Param('staffId') staffId: string, @Request() req) {
  return this.userManagementService.softDeleteUser(staffId, req.user.userId, req.ip, req.headers['user-agent']);
}

//not for prod
@Delete('user/:staffId/permanent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async permanentlyDeleteUser(@Param('staffId') staffId: string, @Request() req) {
    return this.userManagementService.permanentlyDeleteUser(staffId, req.user.userId, req.ip, req.headers['user-agent']);
}

//restore a user
@Patch('user/:staffId/restore')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async restoreUser(@Param('staffId') staffId: string, @Request() req) {
  return this.userManagementService.restoreUser(staffId, req.user.userId, req.ip, req.headers['user-agent']);
}
}

  