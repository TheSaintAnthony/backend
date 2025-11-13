export interface CacheSetItem {
  key: string;
  value: unknown;
  ttl?: number;
}

export interface CacheableInstance {
  cacheService: unknown;
}
