export interface IdempotencyRecord {
  key: string;
  userId?: string;
  endpoint: string;
  requestBody: unknown;
  responseBody: unknown;
  statusCode: number;
}
