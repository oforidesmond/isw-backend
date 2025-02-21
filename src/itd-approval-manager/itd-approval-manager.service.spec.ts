import { Test, TestingModule } from '@nestjs/testing';
import { ItdApprovalManagerService } from './itd-approval-manager.service';

describe('ItdApprovalManagerService', () => {
  let service: ItdApprovalManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ItdApprovalManagerService],
    }).compile();

    service = module.get<ItdApprovalManagerService>(ItdApprovalManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
