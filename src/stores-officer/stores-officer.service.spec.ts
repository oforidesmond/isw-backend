import { Test, TestingModule } from '@nestjs/testing';
import { StoresOfficerService } from './stores-officer.service';

describe('StoresOfficerService', () => {
  let service: StoresOfficerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StoresOfficerService],
    }).compile();

    service = module.get<StoresOfficerService>(StoresOfficerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
