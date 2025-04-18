import { Body, Controller, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { InventoryOfficerService } from './inventory-officer.service';
import { JwtAuthGuard } from 'auth/jwt-auth.guard';
import { RolesGuard } from 'auth/roles.guard';
import { Roles } from 'auth/roles.decorator';
import { UpdateDeviceDetailsDto, UpdateInventoryDto } from './dto/update-inventory.dto';

@Controller('inventory')
export class InventoryOfficerController {
  constructor(private readonly inventoryOfficerService: InventoryOfficerService) {}

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('inventory_officer')
  async getAllInventory() {
    return this.inventoryOfficerService.getAllInventory();
  }

  @Patch('update/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('inventory_officer')
  async updateInventory(
    @Param('id') inventoryId: string,
    @Body() dto: UpdateInventoryDto,
    @Request() req,
  ) {
    return this.inventoryOfficerService.updateInventory(
      inventoryId,
      req.user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch('update/:id/device-details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('inventory_officer')
  async updateDeviceDetails(
    @Param('id') inventoryId: string,
    @Body() dto: UpdateDeviceDetailsDto,
    @Request() req,
  ) {
    return this.inventoryOfficerService.updateDeviceDetails(
      inventoryId,
      req.user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
