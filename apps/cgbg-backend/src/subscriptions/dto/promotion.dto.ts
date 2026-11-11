import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';
import { PromotionType } from '@prisma/client';

export class CreatePromotionDto {
  @IsString({ message: 'El código debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El código promocional es obligatorio.' })
  @MaxLength(15, { message: 'El código no puede exceder los 15 caracteres.' })
  @Matches(/^[A-Z0-9]+$/, {
    message: 'El código solo puede contener letras mayúsculas y números.',
  })
  code: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'La descripción es demasiado larga.' })
  description?: string;

  @IsEnum(PromotionType)
  type: PromotionType;

  @IsNumber()
  @Min(0, { message: 'El valor no puede ser negativo.' })
  value: number;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'El límite de usos debe ser al menos 1.' })
  maxUses?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePromotionDto {
  @IsString()
  @IsOptional()
  @MaxLength(15)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'El código solo puede contener letras mayúsculas y números.',
  })
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  description?: string;

  @IsEnum(PromotionType)
  @IsOptional()
  type?: PromotionType;

  @IsNumber()
  @IsOptional()
  @Min(0)
  value?: number;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUses?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
