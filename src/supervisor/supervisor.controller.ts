import { Controller } from '@nestjs/common';
import { SupervisorService } from './supervisor.service';

@Controller('supervisor')
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}
}
