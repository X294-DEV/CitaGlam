import { IsString, IsEmail, IsNotEmpty, IsOptional, MaxLength, Matches, IsNumber, Min } from 'class-validator';

export class CreateExpressTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede contener letras minúsculas, números y guiones.',
  })
  slug: string;

  @IsString()
  @IsNotEmpty()
  packageId: string;

  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @IsString()
  @IsNotEmpty()
  adminFirstName: string;

  @IsString()
  @IsOptional()
  adminLastName?: string;

  @IsNumber()
  @Min(1)
  monthsCount: number;

  @IsNumber()
  @Min(0)
  amount: number;
}
