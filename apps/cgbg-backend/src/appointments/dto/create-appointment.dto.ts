import {
  IsNotEmpty,
  IsUUID,
  IsString,
  IsOptional,
  IsDateString,
  ValidateNested,
  IsBoolean,
  Equals,
  IsDefined,
  IsObject,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CreateCustomerDto } from '../../clients/dto/create-customer.dto';

class AppointmentFieldsDto {
  @IsUUID()
  @IsNotEmpty()
  branchId: string;
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;
  @IsDateString()
  @IsNotEmpty()
  startTime: string;
  @IsString()
  @IsOptional()
  notes?: string;
}
export class CreateAppointmentDto extends AppointmentFieldsDto {
  @IsUUID()
  @IsNotEmpty()
  customerId: string;
}
export class CreatePublicAppointmentDto extends AppointmentFieldsDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  slug: string;
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  clientInfo: CreateCustomerDto;
  @IsDefined()
  @IsBoolean()
  @Equals(true, { message: 'Debe aceptar los términos para reservar.' })
  termsAccepted: true;
  /** Token de Cloudflare Turnstile; obligatorio cuando hay clave secreta configurada. */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}
