import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('login') login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
  @Post('refresh') refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }
  @Post('logout') @HttpCode(204) logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }
  @Post('forgot-password') forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }
  @Post('reset-password') @HttpCode(204) resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
  @Get('me') @ApiBearerAuth() @UseGuards(JwtAuthGuard) me(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.authService.me(user);
  }
}
