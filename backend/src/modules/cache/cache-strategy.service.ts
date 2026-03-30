import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

export interface CacheConfig {
  ttl: number; // milliseconds
  key: string;
  tags?: string[];
}

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
}

@Injectable()
export class CacheStrategyService {
  private readonly logger = new Logger(CacheStrategyService.name);
  private metrics: CacheMetrics = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  private resourceTTLs = new Map<string, number>([
    ['user', 5 * 60 * 1000], // 5 minutes
    ['savings', 10 * 60 * 1000], // 10 minutes
    ['analytics', 30 * 60 * 1000], // 30 minutes
    ['blockchain', 2 * 60 * 1000], // 2 minutes
  ]);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.metrics.hits++;
        this.logger.debug(`Cache hit: ${key}`);
      } else {
        this.metrics.misses++;
      }
      return value;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const finalTTL = ttl || this.getDefaultTTL(key);
      await this.cacheManager.set(key, value, finalTTL);
      this.metrics.sets++;
      this.logger.debug(`Cache set: ${key} (TTL: ${finalTTL}ms)`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.metrics.deletes++;
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keys = await this.cacheManager.store.keys();
      const keysToDelete = keys.filter((k) => k.includes(tag));
      
      for (const key of keysToDelete) {
        await this.del(key);
      }
      
      this.logger.debug(`Invalidated ${keysToDelete.length} keys with tag: ${tag}`);
    } catch (error) {
      this.logger.error(`Cache invalidation error for tag ${tag}:`, error);
    }
  }

  async warmCache(key: string, loader: () => Promise<any>, ttl?: number): Promise<void> {
    try {
      const data = await loader();
      await this.set(key, data, ttl);
      this.logger.log(`Cache warmed: ${key}`);
    } catch (error) {
      this.logger.error(`Cache warming error for key ${key}:`, error);
    }
  }

  async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const data = await loader();
    await this.set(key, data, ttl);
    return data;
  }

  async staleWhileRevalidate<T>(
    key: string,
    loader: () => Promise<T>,
    ttl: number,
    staleTime: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const data = await loader();
    await this.set(key, data, ttl + staleTime);
    return data;
  }

  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total > 0 ? (this.metrics.hits / total * 100).toFixed(2) + '%' : '0%',
    };
  }

  resetMetrics() {
    this.metrics = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  setResourceTTL(resource: string, ttl: number): void {
    this.resourceTTLs.set(resource, ttl);
  }

  private getDefaultTTL(key: string): number {
    for (const [resource, ttl] of this.resourceTTLs) {
      if (key.includes(resource)) {
        return ttl;
      }
    }
    return 5 * 60 * 1000; // default 5 minutes
  }
}
