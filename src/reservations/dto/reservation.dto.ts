import { IsDateString, IsString } from 'class-validator';
export class CreateReservationDto {
  @IsString() parkingSpaceId!: string;
  @IsDateString() startDateTime!: string;
  @IsDateString() endDateTime!: string;
}
