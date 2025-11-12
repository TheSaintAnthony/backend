import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the correlation ID from the request headers
 * Usage: @CorrelationId() correlationId: string
 */
export const CorrelationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-correlation-id'];
  },
);

