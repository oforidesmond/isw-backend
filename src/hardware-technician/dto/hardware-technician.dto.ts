import { IsString, IsEnum, IsOptional, IsNotEmpty, IsDateString } from 'class-validator';
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
  actionTaken?: string;

  @IsString()
  @IsOptional()
  technicianReturnedById?: string;

  @IsString()
  @IsOptional()
  dateResolved?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  technicianReceivedById?: string;
}

export class UpdateMaintenanceTicketDto {
  @IsString()
  @IsOptional()
  actionTaken?: string;

  @IsString()
  @IsOptional()
  technicianReturnedById?: string;

  @IsDateString()
  @IsOptional()
  dateResolved?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class SearchDevicesDto {
  @IsString()
  @IsNotEmpty()
  q: string;
}

export class FilterTicketsDto {
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsEnum(IssueType)
  @IsOptional()
  issueType?: IssueType;

  @IsString()
  @IsOptional()
  technicianReceivedById?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsDateString()
  @IsOptional()
  dateLoggedFrom?: string;

  @IsDateString()
  @IsOptional()
  dateLoggedTo?: string;

  @IsDateString()
  @IsOptional()
  dateResolvedFrom?: string;

  @IsDateString()
  @IsOptional()
  dateResolvedTo?: string;

  @IsString()
  @IsOptional()
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
}