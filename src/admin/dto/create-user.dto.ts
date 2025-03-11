export class CreateUserDto {
  staffId: string;
  name: string;
  email: string;
  roleName: string;
  departmentId?: string;
  unitId?: string;
  roomNo?: string;
}