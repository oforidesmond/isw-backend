import { SetMetadata } from '@nestjs/common';

export const SetPermissions = (permissions: { resource: string; actions: string[] }[]) => 
  SetMetadata('permissions', permissions);

