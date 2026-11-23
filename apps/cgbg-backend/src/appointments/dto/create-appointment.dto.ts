import { IsNotEmpty, IsUUID, IsString, IsOptional, IsDateString, ValidateNested, IsEmail, IsBoolean, Matches } from 'class-validator';
import { normalizePhone } from '../../clients/dto/create-customer.dto';
import { Transform, Type } from 'class-transformer';

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

  @Transform(({ value }) => normalizePhone(value))
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/)
  phone: string;

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
