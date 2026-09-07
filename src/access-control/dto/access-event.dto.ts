import { AccessEventType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
export class CreateAccessEventDto {
  @IsEnum(AccessEventType) type!: AccessEventType;
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsString() visitorAuthorizationId?: string;
  @IsOptional() @IsString() notes?: string;
}
export class CreateIncidentDto {
  @IsString() title!: string;
  @IsString() description!: string;
}
