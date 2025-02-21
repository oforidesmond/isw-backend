import { Test, TestingModule } from '@nestjs/testing';
import { InventoryOfficerService } from './inventory-officer.service';

describe('InventoryOfficerService', () => {
  let service: InventoryOfficerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryOfficerService],
    }).compile();

    service = module.get<InventoryOfficerService>(InventoryOfficerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
