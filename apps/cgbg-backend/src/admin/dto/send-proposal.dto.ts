import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class SendProposalDto {
  @IsString()
  @IsNotEmpty({ message: 'El paquete es obligatorio.' })
  packageId: string;

  @IsNumber()
  @Min(1, { message: 'El plazo mínimo es de 1 mes.' })
  monthsCount: number;

  @IsNumber({}, { message: 'El precio debe ser un número válido.' })
  @Min(0, { message: 'El precio no puede ser negativo.' })
  negotiatedPrice: number;
}
