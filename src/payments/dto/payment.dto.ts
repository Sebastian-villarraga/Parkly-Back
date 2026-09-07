import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
export class CreateChargeDto {
  @IsString() residentId!: string;
  @IsString() concept!: string;
  @IsNumber() @IsPositive() amount!: number;
  @IsDateString() dueDate!: string;
}
export class CreatePaymentDto {
  @IsString() chargeId!: string;
  @IsNumber() @IsPositive() amount!: number;
  @IsString() method!: string;
  @IsOptional() @IsString() reference?: string;
}
