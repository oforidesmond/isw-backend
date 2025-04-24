import { IsString, Length, IsUUID } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsUUID()
  departmentId: string;
}