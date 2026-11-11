import { IsNotEmpty, IsString, IsNumber, IsOptional, Min, Max, IsHexColor, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(5)
  @Max(480)
  @Type(() => Number)
  durationMin: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsString()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
