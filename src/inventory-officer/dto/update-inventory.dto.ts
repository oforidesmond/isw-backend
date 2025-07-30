import { IsString, IsOptional, IsEnum, IsBoolean, ValidateIf, Validate, IsIn } from 'class-validator';
import { InventoryStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

class ExclusiveDeviceFieldsValidator {
  static validate(dto: UpdateDeviceDetailsDto): boolean {
    const deviceTypes = ['LAPTOP', 'DESKTOP', 'PRINTER', 'UPS', 'OTHER'];
    const fieldsByType = {
      LAPTOP: ['laptopBrand', 'laptopModel', 'laptopSerialNumber', 'laptopMacAddress', 'laptopProcessorType', 'laptopMemorySize', 'laptopStorageDriveType', 'laptopStorageDriveSize', 'laptopOperatingSystem', 'laptopEndpointSecurity', 'laptopSpiceworksMonitoring'],
      DESKTOP: ['desktopBrand', 'desktopModel', 'desktopSerialNumber', 'desktopMonitorBrand', 'desktopMonitorModel', 'desktopMonitorSerialNumber', 'desktopMacAddress', 'desktopProcessorType', 'desktopMemorySize', 'desktopStorageDriveType', 'desktopStorageDriveSize', 'desktopOperatingSystem', 'desktopEndpointSecurity', 'desktopSpiceworksMonitoring'],
      PRINTER: ['printerBrand', 'printerModel', 'printerSerialNumber', 'printerMacAddress', 'printerTonerNumber'],
      UPS: ['upsBrand', 'upsModel', 'upsSerialNumber'],
      OTHER: ['otherBrand', 'otherModel', 'otherSerialNumber', 'otherMacAddress', 'deviceTypeOther'],
    };

    const providedFields = Object.keys(dto).filter(key => key !== 'deviceType' && dto[key] !== undefined);
    const allowedFields = fieldsByType[dto.deviceType] || [];
    const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

    return invalidFields.length === 0;
  }
}

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

  @Validate(ExclusiveDeviceFieldsValidator, {
    message: 'Payload contains fields for incorrect device types',
  })
  exclusiveFields: boolean;

  @ValidateIf(o => o.deviceType === 'LAPTOP')
  @IsOptional()
  @IsString()
  laptopBrand?: string;

  @ValidateIf(o => o.deviceType === 'LAPTOP')
  @IsOptional()
  @IsString()
  laptopModel?: string;

  @ValidateIf(o => o.deviceType === 'LAPTOP')
  @IsOptional()
  @IsString()
  laptopSerialNumber?: string;

  @ValidateIf(o => o.deviceType === 'LAPTOP')
  @IsString()
  @IsOptional()
  laptopMacAddress?: string;

  @ValidateIf(o => o.deviceType === 'LAPTOP')
  @IsString()
  @IsOptional()
  laptopProcessorType?: string;

  @ValidateIf(o => o.deviceType === 'LAPTOP')
  @IsString()
  @IsOptional()
  laptopMemorySize?: string;

  @ValidateIf(o => o.deviceType === 'LAPTOP')
  @IsString()
  @IsOptional()
  laptopStorageDriveType?: string;

  @ValidateIf(o => o.deviceType === 'LAPTOP')
  @IsString()
  @IsOptional()
  laptopStorageDriveSize?: string;

  @ValidateIf(o => o.deviceType === 'LAPTOP')
  @IsString()
  @IsOptional()
  laptopOperatingSystem?: string;

  @ValidateIf(o => o.deviceType === 'LAPTOP')
  @IsBoolean()
  @IsOptional()
  @IsIn(['true', 'false', '', null, true, false]) 
  @Transform(({ value }) => value === 'true' || value === true)
  laptopEndpointSecurity?: boolean | string | null;

  @ValidateIf(o => o.deviceType === 'LAPTOP')
  @IsBoolean()
  @IsOptional()
  @IsIn(['true', 'false', '', null, true, false]) 
  @Transform(({ value }) => value === 'true' || value === true)
  laptopSpiceworksMonitoring?: boolean | string | null;

  @ValidateIf(o => o.deviceType === 'DESKTOP')
  @IsOptional()
  @IsString()
  desktopBrand?: string;

  @ValidateIf(o => o.deviceType === 'DESKTOP')
  @IsOptional()
  @IsString()
  desktopModel?: string;

  @ValidateIf(o => o.deviceType === 'DESKTOP')
  @IsOptional()
  @IsString()
  desktopSerialNumber?: string;

  @ValidateIf(o => o.deviceType === 'DESKTOP')
  @IsString()
  @IsOptional()
  desktopMonitorBrand?: string;

  @ValidateIf(o => o.deviceType === 'DESKTOP')
  @IsString()
  @IsOptional()
  desktopMonitorModel?: string;

  @ValidateIf(o => o.deviceType === 'DESKTOP')
  @IsString()
  @IsOptional()
  desktopMonitorSerialNumber?: string;

  @ValidateIf(o => o.deviceType === 'DESKTOP')
  @IsString()
  @IsOptional()
  desktopMacAddress?: string;

  @ValidateIf(o => o.deviceType === 'DESKTOP')
  @IsString()
  @IsOptional()
  desktopProcessorType?: string;

  @ValidateIf(o => o.deviceType === 'DESKTOP')
  @IsString()
  @IsOptional()
  desktopMemorySize?: string;

  @ValidateIf(o => o.deviceType === 'DESKTOP')
  @IsString()
  @IsOptional()
  desktopStorageDriveType?: string;

  @ValidateIf(o => o.deviceType === 'DESKTOP')
  @IsString()
  @IsOptional()
  desktopStorageDriveSize?: string;

  @ValidateIf(o => o.deviceType === 'DESKTOP')
  @IsString()
  @IsOptional()
  desktopOperatingSystem?: string;

  @ValidateIf(o => o.deviceType === 'DESKTOP')
  @IsBoolean()
  @IsOptional()
  @IsIn(['true', 'false', '', null, true, false]) 
  @Transform(({ value }) => value === 'true' || value === true)
  desktopEndpointSecurity?: boolean | string | null;

  @ValidateIf(o => o.deviceType === 'DESKTOP')
  @IsBoolean()
  @IsOptional()
  @IsIn(['true', 'false', '', null, true, false]) 
  @Transform(({ value }) => value === 'true' || value === true)
  desktopSpiceworksMonitoring?: boolean | string | null;

  @ValidateIf(o => o.deviceType === 'PRINTER')
  @IsOptional()
  @IsString()
  printerBrand?: string;

  @ValidateIf(o => o.deviceType === 'PRINTER')
  @IsOptional()
  @IsString()
  printerModel?: string;

  @ValidateIf(o => o.deviceType === 'PRINTER')
  @IsOptional()
  @IsString()
  printerSerialNumber?: string;

  @ValidateIf(o => o.deviceType === 'PRINTER')
  @IsString()
  @IsOptional()
  printerMacAddress?: string;

  @ValidateIf(o => o.deviceType === 'PRINTER')
  @IsString()
  @IsOptional()
  printerTonerNumber?: string;

  @ValidateIf(o => o.deviceType === 'UPS')
  @IsOptional()
  @IsString()
  upsBrand?: string;

  @ValidateIf(o => o.deviceType === 'UPS')
  @IsOptional()
  @IsString()
  upsModel?: string;

  @ValidateIf(o => o.deviceType === 'UPS')
  @IsOptional()
  @IsString()
  upsSerialNumber?: string;

  @ValidateIf(o => o.deviceType === 'OTHER')
  @IsOptional()
  @IsString()
  otherBrand?: string;

  @ValidateIf(o => o.deviceType === 'OTHER')
  @IsOptional()
  @IsString()
  otherModel?: string;

  @ValidateIf(o => o.deviceType === 'OTHER')
  @IsOptional()
  @IsString()
  otherSerialNumber?: string;

  @ValidateIf(o => o.deviceType === 'OTHER')
  @IsString()
  @IsOptional()
  otherMacAddress?: string;

  @ValidateIf(o => o.deviceType === 'OTHER')
  @IsString()
  @IsOptional()
  deviceTypeOther?: string;
}