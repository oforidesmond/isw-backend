import { Test, TestingModule } from '@nestjs/testing';
import { HardwareTechnicianController } from './hardware-technician.controller';
import { HardwareTechnicianService } from './hardware-technician.service';

describe('HardwareTechnicianController', () => {
  let controller: HardwareTechnicianController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HardwareTechnicianController],
      providers: [HardwareTechnicianService],
    }).compile();

    controller = module.get<HardwareTechnicianController>(HardwareTechnicianController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
