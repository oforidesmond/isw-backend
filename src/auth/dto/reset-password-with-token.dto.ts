import { IsString } from 'class-validator';

export class ResetPasswordWithTokenDto {
  @IsString()
  token: string;

  @IsString()
  newPassword: string;
}