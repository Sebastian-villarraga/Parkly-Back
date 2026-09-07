import { PartialType } from '@nestjs/swagger';
import { ApartmentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateApartmentDto {
  @IsOptional() @IsString() @MaxLength(20) tower?: string;
  @IsString() @MaxLength(20) number!: string;
  @IsOptional() @IsString() @MaxLength(20) floor?: string;
  @IsOptional() @IsEnum(ApartmentStatus) status?: ApartmentStatus;
}
export class UpdateApartmentDto extends PartialType(CreateApartmentDto) {}
