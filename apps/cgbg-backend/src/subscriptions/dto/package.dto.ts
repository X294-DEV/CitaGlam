import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsObject } from 'class-validator';

export class CreatePackageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  price: number;

  @IsString()
  @IsNotEmpty()
  interval: string; // monthly, yearly

  @IsNumber()
  @IsOptional()
  trialDays?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsObject()
  @IsOptional()
  limits?: any;

  @IsObject()
  @IsOptional()
  features?: any;

  @IsObject()
  @IsOptional()
  pricesByTerm?: any;
}

export class UpdatePackageDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  interval?: string;

  @IsNumber()
  @IsOptional()
  trialDays?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsObject()
  @IsOptional()
  limits?: any;

  @IsObject()
  @IsOptional()
  features?: any;

  @IsObject()
  @IsOptional()
  pricesByTerm?: any;
}
