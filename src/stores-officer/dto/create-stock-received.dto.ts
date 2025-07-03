import { DeviceType } from '@prisma/client';
import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  IsDateString,
  IsEnum,
} from 'class-validator';

export class CreateStockReceivedDto {
  @IsString()
  lpoReference: string;

  @IsString()
  voucherNumber: string;

  @IsDateString({}, { message: 'lpoDate must be a valid ISO 8601 date string' })
  lpoDate: string; 

  @IsString()
  itItemId: string;

  @IsInt({ message: 'quantityReceived must be an integer number' })
  @Min(1, { message: 'Quantity received must be at least 1' })
  quantityReceived: number;

  @IsString()
  supplierId: string;

  @IsInt({ message: 'warrantyPeriod must be an integer number' })
  @Min(0, { message: 'Warranty period cannot be negative (0 means no warranty)' })
  warrantyPeriod: number; 

  @IsDateString({}, { message: 'dateReceived must be a valid ISO 8601 date string' })
  dateReceived: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class CreateSupplierDto {

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  contactDetails?: string;

  @IsString()
  lpoReference?: string;

  @IsDateString()
  lpoDate?: Date;

  @IsString()
  voucherNumber?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class StockLevelsFilterDto {
  @IsOptional()
  @IsString()
  brand?: string; // e.g., "Dell"

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsEnum(DeviceType, { message: "deviceType must be one of: LAPTOP, DESKTOP, PRINTER, UPS, OTHER" })
  deviceType?: DeviceType; // Use DeviceType enum directly

  @IsOptional()
  @IsInt()
  @Min(0)
  minQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxQuantity?: number;

  // @IsOptional()
  // @IsInt()
  // @Min(1)
  // page?: number = 1;

  // @IsOptional()
  // @IsInt()
  // @Min(1)
  // limit?: number = 10;
}
