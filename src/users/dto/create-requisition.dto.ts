import { IsString, IsInt, Min, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum Urgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class CreateRequisitionDto {
  @IsString()
  @IsOptional()
  itItemId?: string; 

  @IsString()
  itemDescription: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsEnum(Urgency)
  @IsOptional()
  urgency?: Urgency;

  @IsString()
  purpose: string;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsString()
  departmentId: string;

  @IsString()
  @IsOptional()
  roomNo?: string;

  @IsString()
  staffId: string;
}