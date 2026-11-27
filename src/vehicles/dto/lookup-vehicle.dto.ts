import { ApiProperty } from '@nestjs/swagger';
import { VehicleStatus, VehicleType } from '@prisma/client';
import { PickType } from '@nestjs/swagger';
import { CreateVehicleDto } from './vehicle.dto';

// Shares the exact plate validation used when creating a vehicle.
export class LookupVehicleDto extends PickType(CreateVehicleDto, ['plate'] as const) {}

export class VehicleLookupResponseDto {
  @ApiProperty({ example: 'clvehicle123' }) id!: string;
  @ApiProperty({ example: 'ABC123' }) plate!: string;
  @ApiProperty({ enum: VehicleType, example: VehicleType.CAR }) type!: VehicleType;
  @ApiProperty({ enum: VehicleStatus, example: VehicleStatus.ACTIVE })
  status!: VehicleStatus;
}
