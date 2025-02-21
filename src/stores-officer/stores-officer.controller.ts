import { Controller } from '@nestjs/common';
import { StoresOfficerService } from './stores-officer.service';

@Controller('stores-officer')
export class StoresOfficerController {
  constructor(private readonly storesOfficerService: StoresOfficerService) {}
}
