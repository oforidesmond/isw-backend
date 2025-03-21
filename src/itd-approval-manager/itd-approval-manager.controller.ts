import { Body, Controller, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { ItdApprovalManagerService } from './itd-approval-manager.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { Roles } from 'auth/roles.decorator';

@Controller('approval')
export class ItdApprovalManagerController {
  constructor(private readonly itdApprovalManagerService: ItdApprovalManagerService) {}

  @Patch('it/req/:reqId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('itd_approver')
  async approveItRequisition(@Param('reqId') requisitionId: string, @Request() req) {
    return this.itdApprovalManagerService.approveRequisition(requisitionId, req.user.userId, req.ip, req.headers['user-agent']);
  }

  @Patch('it/req/:reqId/decline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('itd_approver')
  async declineItRequisition(
    @Param('reqId') requisitionId: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.itdApprovalManagerService.declineRequisition(requisitionId, req.user.userId, reason, req.ip, req.headers['user-agent']);
  }
}
