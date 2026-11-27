import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessEventType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
export class CreateAccessEventDto {
  @ApiProperty({ enum: AccessEventType, example: 'VEHICLE_ENTRY' })
  @IsEnum(AccessEventType)
  type!: AccessEventType;
  @ApiPropertyOptional({
    example: 'clvehicle123',
    description:
      'Requerido para VEHICLE_ENTRY y VEHICLE_EXIT; vehículo ACTIVE del conjunto.',
  })
  @IsOptional()
  @IsString()
  vehicleId?: string;
  @ApiPropertyOptional({ description: 'Requerido para VISITOR_ENTRY y VISITOR_EXIT.' })
  @IsOptional()
  @IsString()
  visitorAuthorizationId?: string;
  @ApiPropertyOptional({ example: 'Ingreso autorizado' })
  @IsOptional()
  @IsString()
  notes?: string;
}
export class CreateIncidentDto {
  @IsString() title!: string;
  @IsString() description!: string;
}
