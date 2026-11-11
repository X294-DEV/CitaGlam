import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEmail,
  IsOptional,
} from 'class-validator';

export class TestEmailConfigDto {
  @IsString()
  @IsNotEmpty()
  host: string;

  @IsNumber()
  port: number;

  @IsString()
  @IsNotEmpty()
  user: string;

  @IsString()
  @IsNotEmpty()
  pass: string;

  @IsEmail()
  @IsNotEmpty()
  fromEmail: string;

  @IsString()
  @IsOptional()
  fromName?: string;
}
