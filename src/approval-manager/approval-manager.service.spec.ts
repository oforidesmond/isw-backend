import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalManagerService } from './approval-manager.service';

describe('ApprovalManagerService', () => {
  let service: ApprovalManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApprovalManagerService],
    }).compile();

    service = module.get<ApprovalManagerService>(ApprovalManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
