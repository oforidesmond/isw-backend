import { Body, Controller, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { ApprovalManagerService } from './approval-manager.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { Roles } from 'auth/roles.decorator';
import { RolesGuard } from 'auth/roles.guard';

@Controller('dept')
export class ApprovalManagerController {
  constructor( private readonly deptApproverService: ApprovalManagerService,) {}

  @Get('requisitions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dept_approver')
  async getPendingRequisitions(@Request() req) {
    return this.deptApproverService.getPendingRequisitions(req.user.userId);
  }

    @Patch('req/:reqId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dept_approver')
  async approveDeptRequisition(@Param('reqId') requisitionId: string, @Request() req) {
    return this.deptApproverService.approveRequisition(requisitionId, req.user.userId, req.ip, req.headers['user-agent']);
  }

  @Patch('req/:reqId/decline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dept_approver')
  async declineDeptRequisition(
    @Param('reqId') requisitionId: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.deptApproverService.declineRequisition(requisitionId, req.user.userId, reason, req.ip, req.headers['user-agent']);
  }
}
