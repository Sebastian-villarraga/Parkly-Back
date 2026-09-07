import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateChargeDto, CreatePaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';
@ApiTags('Cobros y pagos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}
  @Get('charges') @Roles(Role.ADMIN, Role.RESIDENT) charges(
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.charges(u);
  }
  @Get('payments') @Roles(Role.ADMIN, Role.RESIDENT) payments(
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.payments(u);
  }
  @Post('charges') @Roles(Role.ADMIN) charge(
    @Body() dto: CreateChargeDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.createCharge(dto, u);
  }
  @Post('payments') @Roles(Role.ADMIN, Role.RESIDENT) payment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.createPayment(dto, u);
  }
  @Post('payments/:id/confirm') @Roles(Role.ADMIN) confirm(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.confirmPayment(id, u);
  }
}
