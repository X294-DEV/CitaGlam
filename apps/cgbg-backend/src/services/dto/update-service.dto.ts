import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceDto } from './create-service.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
