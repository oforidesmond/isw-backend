import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Ip, Query } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
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
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly userManagementService: UserManagementService,
    private readonly userQueryService: UserQueryService,
    private readonly roleService: RoleService,
    private readonly adminITItemsService: AdminITItemsService,
    private readonly SuppliersService: SuppliersService
  ) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getProfile(@Request() req) {
    return req.user;
  }
  
  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'supervisor', 'stores_officer', 'inventory_officer', 'hardware_technician')
  async getAllUsers() {
    return this.userQueryService.getAllUsers();
  }

  @Get('users/deleted')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllDeletedUsers() {
    return this.userQueryService.getAllDeletedUsers();
  }

  @Post('user')
  @UseGuards(JwtAuthGuard, RolesGuard) 
  @Roles('admin') 
  async createUser(@Body() createUserDto: CreateUserDto, @Request() req) {
    return this.userManagementService.createUser(createUserDto, req.user.userId, req.ip, req.headers['user-agent']);
  }

  @Patch('user/:staffId/delete')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async softDeleteUser(@Param('staffId') staffId: string, @Request() req) {
  return this.userManagementService.softDeleteUser(staffId, req.user.userId, req.ip, req.headers['user-agent']);
}

@Delete('user/:staffId/permanent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async permanentlyDeleteUser(@Param('staffId') staffId: string, @Request() req) {
    return this.userManagementService.permanentlyDeleteUser(staffId, req.user.userId, req.ip, req.headers['user-agent']);
}

@Patch('user/:staffId/restore')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async restoreUser(@Param('staffId') staffId: string, @Request() req) {
  return this.userManagementService.restoreUser(staffId, req.user.userId, req.ip, req.headers['user-agent']);
  }

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

  @Post('user/:staffId/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async resetPassword(@Param('staffId') staffId: string, @Request() req) {
    return this.userManagementService.resetPassword(staffId, req.user.userId, req.ip, req.headers['user-agent']);
  }

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

  @Get('roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllRoles() {
    return this.roleService.getAllRoles();
  }

  @Post('role')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async createRole(@Body() createRoleDto: CreateRoleDto, @Request() req) {
  return this.roleService.createRole(createRoleDto, req.user.userId, req.ip, req.headers['user-agent']);
}

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

  @Post('suppliers/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createSupplier(@Body() dto: CreateSupplierDto, @Request() req) {
    return this.SuppliersService.createSupplier(req.user.userId, dto, req.ip, req.headers['user-agent']);
  }

  @Get('suppliers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'supervisor', 'stores_officer', 'inventory_officer', 'hardware_technician')
  async getSuppliers() {
    return this.SuppliersService.getSuppliers();
  }

   @Get('it-items')
   @UseGuards(JwtAuthGuard, RolesGuard)
   @Roles('admin', 'supervisor', 'stores_officer', 'inventory_officer', 'hardware_technician')
   async getAvailableITItems() {
     return this.adminITItemsService.getAvailableITItems();
   }

  @Get('departments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'supervisor', 'stores_officer', 'inventory_officer', 'hardware_technician')
  async getAllDepartments(@Query('includeUnits') includeUnits?: string) {
    return this.userManagementService.getAllDepartments(includeUnits === 'true');
  }

  @Post('departments/new')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createDepartment(@Body() createDepartmentDto: CreateDepartmentDto, @Request() req) {
    return this.userManagementService.createDepartment(
      createDepartmentDto,
      req.user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('units')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllUnits() {
    return this.userManagementService.getAllUnits();
  }

  @Post('units/new')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createUnit(@Body() createUnitDto: CreateUnitDto, @Request() req) {
    return this.userManagementService.createUnit(
      createUnitDto,
      req.user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete('departments/:id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async softDeleteDepartment(@Param('id') id: string, @Request() req) {
    return this.userManagementService.softDeleteDepartment(
      id,
      req.user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

   @Delete('units/:id/delete')
   @UseGuards(JwtAuthGuard, RolesGuard)
   @Roles('admin')
   async softDeleteUnit(@Param('id') id: string, @Request() req) {
     return this.userManagementService.softDeleteUnit(
       id,
       req.user.userId,
       req.ip,
       req.headers['user-agent'],
     );
   }

   @Get('permissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllPermissions(@Query('includeRoles') includeRoles?: string) {
    return this.roleService.getAllPermissions(includeRoles === 'true');
  }

    @Delete('permissions/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async softDeletePermission(
      @Param('id') id: string,
      @Request() req,
    ) {
      return this.roleService.softDeletePermission(
        id,
        req.user.userId,
        req.ip,
        req.headers['user-agent'],
      );
    }

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAuditLogs(@Query() query: GetAuditLogsDto) {
    return this.userQueryService.getAuditLogs({
      actionType: query.actionType,
      entityType: query.entityType,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      skip: query.skip,
      take: query.take,
    });
  }

  @Delete('suppliers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async softDeleteSupplier(@Param('id') id: string, @Request() req) {
    return this.SuppliersService.softDeleteSupplier(
      id,
      req.user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete('it-items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async softDeleteITItem(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.adminITItemsService.softDeleteITItem(
      id,
      req.user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete('roles/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async softDeleteRole(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.roleService.softDeleteRole(
      id,
      req.user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }
}

  