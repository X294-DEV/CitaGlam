import { IsNotEmpty, IsDateString, IsString, IsOptional } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsDateString()
  @IsNotEmpty()
  newStartTime: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
