import { Controller } from '@nestjs/common';
import { HardwareTechnicianService } from './hardware-technician.service';

@Controller('hardware-technician')
export class HardwareTechnicianController {
  constructor(private readonly hardwareTechnicianService: HardwareTechnicianService) {}
}
