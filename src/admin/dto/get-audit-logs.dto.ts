import { IsOptional, IsString, IsDateString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditActionType } from '@prisma/client';

export class GetAuditLogsDto {
  @IsOptional()
  @IsEnum(AuditActionType)
  actionType?: AuditActionType;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  skip?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  take?: number;
}