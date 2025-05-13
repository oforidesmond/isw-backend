import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { SupervisorService } from './supervisor.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { Roles } from 'auth/roles.decorator';
import {
  InventoryReportDto,
  MaintenanceReportDto,
  OverdueTicketsReportDto,
  RequisitionApprovalDelaysDto,
  RequisitionReportDto,
  StockReportDto,
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

  @Get('inventory')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor')
  async getStockInventoryLevels(@Query() dto: StockReportDto, @Request() req) {
    return this.supervisorService.getStockInventoryLevels(dto);
  }

  @Get('stock-received')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor')
  async getStockReceivedReport(@Query() dto: StockReportDto, @Request() req) {
    return this.supervisorService.getStockReceivedReport(dto);
  }

  @Get('stock-issued')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor')
  async getStockIssuedReport(@Query() dto: StockReportDto, @Request() req) {
    return this.supervisorService.getStockIssuedReport(dto);
  }

  @Get('stock-movement')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor')
  async getStockMovementTrends(@Query() dto: StockReportDto, @Request() req) {
    return this.supervisorService.getStockMovementTrends(dto);
  }

  @Get('low-stock-alerts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor')
  async getLowStockAlerts(@Query() dto: StockReportDto, @Request() req) {
    return this.supervisorService.getLowStockAlerts(dto);
  }

  @Get('inventory/device-age')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor')
  async getInventoryAgeReport(@Query() dto: InventoryReportDto, @Request() req) {
    return this.supervisorService.getInventoryAgeReport(dto);
  }

  @Get('inventory/device-details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor')
  async getInventoryDeviceDetailsReport(@Query() dto: InventoryReportDto, @Request() req) {
    return this.supervisorService.getInventoryDeviceDetailsReport(dto);
  }
}
