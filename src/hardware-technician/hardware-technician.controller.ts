import { Controller, Post, Get, Body, Query, Request, UseGuards, Patch, Param } from '@nestjs/common';
import { HardwareTechnicianService } from './hardware-technician.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { Roles } from 'auth/roles.decorator';
import { CreateMaintenanceTicketDto, FilterTicketsDto, SearchDevicesDto, UpdateMaintenanceTicketDto } from './dto/hardware-technician.dto';

@Controller('hardware')
export class HardwareTechnicianController {
  constructor(private readonly hardwareTechnicianService: HardwareTechnicianService) {}

  @Get('technicians')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hardware_technician', 'supervisor')
  async getHardwareTechnicians() {
    return this.hardwareTechnicianService.getHardwareTechnicians();
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

  
  @Patch('tickets/:id/update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hardware_technician')
  async updateMaintenanceTicket(
    @Param('id') ticketId: string,
    @Body() dto: UpdateMaintenanceTicketDto,
    @Request() req,
  ) {
    return this.hardwareTechnicianService.updateMaintenanceTicket(
      ticketId,
      req.user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hardware_technician', 'supervisor')
  async getUsers() {
    return this.hardwareTechnicianService.getUsers();
  }

  @Get('fixed-assets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hardware_technician')
  async getAllFixedAssets() {
    return this.hardwareTechnicianService.getAllFixedAssets();
  }

  @Get('tickets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hardware_technician')
  async getTickets(@Query() dto: FilterTicketsDto, @Request() req) {
    return this.hardwareTechnicianService.getTickets(req.user.userId, dto);
  }

  @Get('devices/search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hardware_technician')
  async searchDevices(@Query() dto: SearchDevicesDto) {
    return this.hardwareTechnicianService.searchDevices(dto);
  }
}
