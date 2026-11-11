import { IsString, IsNotEmpty, IsOptional, IsPhoneNumber } from 'class-validator';

export class UpdateBranchDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsPhoneNumber()
  @IsOptional()
  phone?: string;
}
