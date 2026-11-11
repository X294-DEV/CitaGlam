import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class SendTestTemplateDto {
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;
}
