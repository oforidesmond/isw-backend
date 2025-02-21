import { Controller } from '@nestjs/common';
import { ItdApprovalManagerService } from './itd-approval-manager.service';

@Controller('itd-approval-manager')
export class ItdApprovalManagerController {
  constructor(private readonly itdApprovalManagerService: ItdApprovalManagerService) {}
}
