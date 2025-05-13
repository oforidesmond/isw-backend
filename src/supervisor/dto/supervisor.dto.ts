import { IsOptional, IsString, IsEnum, IsDateString, IsNumberString, isEnum } from 'class-validator';
import { DeviceType, InventoryStatus, IssueType, Priority, RequisitionStatus, Urgency } from '@prisma/client';

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
  approverId?: string; // deptApproverId or itdApproverId
}

// Stock Reports

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
  departmentId?: string; // For StockIssued report, via Requisition

  @IsOptional()
  @IsNumberString()
  minQuantity?: string; // For low stock thresholds, e.g., '10'

  @IsOptional()
  @IsString()
  issuedById?: string; // For StockIssued report
}

export class InventoryReportDto {
  @IsOptional()
  @IsDateString()
  startPurchaseDate?: string; // e.g., '2020-01-01'

  @IsOptional()
  @IsDateString()
  endPurchaseDate?: string; // e.g., '2023-12-31'

  @IsOptional()
  @IsNumberString()
  minAgeYears?: string; // e.g., '3' for assets older than 3 years

  @IsOptional()
  @IsNumberString()
  maxAgeYears?: string; // e.g., '5' for assets younger than 5 years

  @IsOptional()
  @IsNumberString()
  warrantyPeriodMonths?: string; // e.g., '24' for assets with 2-year warranty

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  unitId?: string; // Filter by unit (e.g., specific office or lab)

  @IsOptional()
  @IsString()
  itItemId?: string;

  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType; // e.g., 'LAPTOP', 'PRINTER'

  @IsOptional()
  @IsString()
  brand?: string; // Filters ITItem.brand or device-specific brand (e.g., desktopBrand)

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string; // Filters device-specific serial numbers

  @IsOptional()
  @IsEnum(InventoryStatus)
  status?: InventoryStatus; // e.g., 'ACTIVE', 'OBSOLETE'

  @IsOptional()
  @IsString()
  processorType?: string; // For laptops/desktops

  @IsOptional()
  @IsString()
  tonerNumber?: string; // For printers

  @IsOptional()
  @IsString()
  lpoReference?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;
}