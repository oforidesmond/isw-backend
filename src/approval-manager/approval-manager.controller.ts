import { Body, Controller, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { ApprovalManagerService } from './approval-manager.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';

@Controller('approval')
export class ApprovalManagerController {
  constructor( private readonly deptApproverService: ApprovalManagerService,) {}

    @Patch('dept/req/:reqId/approve')
  @UseGuards(JwtAuthGuard)
  async approveDeptRequisition(@Param('reqId') requisitionId: string, @Request() req) {
    return this.deptApproverService.approveRequisition(requisitionId, req.user.userId, req.ip, req.headers['user-agent']);
  }

  @Patch('dept/req/:reqId/decline')
  @UseGuards(JwtAuthGuard)
  async declineDeptRequisition(
    @Param('reqId') requisitionId: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.deptApproverService.declineRequisition(requisitionId, req.user.userId, reason, req.ip, req.headers['user-agent']);
  }
}
