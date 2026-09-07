import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';
export class CreateVisitorAuthorizationDto {
  @IsString() visitorName!: string;
  @IsOptional() @IsString() identificationNumber?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @Matches(/^[A-Z0-9-]{3,8}$/i) plate?: string;
  @IsDateString() validFrom!: string;
  @IsDateString() validUntil!: string;
  @IsOptional() @IsString() residentId?: string;
}
