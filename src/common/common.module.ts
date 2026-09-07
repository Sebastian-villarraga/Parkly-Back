import { Global, Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { TenantService } from './services/tenant.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  providers: [TenantService, AuditService, JwtAuthGuard, RolesGuard],
  exports: [TenantService, AuditService, JwtAuthGuard, RolesGuard],
})
export class CommonModule {}
