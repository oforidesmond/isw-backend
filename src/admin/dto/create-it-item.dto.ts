import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  IsEnum,
  IsObject, 
} from 'class-validator';
import { DeviceType, ItemClass } from '@prisma/client'; 

export class CreateITItemDto {

  @IsEnum(DeviceType, { message: 'deviceType must be a valid DeviceType enum value' })
  deviceType: DeviceType; 

  @IsEnum(ItemClass, { message: 'itemClass must be a valid ItemClass enum value' })
  itemClass: ItemClass;

  @IsString()
  brand: string;

  @IsString()
  model: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  defaultWarranty?: number;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsObject()
  @IsOptional()
  validationRules?: Record<string, any>;

  @IsObject()
  @IsOptional()
  specifications?: Record<string, any>;
}