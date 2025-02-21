import { Test, TestingModule } from '@nestjs/testing';
import { ItdApprovalManagerController } from './itd-approval-manager.controller';
import { ItdApprovalManagerService } from './itd-approval-manager.service';

describe('ItdApprovalManagerController', () => {
  let controller: ItdApprovalManagerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItdApprovalManagerController],
      providers: [ItdApprovalManagerService],
    }).compile();

    controller = module.get<ItdApprovalManagerController>(ItdApprovalManagerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
