import { IsNotEmpty, IsUUID, IsInt, IsString, IsOptional, IsIn, IsEnum } from 'class-validator';

export class CreateSubscriptionPaymentDto {
  @IsUUID()
  @IsNotEmpty()
  packageId: string;

  @IsInt()
  @IsNotEmpty()
  @IsOptional()
  monthsCount: number = 1; // 1, 3, 6, 12 as per recommendation

  @IsString()
  @IsOptional()
  evidenceUrl?: string;
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ProcessSubscriptionPaymentDto {
  @IsNotEmpty()
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}
