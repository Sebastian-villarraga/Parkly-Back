import { IsBoolean, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateDashboardSettingsDto {
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUrl({ require_tld: false }) @MaxLength(500) imageUrl?: string;
  @IsOptional() @IsBoolean() showMetrics?: boolean;
  @IsOptional() @IsBoolean() showActivity?: boolean;
  @IsOptional() @IsBoolean() showQuickLinks?: boolean;
}
