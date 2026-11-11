import { IsEmail, IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateStaffDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(Role)
  role: Role; // Should be limited to ADMIN or STAFF in controller logic
}
