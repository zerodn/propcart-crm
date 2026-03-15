import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface JwtPayload {
  sub: string; // userId
  workspaceId: string;
  role: string;
  workspaceType: string;
  deviceId: string;
  jti?: string; // JWT ID — present after issueTokens(); used for blacklisting on logout
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Reject tokens that have been explicitly revoked (e.g., after logout)
    if (payload.jti) {
      const revoked = await this.cacheManager.get(`blacklist:${payload.jti}`);
      if (revoked)
        throw new UnauthorizedException({
          code: 'TOKEN_REVOKED',
          message: 'Token has been revoked',
        });
    }
    return payload;
  }
}
