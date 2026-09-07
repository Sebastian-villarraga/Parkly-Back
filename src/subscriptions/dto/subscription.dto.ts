import { PartialType } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
export class CreateSubscriptionDto {
  @IsString() complexId!: string;
  @IsString() planId!: string;
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsInt() @Min(1) minimumCommitmentMonths?: number;
  @IsDateString() nextBillingDate!: string;
}
export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {
  @IsOptional() @IsEnum(SubscriptionStatus) status?: SubscriptionStatus;
}
