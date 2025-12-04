import { CacheService } from 'src/cache/cache.service';
import { CacheableInstance } from 'src/cache/interfaces/cache.interfaces';
import { Logger } from '@nestjs/common';
export function Cacheable(
  keyPrefix: string,
  ttl: number = 3600,
  keyGenerator?: (...args: never[]) => string,
) {
  return function <T>(
    target: object,
    descriptor: TypedPropertyDescriptor<(...args: never[]) => Promise<T>>,
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) return descriptor;
    const logger = new Logger('CacheableDecorator');
    descriptor.value = async function (
      this: CacheableInstance,
      ...args: never[]
    ): Promise<T> {
      const cacheService = this.cacheService as CacheService;
      if (!cacheService) {
        logger.warn(`CacheService not found in ${target.constructor.name}`);
        return originalMethod.apply(this, args);
      }
      const cacheKey = keyGenerator
        ? `${keyPrefix}:${keyGenerator(...args)}`
        : `${keyPrefix}:${String(args[0])}`;
      const cached = await cacheService.get<T>(cacheKey);
      if (cached !== null) return cached;
      const result = (await originalMethod.apply(this, args)) as T;
      await cacheService.set(cacheKey, result, ttl);
      return result;
    };
    return descriptor;
  };
}
export function InvalidateCache(
  keyPattern: string,
  keyGenerator?: (...args: never[]) => string,
) {
  return function <T>(
    target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: never[]) => Promise<T>>,
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) return descriptor;
    const logger = new Logger('InvalidateCacheDecorator');
    descriptor.value = async function (
      this: CacheableInstance,
      ...args: never[]
    ): Promise<T> {
      const result = (await originalMethod.apply(this, args)) as T;
      const cacheService = this.cacheService as CacheService;
      if (!cacheService) {
        logger.warn(`CacheService not found in ${target.constructor.name}`);
        return result;
      }
      const cacheKey = keyGenerator
        ? `${keyPattern}:${keyGenerator(...args)}`
        : keyPattern;
      if (cacheKey.includes('*')) {
        void cacheService.delPattern(cacheKey);
      } else {
        void cacheService.del(cacheKey);
      }
      return result;
    };
    return descriptor;
  };
}
