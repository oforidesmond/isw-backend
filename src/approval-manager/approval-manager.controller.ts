import { Controller } from '@nestjs/common';
import { ApprovalManagerService } from './approval-manager.service';

@Controller('approval-manager')
export class ApprovalManagerController {
  constructor(private readonly approvalManagerService: ApprovalManagerService) {}
}
