import { Body, Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { StoresOfficerService } from './stores-officer.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { Roles } from 'auth/roles.decorator';

@Controller('stores')
export class StoresOfficerController {
  constructor(private readonly storesOfficerService: StoresOfficerService) {}

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

  @Get('stock-batches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer')
  async getAvailableStockBatches(@Query('itItemId') itItemId?: string) {
    return this.storesOfficerService.getAvailableStockBatches(itItemId);
  }

  @Get('it-items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('stores_officer')
  async getAvailableITItems() {
    return this.storesOfficerService.getAvailableITItems();
  }
}