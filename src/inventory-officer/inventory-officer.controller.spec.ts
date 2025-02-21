import { Test, TestingModule } from '@nestjs/testing';
import { InventoryOfficerController } from './inventory-officer.controller';
import { InventoryOfficerService } from './inventory-officer.service';

describe('InventoryOfficerController', () => {
  let controller: InventoryOfficerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryOfficerController],
      providers: [InventoryOfficerService],
    }).compile();

    controller = module.get<InventoryOfficerController>(InventoryOfficerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
