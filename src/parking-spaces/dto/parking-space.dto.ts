import { PartialType } from '@nestjs/swagger';
import { ParkingSpaceStatus, ParkingSpaceType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateParkingSpaceDto {
  @IsString() @MaxLength(30) number!: string;
  @IsEnum(ParkingSpaceType) type!: ParkingSpaceType;
  @IsOptional() @IsEnum(ParkingSpaceStatus) status?: ParkingSpaceStatus;
  @IsOptional() @IsString() @MaxLength(100) location?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
export class UpdateParkingSpaceDto extends PartialType(CreateParkingSpaceDto) {}
