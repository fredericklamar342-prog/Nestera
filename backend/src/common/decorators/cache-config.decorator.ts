import { SetMetadata } from '@nestjs/common';

export interface CacheConfigMetadata {
  ttl?: number;
  tags?: string[];
  staleWhileRevalidate?: boolean;
}

export const CACHE_CONFIG_KEY = 'cache_config';

export const CacheConfig = (config: CacheConfigMetadata) =>
  SetMetadata(CACHE_CONFIG_KEY, config);
