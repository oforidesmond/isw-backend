import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Ip } from '@nestjs/common';
// import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { Roles } from 'auth/roles.decorator';
import { UserManagementService } from './services/user-management.service';
import { UserQueryService } from './services/user-query.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { RoleService } from './services/role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AdminITItemsService } from './services/it-items.service';
import { CreateITItemDto } from './dto/create-it-item.dto';
import { CreateSupplierDto } from 'stores-officer/dto/create-stock-received.dto';
import {SuppliersService} from './services/suppliers.service'

@Controller('admin')
export class AdminController {
  constructor(
    private readonly userManagementService: UserManagementService,
    private readonly userQueryService: UserQueryService,
    private readonly roleService: RoleService,
    private readonly adminITItemsService: AdminITItemsService,
    private readonly SuppliersService: SuppliersService
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

//Update User Data
@Patch('user/:staffId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async updateUser(
  @Param('staffId') staffId: string,
  @Body() updateUserDto: UpdateUserDto,
  @Request() req,
) {
  return this.userManagementService.updateUser(staffId, updateUserDto, req.user.userId, req.ip, req.headers['user-agent']);
  }

  //Manually reset user password
  @Post('user/:staffId/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async resetPassword(@Param('staffId') staffId: string, @Request() req) {
    return this.userManagementService.resetPassword(staffId, req.user.userId, req.ip, req.headers['user-agent']);
  }

  //Modify activeStatus of user
  @Patch('user/:staffId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async toggleStatus(
    @Param('staffId') staffId: string,
    @Body('isActive') isActive: boolean,
    @Request() req,
  ) {
    return this.userManagementService.toggleStatus(staffId, isActive, req.user.userId, req.ip, req.headers['user-agent']);
  }

  //Get all roles
  @Get('roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllRoles() {
    return this.roleService.getAllRoles();
  }

  //Create Role
  @Post('role')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async createRole(@Body() createRoleDto: CreateRoleDto, @Request() req) {
  return this.roleService.createRole(createRoleDto, req.user.userId, req.ip, req.headers['user-agent']);
}

  //Edit Permissions for a Role
  @Patch('role/:roleId/permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async updateRolePermissions(
  @Param('roleId') roleId: string,
  @Body() body: { permissions: string[] },
  @Request() req,
) {
  return this.roleService.updateRolePermissions(roleId, body.permissions, req.user.userId, req.ip, req.headers['user-agent']);
  }

  //Assign deptApprover to user
  @Patch('dept/assign-approver')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async assignDeptApprover(
    @Body('staffId') staffId: string,
    @Body('departmentId') departmentId: string,
    @Request() req,
  ) {
    return this.userManagementService.assignDeptApprover(
      staffId,
      departmentId,
      req.user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // Add new ItItem
  @Post('ititems/new')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createITItem(
    @Body() dto: CreateITItemDto,
    @Request() req, 
    @Ip() ipAddress: string 
   ) {
    return this.adminITItemsService.createITItem(req.user.userId, dto, ipAddress, req.headers['user-agent']);
  }

  // Add Suppliers
  @Post('suppliers/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createSupplier(@Body() dto: CreateSupplierDto, @Request() req) {
    return this.SuppliersService.createSupplier(req.user.userId, dto, req.ip, req.headers['user-agent']);
  }

  // Get Suppliers
  @Get('suppliers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getSuppliers() {
    return this.SuppliersService.getSuppliers();
  }
}

  