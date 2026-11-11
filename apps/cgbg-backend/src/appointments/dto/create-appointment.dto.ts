import { IsNotEmpty, IsUUID, IsString, IsOptional, IsDateString, ValidateNested, IsEmail, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class ClientInfo {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  termsAccepted?: boolean;
}

export class CreateAppointmentDto {
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string; // ISO String normalized to HH:00

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClientInfo)
  clientInfo?: ClientInfo;
}
