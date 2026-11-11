import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsUUID } from 'class-validator';

export class RegisterBusinessDto {
  // Business Info
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  slug: string;

  @IsUUID()
  @IsNotEmpty()
  packageId: string;

  // Admin User Info
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(32)
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;
}
