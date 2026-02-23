import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
  details?: Record<string, unknown>;
  correlationId?: string;
}
interface DatabaseError {
  code?: string;
  constraint?: string;
  column?: string;
  severity?: string;
  routine?: string;
  message?: string;
}
interface ValidationError {
  name?: string;
  message?: string;
  errors?: unknown[];
}
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = response.getHeader('X-Correlation-Id') as string;
    const errorResponse = this.buildErrorResponse(
      exception,
      request,
      correlationId,
    );
    response.status(errorResponse.statusCode).json(errorResponse);
  }
  private buildErrorResponse(
    exception: unknown,
    request: Request,
    correlationId?: string,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        return {
          statusCode: status,
          timestamp,
          path,
          method,
          message:
            (responseObj.message as string | string[]) || exception.message,
          error: (responseObj.error as string) || exception.name,
          details: responseObj.details as Record<string, unknown> | undefined,
          correlationId,
        };
      }
      return {
        statusCode: status,
        timestamp,
        path,
        method,
        message: exceptionResponse,
        error: exception.name,
        correlationId,
      };
    }
    // Unwrap DrizzleQueryError: the real PostgreSQL error is on .cause
    const dbError =
      exception instanceof Error &&
      exception.cause &&
      this.isDatabaseError(exception.cause)
        ? exception.cause
        : exception;
    if (this.isDatabaseError(dbError)) {
      return this.handleDatabaseError(
        dbError,
        timestamp,
        path,
        method,
        correlationId,
      );
    }
    if (this.isValidationError(exception)) {
      return this.handleValidationError(
        exception,
        timestamp,
        path,
        method,
        correlationId,
      );
    }
    return this.handleUnknownError(
      exception,
      timestamp,
      path,
      method,
      correlationId,
    );
  }
  private handleDatabaseError(
    exception: DatabaseError,
    timestamp: string,
    path: string,
    method: string,
    correlationId?: string,
  ): ErrorResponse {
    const pgMessage =
      typeof exception.message === 'string' ? exception.message : undefined;
    const message = pgMessage || 'Database operation failed';
    let details: Record<string, unknown> = {};
    if (exception.code) {
      switch (exception.code) {
        case '23P01':
          return {
            statusCode: HttpStatus.CONFLICT,
            timestamp,
            path,
            method,
            message:
              exception.constraint === 'no_overlapping_room_bookings'
                ? 'One or more selected rooms are no longer available for the chosen dates'
                : 'The requested operation conflicts with existing data',
            error: 'Conflict',
            details: {
              constraint: exception.constraint,
            },
            correlationId,
          };
        case '23505':
          return {
            statusCode: HttpStatus.CONFLICT,
            timestamp,
            path,
            method,
            message: 'A record with this value already exists',
            error: 'Conflict',
            details: {
              constraint: exception.constraint,
            },
            correlationId,
          };
        case '23503':
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            timestamp,
            path,
            method,
            message: 'Invalid reference to related resource',
            error: 'Bad Request',
            correlationId,
          };
        case '23502':
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            timestamp,
            path,
            method,
            message: 'Required field is missing',
            error: 'Bad Request',
            details: {
              column: exception.column,
            },
            correlationId,
          };
        case '42703':
          return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            timestamp,
            path,
            method,
            message:
              'Database schema is out of date. Please run migrations (yarn db:migrate).',
            error: 'Database Error',
            details: {
              column: exception.column,
              hint: pgMessage,
            },
            correlationId,
          };
        default:
          details = {
            code: exception.code,
          };
      }
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      method,
      message,
      error: 'Database Error',
      details,
      correlationId,
    };
  }
  private handleValidationError(
    exception: ValidationError,
    timestamp: string,
    path: string,
    method: string,
    correlationId?: string,
  ): ErrorResponse {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp,
      path,
      method,
      message: exception.message || 'Validation failed',
      error: 'Validation Error',
      details: exception.errors as Record<string, unknown> | undefined,
      correlationId,
    };
  }
  private handleUnknownError(
    exception: unknown,
    timestamp: string,
    path: string,
    method: string,
    correlationId?: string,
  ): ErrorResponse {
    const message =
      exception instanceof Error
        ? exception.message
        : 'An unexpected error occurred';
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      method,
      message,
      error: 'Internal Server Error',
      correlationId,
    };
  }
  private isDatabaseError(exception: unknown): exception is DatabaseError {
    const err = exception as DatabaseError;
    return (
      typeof err === 'object' &&
      err !== null &&
      (err.code?.startsWith('23') ||
        err.code?.startsWith('42') ||
        err.severity === 'ERROR' ||
        !!err.routine)
    );
  }
  private isValidationError(exception: unknown): exception is ValidationError {
    const err = exception as ValidationError;
    return (
      typeof err === 'object' &&
      err !== null &&
      (err.name === 'ValidationError' || Array.isArray(err.errors))
    );
  }
}
