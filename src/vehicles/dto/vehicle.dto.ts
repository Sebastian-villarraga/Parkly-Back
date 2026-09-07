import { PartialType } from '@nestjs/swagger';
import { VehicleStatus, VehicleType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
export class CreateVehicleDto {
  @IsOptional() @IsString() residentId?: string;
  @IsString()
  @Matches(/^[A-Z0-9-]{3,8}$/i, { message: 'La placa no tiene un formato válido' })
  plate!: string;
  @IsEnum(VehicleType) type!: VehicleType;
  @IsOptional() @IsString() @MaxLength(50) brand?: string;
  @IsOptional() @IsString() @MaxLength(50) model?: string;
  @IsOptional() @IsString() @MaxLength(40) color?: string;
}
export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  @IsOptional() @IsEnum(VehicleStatus) status?: VehicleStatus;
}
