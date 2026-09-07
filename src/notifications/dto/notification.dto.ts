import { NotificationType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
export class CreateNotificationDto {
  @IsString() userId!: string;
  @IsString() title!: string;
  @IsString() message!: string;
  @IsEnum(NotificationType) type!: NotificationType;
  @IsOptional() @IsString() complexId?: string;
}
