import { DrawStatus } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ArrayMinSize,
} from 'class-validator';
export class CreateDrawDto {
  @IsString() name!: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsDateString() validFrom!: string;
  @IsDateString() validUntil!: string;
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) parkingSpaceIds!: string[];
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) residentIds!: string[];
}
export class UpdateDrawStatusDto {
  @IsEnum(DrawStatus) status!: DrawStatus;
}
