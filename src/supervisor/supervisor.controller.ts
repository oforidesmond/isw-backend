import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { SupervisorService } from './supervisor.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { Roles } from 'auth/roles.decorator';
import {
  MaintenanceReportDto,
  OverdueTicketsReportDto,
  WorkReportDto,
} from './dto/supervisor.dto';

@Controller('reports')
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}

  @Get('workshop')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor')
  async getMaintenanceReport(@Query() dto: MaintenanceReportDto, @Request() req) {
    return this.supervisorService.getMaintenanceReport(dto);
  }

  @Get('workshop/work-report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor')
  async getWorkReport(@Query() dto: WorkReportDto, @Request() req) {
    return this.supervisorService.getWorkReport(dto);
  }

  @Get('workshop/overdue-tickets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor')
  async getOverdueTicketsReport(@Query() dto: OverdueTicketsReportDto, @Request() req) {
    return this.supervisorService.getOverdueTicketsReport(dto);
  }
}
