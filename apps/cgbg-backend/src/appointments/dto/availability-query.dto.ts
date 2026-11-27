import { IsOptional, IsString, IsUUID } from 'class-validator';
import type { AvailabilityRequest } from '@cgbg/shared-types';

export class AvailabilityQueryDto implements AvailabilityRequest {
  @IsUUID()
  branchId: string;

  @IsUUID()
  serviceId: string;

  // La validación de fecha calendario se comparte con AvailabilityService.
  @IsString()
  date: string;

  @IsOptional()
  @IsUUID()
  excludeAppointmentId?: string;
}
