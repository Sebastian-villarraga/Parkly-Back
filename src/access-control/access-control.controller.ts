import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AccessControlService } from './access-control.service';
import { CreateAccessEventDto, CreateIncidentDto } from './dto/access-event.dto';
@ApiTags('Control de acceso')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
@ApiForbiddenResponse({
  description: 'Se requiere ADMIN o SECURITY y pertenecer a un conjunto.',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('access-control')
export class AccessControlController {
  constructor(private readonly service: AccessControlService) {}
  @ApiOkResponse({
    description:
      'Eventos del conjunto ordenados por timestamp descendente; incluye vehicle, visitorAuthorization.visitor y registeredBy (firstName, lastName).',
    schema: { type: 'array', items: { type: 'object', additionalProperties: true } },
  })
  @Get('events')
  @Roles(Role.ADMIN, Role.SECURITY)
  list(@CurrentUser() u: AuthenticatedUser) {
    return this.service.list(u);
  }
  @ApiCreatedResponse({
    description:
      'Evento persistido. Conserva id, complexId, vehicleId, visitorAuthorizationId, type, registeredById, timestamp y notes.',
    schema: {
      type: 'object',
      example: {
        id: 'clevent123',
        complexId: 'clcomplex1',
        vehicleId: 'clvehicle123',
        visitorAuthorizationId: null,
        type: 'VEHICLE_ENTRY',
        registeredById: 'clsecurity1',
        timestamp: '2026-11-26T15:00:00.000Z',
        notes: 'Ingreso autorizado',
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'DTO inválido, recurso requerido omitido, autorización no vigente para entrada o visitante que no está INSIDE para salida.',
  })
  @ApiNotFoundResponse({
    description:
      'Vehículo ausente, inactivo o ajeno: Vehículo no encontrado. Autorización ausente o ajena: Autorización no encontrada.',
  })
  @Post('events')
  @Roles(Role.ADMIN, Role.SECURITY)
  create(@Body() dto: CreateAccessEventDto, @CurrentUser() u: AuthenticatedUser) {
    return this.service.create(dto, u);
  }
  @Post('incidents') @Roles(Role.ADMIN, Role.SECURITY) incident(
    @Body() dto: CreateIncidentDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.reportIncident(dto, u);
  }
}
