import { AssignmentType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
export class CreateAssignmentDto {
  @IsString() parkingSpaceId!: string;
  @IsOptional() @IsString() apartmentId?: string;
  @IsOptional() @IsString() residentId?: string;
  @IsOptional() @IsString() vehicleId?: string;
  @IsEnum(AssignmentType) type!: AssignmentType;
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
}
