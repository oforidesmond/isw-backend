import { Body, Controller, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { ApprovalManagerService } from './approval-manager.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { Roles } from 'auth/roles.decorator';

@Controller('approval')
export class ApprovalManagerController {
  constructor( private readonly deptApproverService: ApprovalManagerService,) {}

    @Patch('dept/req/:reqId/approve')
  @UseGuards(JwtAuthGuard)
  @Roles('dept_approver')
  async approveDeptRequisition(@Param('reqId') requisitionId: string, @Request() req) {
    return this.deptApproverService.approveRequisition(requisitionId, req.user.userId, req.ip, req.headers['user-agent']);
  }

  @Patch('dept/req/:reqId/decline')
  @UseGuards(JwtAuthGuard)
  @Roles('dept_approver')
  async declineDeptRequisition(
    @Param('reqId') requisitionId: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.deptApproverService.declineRequisition(requisitionId, req.user.userId, reason, req.ip, req.headers['user-agent']);
  }
}
