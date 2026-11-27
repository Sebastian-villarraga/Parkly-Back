import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
import { VehiclesService } from './vehicles.service';
import { LookupVehicleDto, VehicleLookupResponseDto } from './dto/lookup-vehicle.dto';
@ApiTags('Vehículos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly service: VehiclesService) {}
  @Get() @Roles(Role.ADMIN, Role.SECURITY, Role.RESIDENT) list(
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.list(u);
  }
  @Get('lookup')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiQuery({
    name: 'plate',
    required: true,
    example: 'abc123',
    description: '3 a 8 letras, números o guiones; se convierte a mayúsculas.',
    schema: { type: 'string', pattern: '^[A-Za-z0-9-]{3,8}$' },
  })
  @ApiOkResponse({
    type: VehicleLookupResponseDto,
    description: 'Vehículo del conjunto, activo o inactivo.',
  })
  @ApiBadRequestResponse({ description: 'Placa ausente, vacía o inválida.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol sin permiso o sesión sin conjunto.' })
  @ApiNotFoundResponse({
    description: 'Vehículo no encontrado (también para otro conjunto).',
  })
  lookup(@Query() query: LookupVehicleDto, @CurrentUser() u: AuthenticatedUser) {
    return this.service.lookup(query.plate, u);
  }
  @Get(':id') @Roles(Role.ADMIN, Role.SECURITY, Role.RESIDENT) get(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.find(id, u);
  }
  @Post() @Roles(Role.ADMIN, Role.RESIDENT) create(
    @Body() dto: CreateVehicleDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.create(dto, u);
  }
  @Patch(':id') @Roles(Role.ADMIN, Role.RESIDENT) update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, u);
  }
  @Delete(':id') @Roles(Role.ADMIN, Role.RESIDENT) deactivate(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.deactivate(id, u);
  }
}
