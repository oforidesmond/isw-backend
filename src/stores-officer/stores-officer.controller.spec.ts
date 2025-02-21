import { Test, TestingModule } from '@nestjs/testing';
import { StoresOfficerController } from './stores-officer.controller';
import { StoresOfficerService } from './stores-officer.service';

describe('StoresOfficerController', () => {
  let controller: StoresOfficerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoresOfficerController],
      providers: [StoresOfficerService],
    }).compile();

    controller = module.get<StoresOfficerController>(StoresOfficerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
