import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import {  StoresOfficerService } from './stores-officer.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { Roles } from 'auth/roles.decorator';
import { CreateStockReceivedDto, StockLevelsFilterDto } from './dto/create-stock-received.dto';

@Controller('stores')
export class StoresOfficerController {
  constructor(private readonly storesOfficerService: StoresOfficerService) {}

  @Get('stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer', 'supervisor', 'admin')
  async getStockLevels(@Query() filters: StockLevelsFilterDto) {
    return this.storesOfficerService.getStockLevels(filters);
  }

  @Get('reqs/approved')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer','supervisor')
  async getApprovedRequisitions() {
    return this.storesOfficerService.getApprovedRequisitions();
  }

  @Get('stock-received')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer', 'supervisor')
  // @ApiOperation({ summary: 'Get all stock received records' })
  // @ApiResponse({ status: 200, description: 'List of stock received records' })
  // @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination', example: 1 })
  // @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of records per page', example: 10 })
  async getAllStockReceived(
    // @Query('page') page: number = 1,
    // @Query('limit') limit: number = 10,
  ) {
    return this.storesOfficerService.getAllStockReceived();
  }

  @Patch('req/:reqId/issue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer')
  async issueRequisition(
    @Param('reqId') requisitionId: string,
    @Body() data: {
      itItemId: string;
      quantity: number;
      stockBatchId: string;
      disbursementNote?: string;
      remarks?: string;
    },
    @Request() req,
  ) {
    return this.storesOfficerService.issueRequisition(requisitionId, req.user.userId, data, req.ip, req.headers['user-agent']);
  }

  @Get('stock-batches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer')
  async getAvailableStockBatches(@Query('itItemId') itItemId?: string) {
    return this.storesOfficerService.getAvailableStockBatches(itItemId);
  }

  @Get('it-items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer','supervisor')
  async getAvailableITItems() {
    return this.storesOfficerService.getAvailableITItems();
  }

  @Post('stock-received/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer')
  async createStockReceived(@Body() dto: CreateStockReceivedDto, @Request() req) {
    return this.storesOfficerService.createStockReceived(req.user.userId, dto, req.ip, req.headers['user-agent']);
  }

  @Get('suppliers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer','supervisor')
  async getSuppliers() {
    return this.storesOfficerService.getSuppliers();
  }

   @Get('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('stores_officer', 'supervisor')
async generateReport(
  @Query('reportType') reportType: string,
  @Query('startDate') startDate?: string,
  @Query('endDate') endDate?: string,
  @Query('itemClass') itemClass?: string,
  @Query('deviceType') deviceType?: string,
  @Query('status') status?: string,
  @Query('reqStatus') reqStatus?: string,
  @Query('itItemId') itItemId?: string,
  @Query('brand') brand?: string,
  @Query('model') model?: string,
  @Query('supplierId') supplierId?: string,
  @Query('lpoReference') lpoReference?: string,
  @Query('voucherNumber') voucherNumber?: string,
  @Query('departmentId') departmentId?: string,
  @Query('minQuantity') minQuantity?: string,
  @Query('maxQuantity') maxQuantity?: string,
) {
  return this.storesOfficerService.generateReport(reportType, {
    startDate,
    endDate,
    itemClass,
    deviceType,
    status,
    reqStatus,
    itItemId,
    brand,
    model,
    supplierId,
    lpoReference,
    voucherNumber,
    departmentId,
    minQuantity: minQuantity ? parseInt(minQuantity) : undefined,
    maxQuantity: maxQuantity ? parseInt(maxQuantity) : undefined,
    });
  }
}