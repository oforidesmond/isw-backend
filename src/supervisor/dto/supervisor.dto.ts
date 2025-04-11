import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { IssueType, Priority } from '@prisma/client';

export class MaintenanceReportDto {
  @IsOptional()
  @IsDateString()
  startDate?: string; // e.g., '2024-01-01'

  @IsOptional()
  @IsDateString()
  endDate?: string; // e.g., '2024-12-31'

  @IsOptional()
  @IsEnum(IssueType)
  issueType?: IssueType; // e.g., 'HARDWARE', 'SOFTWARE'

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority; // e.g., 'HIGH', 'MEDIUM', 'LOW'

  @IsOptional()
  @IsString()
  status?: 'OPEN' | 'RESOLVED'; // Filter by resolution status

  @IsOptional()
  @IsString()
  assetId?: string; // For asset-specific reports
}

export class WorkReportDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  technicianId?: string; // Specific technician or all
}

export class OverdueTicketsReportDto {
  @IsOptional()
  @IsString()
  thresholdDays?: string; // e.g., '30' for tickets open > 30 days

  @IsOptional()
  @IsString()
  departmentId?: string;
}