import { PartialType } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
export class CreateResidentDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() apartmentId!: string;
  @IsString() identificationType!: string;
  @IsString() identificationNumber!: string;
  @IsOptional() @IsString() emergencyContact?: string;
}
export class UpdateResidentDto extends PartialType(CreateResidentDto) {}
