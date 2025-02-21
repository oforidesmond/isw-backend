import { Controller } from '@nestjs/common';
import { InventoryOfficerService } from './inventory-officer.service';

@Controller('inventory-officer')
export class InventoryOfficerController {
  constructor(private readonly inventoryOfficerService: InventoryOfficerService) {}
}
