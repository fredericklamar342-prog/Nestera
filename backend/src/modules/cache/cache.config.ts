import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createKeyv } from '@keyv/redis';

export const cacheConfig: CacheModuleAsyncOptions = {
  isGlobal: true,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const redisUrl = configService.get<string>('redis.url');

    return {
      ttl: 30000,
      ...(redisUrl
        ? {
            stores: [createKeyv(redisUrl)],
          }
        : {}),
    };
  },
};
