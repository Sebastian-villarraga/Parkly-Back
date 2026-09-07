import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
export class CreatePlanDto {
  @IsString() name!: string;
  @IsNumber() @Min(0) monthlyPrice!: number;
  @IsInt() @IsPositive() maxApartments!: number;
  @IsInt() @IsPositive() maxParkingSpaces!: number;
  @IsInt() @IsPositive() maxSecurityUsers!: number;
  @IsObject() features!: Record<string, boolean | string | number>;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdatePlanDto extends PartialType(CreatePlanDto) {}
