import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SwitchWorkspaceDto } from './dto/switch-workspace.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { UserService } from '../user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  // POST /auth/phone/send-otp — Public, rate limited (5/min)
  @Post('phone/send-otp')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  // POST /auth/phone/verify-otp — Public, rate limited
  @Post('phone/verify-otp')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // POST /auth/google — Public
  @Post('google')
  googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.googleAuth(dto);
  }

  // POST /auth/refresh — Public (uses refresh token)
  @Post('refresh')
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  // POST /auth/switch-workspace — Requires JWT
  @Post('switch-workspace')
  @UseGuards(JwtAuthGuard)
  switchWorkspace(@Body() dto: SwitchWorkspaceDto, @CurrentUser() user: JwtPayload) {
    return this.authService.switchWorkspace(dto, user);
  }

  // GET /auth/workspaces — Requires JWT
  @Get('workspaces')
  @UseGuards(JwtAuthGuard)
  getWorkspaces(@CurrentUser() user: JwtPayload) {
    return this.authService.getWorkspaces(user);
  }

  // POST /auth/logout — Requires JWT
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Body('refresh_token') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  // GET /auth/email/verify?token=... — Public
  @Get('email/verify')
  verifyEmail(@Query('token') token: string) {
    return this.userService.verifyEmailToken(token);
  }
}
