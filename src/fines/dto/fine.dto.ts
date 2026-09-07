import { PartialType } from '@nestjs/swagger';
import { FineStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
export class CreateFineDto {
  @IsString() residentId!: string;
  @IsString() reason!: string;
  @IsNumber() @IsPositive() amount!: number;
  @IsDateString() dueDate!: string;
}
export class UpdateFineDto extends PartialType(CreateFineDto) {
  @IsOptional() @IsEnum(FineStatus) status?: FineStatus;
}
