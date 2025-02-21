import { IsString, IsEmail, MinLength, IsOptional  } from 'class-validator'; // For validation

export class CreateUserDto {
  @IsString()
  staffId: string; 

  @IsString()
  name: string;

  @IsEmail()
  email: string; 

  @IsString()
  @MinLength(6) 
  password: string;
  
  @IsString()
  @IsOptional()
  departmentId?: string; 

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsString()
  @IsOptional()
  roomNo?: string;

  @IsString()
  roleName: string;
}