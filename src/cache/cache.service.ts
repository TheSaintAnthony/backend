import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.provider';
import { CacheSetItem } from './interfaces/cache.interfaces';
@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}
  onModuleInit() {
    this.redis.on('connect', () => this.logger.log('Redis cache connected'));
    this.redis.on('error', (err) =>
      this.logger.error('Redis cache error', err),
    );
  }
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }
  async set(
    key: string,
    value: unknown,
    ttlSeconds: number = 3600,
  ): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error);
    }
  }
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
    }
  }
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys: string[] = [];
      let cursor = '0';
      do {
        const [newCursor, foundKeys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = newCursor;
        keys.push(...foundKeys);
      } while (cursor !== '0');
      if (keys.length > 0) {
        const batchSize = 1000;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await this.redis.del(...batch);
        }
        this.logger.log(
          `Deleted ${keys.length} keys matching pattern: ${pattern}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error deleting cache pattern ${pattern}:`, error);
    }
  }
  async exists(key: string): Promise<boolean> {
    try {
      return (await this.redis.exists(key)) === 1;
    } catch (error) {
      this.logger.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  }
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 3600,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }
  async increment(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const value = await this.redis.incr(key);
      if (ttlSeconds) await this.redis.expire(key, ttlSeconds);
      return value;
    } catch (error) {
      this.logger.error(`Error incrementing cache key ${key}:`, error);
      return 0;
    }
  }
  async setMany(items: CacheSetItem[]): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      for (const item of items) {
        const ttl = item.ttl || 3600;
        pipeline.setex(item.key, ttl, JSON.stringify(item.value));
      }
      await pipeline.exec();
    } catch (error) {
      this.logger.error('Error setting multiple cache keys:', error);
    }
  }
  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (keys.length === 0) return [];
      const values = await this.redis.mget(...keys);
      return values.map((v) => (v ? (JSON.parse(v) as T) : null));
    } catch (error) {
      this.logger.error('Error getting multiple cache keys:', error);
      return keys.map(() => null);
    }
  }
}
