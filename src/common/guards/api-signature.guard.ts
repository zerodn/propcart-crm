import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class ApiSignatureGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip signature validation in development mode for convenience
    const nodeEnv = this.configService.get<string>('nodeEnv');
    if (nodeEnv !== 'production') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    return this.validateSignature(request);
  }

  private validateSignature(request: Request): boolean {
    const timestamp = request.headers['x-timestamp'] as string;
    const signature = request.headers['x-signature'] as string;

    if (!timestamp || !signature) {
      throw new HttpException(
        { code: 'SIGNATURE_INVALID', message: 'Missing x-timestamp or x-signature header' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Validate timestamp freshness (within 60 seconds)
    const now = Date.now();
    const requestTime = Number(timestamp);
    if (isNaN(requestTime) || Math.abs(now - requestTime) > 60000) {
      throw new HttpException(
        { code: 'SIGNATURE_EXPIRED', message: 'Request timestamp is expired or invalid' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Reconstruct the message to sign
    const method = request.method.toUpperCase();
    const path = request.url;
    const body = request.body ? JSON.stringify(request.body) : '';
    const message = `${method}\n${path}\n${body}\n${timestamp}`;

    const clientSecret = this.configService.get<string>('api.clientSecret') ?? '';
    const expected = crypto.createHmac('sha256', clientSecret).update(message).digest('hex');

    try {
      const sigBuffer = Buffer.from(signature, 'hex');
      const expBuffer = Buffer.from(expected, 'hex');

      if (sigBuffer.length !== expBuffer.length) {
        throw new Error('Length mismatch');
      }

      if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) {
        throw new Error('Signature mismatch');
      }
    } catch {
      throw new HttpException(
        { code: 'SIGNATURE_INVALID', message: 'Invalid request signature' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return true;
  }
}
