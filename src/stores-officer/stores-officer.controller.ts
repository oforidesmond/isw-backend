import { Body, Controller, Param, Patch, Request, UseGuards } from '@nestjs/common';
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
      deviceDetails?: Record<string, any>;
      stockBatchId: string;
    },
    @Request() req,
  ) {
    return this.storesOfficerService.issueRequisition(requisitionId, req.user.userId, data, req.ip, req.headers['user-agent']);
  }
}