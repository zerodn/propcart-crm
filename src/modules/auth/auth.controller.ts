import { Body, Controller, Get, Headers, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SwitchWorkspaceDto } from './dto/switch-workspace.dto';
import { LinkPhoneForGoogleDto } from './dto/link-phone-for-google.dto';
import { VerifyEmailLinkGoogleDto } from './dto/verify-email-link-google.dto';
import { EmailVerifySendOtpDto } from './dto/email-verify-send-otp.dto';
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

  // POST /auth/google/link-phone — Public, called after PHONE_REQUIRED response
  @Post('google/link-phone')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  linkPhoneForGoogleUser(@Body() dto: LinkPhoneForGoogleDto) {
    return this.authService.linkPhoneForGoogleUser(dto);
  }

  // POST /auth/google/email-verify-send-otp — Public, validates phone then sends OTP
  @Post('google/email-verify-send-otp')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  emailVerifySendOtp(@Body() dto: EmailVerifySendOtpDto) {
    return this.authService.emailVerifySendOtp(dto);
  }

  // POST /auth/google/verify-email-link — Public, called after EMAIL_EXISTS_UNVERIFIED response
  @Post('google/verify-email-link')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  verifyEmailAndLinkGoogle(@Body() dto: VerifyEmailLinkGoogleDto) {
    return this.authService.verifyEmailAndLinkGoogle(dto);
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

  // POST /auth/accept-merge — Requires JWT (phone user accepting merge with Google orphan)
  @Post('accept-merge')
  @UseGuards(JwtAuthGuard)
  acceptMerge(@Body('merge_token') mergeToken: string, @CurrentUser() user: JwtPayload) {
    return this.authService.acceptMerge(user.sub, mergeToken);
  }

  // POST /auth/logout — Requires JWT
  // Blacklists the current access token and revokes the refresh token
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @Headers('authorization') authorization: string,
    @Body('refresh_token') refreshToken: string,
  ) {
    const accessToken = authorization?.replace(/^Bearer\s+/i, '') ?? '';
    return this.authService.logout(accessToken, refreshToken);
  }

  // GET /auth/email/verify?token=... — Public
  @Get('email/verify')
  verifyEmail(@Query('token') token: string) {
    return this.userService.verifyEmailToken(token);
  }
}
