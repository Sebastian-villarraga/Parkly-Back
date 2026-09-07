import { Module } from '@nestjs/common';
import { ParkingDrawsController } from './parking-draws.controller';
import { ParkingDrawsService } from './parking-draws.service';
@Module({ controllers: [ParkingDrawsController], providers: [ParkingDrawsService] })
export class ParkingDrawsModule {}
