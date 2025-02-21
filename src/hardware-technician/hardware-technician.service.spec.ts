import { Test, TestingModule } from '@nestjs/testing';
import { HardwareTechnicianService } from './hardware-technician.service';

describe('HardwareTechnicianService', () => {
  let service: HardwareTechnicianService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HardwareTechnicianService],
    }).compile();

    service = module.get<HardwareTechnicianService>(HardwareTechnicianService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
