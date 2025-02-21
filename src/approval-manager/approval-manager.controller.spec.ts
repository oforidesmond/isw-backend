import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalManagerController } from './approval-manager.controller';
import { ApprovalManagerService } from './approval-manager.service';

describe('ApprovalManagerController', () => {
  let controller: ApprovalManagerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApprovalManagerController],
      providers: [ApprovalManagerService],
    }).compile();

    controller = module.get<ApprovalManagerController>(ApprovalManagerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
