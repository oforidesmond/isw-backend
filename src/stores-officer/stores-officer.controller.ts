import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { StoresOfficerService } from './stores-officer.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { Roles } from 'auth/roles.decorator';
import { CreateStockReceivedDto } from './dto/create-stock-received.dto';

@Controller('stores')
export class StoresOfficerController {
  constructor(private readonly storesOfficerService: StoresOfficerService) {}

  // Get all approved requisitions
  @Get('reqs/approved')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer')
  async getApprovedRequisitions() {
    return this.storesOfficerService.getApprovedRequisitions();
  }
  
// Issue Requisition
  @Patch('req/:reqId/issue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer')
  async issueRequisition(
    @Param('reqId') requisitionId: string,
    @Body() data: {
      itItemId: string;
      quantity: number;
      stockBatchId: string;
      deviceDetails?: Record<string, any>;
      disbursementNote?: string;
      remarks?: string;
    },
    @Request() req,
  ) {
    return this.storesOfficerService.issueRequisition(requisitionId, req.user.userId, data, req.ip, req.headers['user-agent']);
  }

  //Get stock batches
  @Get('stock-batches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer')
  async getAvailableStockBatches(@Query('itItemId') itItemId?: string) {
    return this.storesOfficerService.getAvailableStockBatches(itItemId);
  }

  //Get IT items
  @Get('it-items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer')
  async getAvailableITItems() {
    return this.storesOfficerService.getAvailableITItems();
  }

  // Create Stock Received Entry
  @Post('stock-received')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer')
  async createStockReceived(@Body() dto: CreateStockReceivedDto, @Request() req) {
    return this.storesOfficerService.createStockReceived(req.user.userId, dto, req.ip, req.headers['user-agent']);
  }

  //Get suppliers
  @Get('suppliers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer')
  async getSuppliers() {
    return this.storesOfficerService.getSuppliers();
  }
}