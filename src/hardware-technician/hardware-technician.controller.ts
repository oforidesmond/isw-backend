import { Controller, Post, Get, Body, Query, Request, UseGuards } from '@nestjs/common';
import { HardwareTechnicianService } from './hardware-technician.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { Roles } from 'auth/roles.decorator';
import { CreateMaintenanceTicketDto, SearchDevicesDto } from './dto/hardware-technician.dto';

@Controller('hardware')
export class HardwareTechnicianController {
  constructor(private readonly hardwareTechnicianService: HardwareTechnicianService) {}

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hardware_technician')
  async getUsers() {
    return this.hardwareTechnicianService.getUsers();
  }

  @Get('fixed-assets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hardware_technician')
  async getAllFixedAssets() {
    return this.hardwareTechnicianService.getAllFixedAssets();
  }
  
  @Post('tickets/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hardware_technician')
  async createMaintenanceTicket(@Body() dto: CreateMaintenanceTicketDto, @Request() req) {
    return this.hardwareTechnicianService.createMaintenanceTicket(
      req.user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('devices/search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hardware_technician')
  async searchDevices(@Query() dto: SearchDevicesDto) {
    return this.hardwareTechnicianService.searchDevices(dto);
  }
}
