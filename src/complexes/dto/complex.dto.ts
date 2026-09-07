import { ComplexStatus } from '@prisma/client';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateComplexDto {
  @IsString() @MaxLength(120) name!: string;
  @IsString() @MaxLength(200) address!: string;
  @IsString() @MaxLength(80) city!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsInt() @Min(0) numberOfApartments?: number;
}
export class UpdateComplexDto extends PartialType(CreateComplexDto) {}
export class UpdateComplexStatusDto {
  @ApiPropertyOptional({ enum: ComplexStatus })
  @IsEnum(ComplexStatus)
  status!: ComplexStatus;
}
