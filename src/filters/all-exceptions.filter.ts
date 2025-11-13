/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */

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
  details?: any;
  correlationId?: string;
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
        const responseObj = exceptionResponse as any;
        return {
          statusCode: status,
          timestamp,
          path,
          method,
          message: responseObj.message || exception.message,
          error: responseObj.error || exception.name,
          details: responseObj.details,
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

    if (this.isDatabaseError(exception)) {
      return this.handleDatabaseError(
        exception,
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
    exception: any,
    timestamp: string,
    path: string,
    method: string,
    correlationId?: string,
  ): ErrorResponse {
    const message = 'Database operation failed';
    let details: any = {};

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
    exception: any,
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
      details: exception.errors,
      correlationId,
    };
  }

  private handleUnknownError(
    exception: any,
    timestamp: string,
    path: string,
    method: string,
    correlationId?: string,
  ): ErrorResponse {
    const message = exception?.message || 'An unexpected error occurred';

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

  private isDatabaseError(exception: any): boolean {
    return (
      exception?.code?.startsWith('23') ||
      exception?.code?.startsWith('42') ||
      exception?.severity === 'ERROR' ||
      exception?.routine
    );
  }

  private isValidationError(exception: any): boolean {
    return (
      exception?.name === 'ValidationError' || Array.isArray(exception?.errors)
    );
  }
}
