import { IsInt, Min, Max, Matches, IsBoolean, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class BusinessScheduleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):(00|30)$/, {
    message: 'La hora de apertura debe ser en punto o media hora (ej: 09:00, 09:30).',
  })
  openTime: string;

  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):(00|30)$/, {
    message: 'La hora de cierre debe ser en punto o media hora (ej: 18:00, 18:30).',
  })
  closeTime: string;

  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):(00|30)$/, {
    message: 'La hora de apertura especial debe ser en punto o media (ej: 16:00, 16:30).',
  })
  openTime2?: string;

  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):(00|30)$/, {
    message: 'La hora de cierre especial debe ser en punto o media (ej: 20:00, 20:30).',
  })
  closeTime2?: string;

  @IsBoolean()
  isOpen: boolean;
}

export class UpdateBranchSchedulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessScheduleDto)
  schedules: BusinessScheduleDto[];
}
