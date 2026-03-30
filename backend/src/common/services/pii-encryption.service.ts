import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

@Injectable()
export class PiiEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const secret =
      this.configService.get<string>('KYC_PII_ENCRYPTION_KEY') ||
      this.configService.get<string>('jwt.secret') ||
      'nestera-dev-fallback-key';

    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(value: unknown): string {
    try {
      const iv = randomBytes(12);
      const cipher = createCipheriv(this.algorithm, this.key, iv);
      const plaintext =
        typeof value === 'string' ? value : JSON.stringify(value ?? {});

      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();

      return [
        iv.toString('base64'),
        tag.toString('base64'),
        encrypted.toString('base64'),
      ].join('.');
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to encrypt sensitive data',
      );
    }
  }

  decrypt<T = Record<string, unknown>>(payload?: string | null): T | null {
    if (!payload) {
      return null;
    }

    try {
      const [ivB64, tagB64, dataB64] = payload.split('.');
      if (!ivB64 || !tagB64 || !dataB64) {
        return null;
      }

      const decipher = createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(ivB64, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataB64, 'base64')),
        decipher.final(),
      ]).toString('utf8');

      try {
        return JSON.parse(decrypted) as T;
      } catch {
        return decrypted as T;
      }
    } catch {
      return null;
    }
  }
}
