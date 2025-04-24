import { IsString, IsOptional, Length } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  location?: string;
}