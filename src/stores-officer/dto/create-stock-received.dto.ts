import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  IsDateString,
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