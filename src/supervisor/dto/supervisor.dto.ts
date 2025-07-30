import { IsOptional, IsString, IsEnum, IsDateString, IsNumberString, isEnum } from 'class-validator';
import { DeviceType, InventoryStatus, IssueType, Priority, RequisitionStatus, Urgency } from '@prisma/client';

export class MaintenanceReportDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(IssueType)
  issueType?: IssueType;
  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsString()
  status?: 'OPEN' | 'RESOLVED';

  @IsOptional()
  @IsString()
  assetId?: string;
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
  technicianId?: string;
}

export class OverdueTicketsReportDto {
  @IsOptional()
  @IsString()
  thresholdDays?: string;
  @IsOptional()
  @IsString()
  departmentId?: string;
}

export class RequisitionReportDto {
  @IsOptional()
  @IsDateString()
  startDate?: string; 

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(RequisitionStatus)
  status?: RequisitionStatus;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsEnum(Urgency)
  urgency?: Urgency;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  itItemId?: string;
}

export class RequisitionApprovalDelaysDto {
  @IsOptional()
  @IsNumberString()
  thresholdDays?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  approverId?: string;
}

export class StockReportDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  itItemId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsNumberString()
  minQuantity?: string;

  @IsOptional()
  @IsString()
  issuedById?: string; 
}

export class InventoryReportDto {
  @IsOptional()
  @IsDateString()
  startPurchaseDate?: string;

  @IsOptional()
  @IsDateString()
  endPurchaseDate?: string;

  @IsOptional()
  @IsNumberString()
  minAgeYears?: string;

  @IsOptional()
  @IsNumberString()
  maxAgeYears?: string;

  @IsOptional()
  @IsNumberString()
  warrantyPeriodMonths?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  itItemId?: string;

  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsEnum(InventoryStatus)
  status?: InventoryStatus;

  @IsOptional()
  @IsString()
  processorType?: string; 

  @IsOptional()
  @IsString()
  tonerNumber?: string;

  @IsOptional()
  @IsString()
  lpoReference?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;
}