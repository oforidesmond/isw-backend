import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { InventoryStatus } from '@prisma/client';

export class UpdateInventoryDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsEnum(InventoryStatus)
  @IsOptional()
  status?: InventoryStatus;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsBoolean()
  @IsOptional()
  markedObsolete?: boolean;

  @IsBoolean()
  @IsOptional()
  disposed?: boolean;
}

export class UpdateDeviceDetailsDto {
  @IsEnum(['LAPTOP', 'DESKTOP', 'PRINTER', 'UPS', 'OTHER'])
  deviceType: 'LAPTOP' | 'DESKTOP' | 'PRINTER' | 'UPS' | 'OTHER';

  // Laptop-specific
  @IsString()
  @IsOptional()
  laptopBrand?: string;

  @IsString()
  @IsOptional()
  laptopModel?: string;

  @IsString()
  @IsOptional()
  laptopSerialNumber?: string;

  @IsString()
  @IsOptional()
  laptopMacAddress?: string;

  @IsString()
  @IsOptional()
  laptopProcessorType?: string;

  @IsString()
  @IsOptional()
  laptopMemorySize?: string;

  @IsString()
  @IsOptional()
  laptopStorageDriveType?: string;

  @IsString()
  @IsOptional()
  laptopStorageDriveSize?: string;

  @IsString()
  @IsOptional()
  laptopOperatingSystem?: string;

  @IsBoolean()
  @IsOptional()
  laptopEndpointSecurity?: boolean;

  @IsBoolean()
  @IsOptional()
  laptopSpiceworksMonitoring?: boolean;

  // Desktop-specific
  @IsString()
  @IsOptional()
  desktopBrand?: string;

  @IsString()
  @IsOptional()
  desktopModel?: string;

  @IsString()
  @IsOptional()
  desktopSerialNumber?: string;

  @IsString()
  @IsOptional()
  desktopMonitorBrand?: string;

  @IsString()
  @IsOptional()
  desktopMonitorModel?: string;

  @IsString()
  @IsOptional()
  desktopMonitorSerialNumber?: string;

  @IsString()
  @IsOptional()
  desktopMacAddress?: string;

  @IsString()
  @IsOptional()
  desktopProcessorType?: string;

  @IsString()
  @IsOptional()
  desktopMemorySize?: string;

  @IsString()
  @IsOptional()
  desktopStorageDriveType?: string;

  @IsString()
  @IsOptional()
  desktopStorageDriveSize?: string;

  @IsString()
  @IsOptional()
  desktopOperatingSystem?: string;

  @IsBoolean()
  @IsOptional()
  desktopEndpointSecurity?: boolean;

  @IsBoolean()
  @IsOptional()
  desktopSpiceworksMonitoring?: boolean;

  // Printer-specific
  @IsString()
  @IsOptional()
  printerBrand?: string;

  @IsString()
  @IsOptional()
  printerModel?: string;

  @IsString()
  @IsOptional()
  printerSerialNumber?: string;

  @IsString()
  @IsOptional()
  printerMacAddress?: string;

  @IsString()
  @IsOptional()
  printerTonerNumber?: string;

  // UPS-specific
  @IsString()
  @IsOptional()
  upsBrand?: string;

  @IsString()
  @IsOptional()
  upsModel?: string;

  @IsString()
  @IsOptional()
  upsSerialNumber?: string;

  // Other-specific
  @IsString()
  @IsOptional()
  otherBrand?: string;

  @IsString()
  @IsOptional()
  otherModel?: string;

  @IsString()
  @IsOptional()
  otherSerialNumber?: string;

  @IsString()
  @IsOptional()
  otherMacAddress?: string;

  @IsString()
  @IsOptional()
  deviceTypeOther?: string; 
}