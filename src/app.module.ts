import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AccessControlModule } from './access-control/access-control.module';
import { ApartmentsModule } from './apartments/apartments.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ComplexesModule } from './complexes/complexes.module';
import { CommonModule } from './common/common.module';
import { FinesModule } from './fines/fines.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ParkingDrawsModule } from './parking-draws/parking-draws.module';
import { ParkingSpacesModule } from './parking-spaces/parking-spaces.module';
import { PaymentsModule } from './payments/payments.module';
import { PlansModule } from './plans/plans.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { ResidentsModule } from './residents/residents.module';
import { ReservationsModule } from './reservations/reservations.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { VisitorsModule } from './visitors/visitors.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    ComplexesModule,
    ApartmentsModule,
    ResidentsModule,
    VehiclesModule,
    ParkingSpacesModule,
    AssignmentsModule,
    ParkingDrawsModule,
    ReservationsModule,
    VisitorsModule,
    AccessControlModule,
    FinesModule,
    PaymentsModule,
    NotificationsModule,
    AuditModule,
    ReportsModule,
    PlansModule,
    SubscriptionsModule,
    SettingsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
