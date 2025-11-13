export interface IdempotencyRecord {
  key: string;
  userId?: number;
  endpoint: string;
  requestBody: unknown;
  responseBody: unknown;
  statusCode: number;
}
