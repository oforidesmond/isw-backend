import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { SupervisorService } from './supervisor.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { Roles } from 'auth/roles.decorator';
import {
  MaintenanceReportDto,
  OverdueTicketsReportDto,
  RequisitionApprovalDelaysDto,
  RequisitionReportDto,
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

  @Get('reqs/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor')
  async getRequisitionStatusSummary(@Query() dto: RequisitionReportDto, @Request() req) {
    return this.supervisorService.getRequisitionStatusSummary(dto);
  }

  @Get('reqs/approval-delays')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor')
  async getRequisitionApprovalDelays(@Query() dto: RequisitionApprovalDelaysDto, @Request() req) {
    return this.supervisorService.getRequisitionApprovalDelays(dto);
  }

  @Get('reqs/fulfillment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor')
  async getRequisitionFulfillmentReport(@Query() dto: RequisitionReportDto, @Request() req) {
    return this.supervisorService.getRequisitionFulfillmentReport(dto);
  }

  @Get('reqs/high-urgency')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor')
  async getHighUrgencyRequisitions(@Query() dto: RequisitionReportDto, @Request() req) {
    return this.supervisorService.getHighUrgencyRequisitions(dto);
  }

  @Get('reqs/declined')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor')
  async getDeclinedRequisitionsAnalysis(@Query() dto: RequisitionReportDto, @Request() req) {
    return this.supervisorService.getDeclinedRequisitionsAnalysis(dto);
  }
}
