import { IsDateString, IsString, IsNotEmpty, IsBoolean, IsOptional, Matches } from 'class-validator';

export class CreateExceptionDto {
  @IsDateString()
  @IsNotEmpty()
  exceptionDate: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsBoolean()
  @IsOptional()
  isFullDay?: boolean;

  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):00$/, {
    message: 'La hora de inicio de la excepción debe ser en punto (ej: 09:00).',
  })
  startTime?: string;

  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):00$/, {
    message: 'La hora de fin de la excepción debe ser en punto (ej: 18:00).',
  })
  endTime?: string;
}
