import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBusinessRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es obligatorio.' })
  fullName: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del negocio es obligatorio.' })
  businessName: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio.' })
  phone: string;

  @IsString()
  @IsOptional()
  turnstileToken?: string;
}
