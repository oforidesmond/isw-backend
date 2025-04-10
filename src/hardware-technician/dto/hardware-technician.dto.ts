import { IsString, IsEnum, IsOptional } from 'class-validator';
import { IssueType, Priority } from '@prisma/client';

export class CreateMaintenanceTicketDto {
  @IsString()
  assetId: string; // Matches Inventory.id

  @IsString()
  userId: string; // The user reporting the issue

  @IsEnum(IssueType)
  issueType: IssueType;

  @IsString()
  departmentId: string;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsString()
  description: string;

  @IsEnum(Priority)
  priority: Priority;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class SearchDevicesDto {
  @IsString()
  query: string;
}