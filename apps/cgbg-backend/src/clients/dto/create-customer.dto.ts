import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export function normalizePhone(value: unknown): unknown {
  return typeof value === 'string' ? value.replace(/[\s().-]/g, '') : value;
}

export class CreateCustomerDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty()
  firstName: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty()
  lastName: string;

  @IsEmail() @IsNotEmpty()
  email: string;

  @Transform(({ value }) => normalizePhone(value))
  @IsString() @Matches(/^\+[1-9]\d{1,14}$/, { message: 'phone debe ser internacional con + y código de país.' })
  phone: string;
}
