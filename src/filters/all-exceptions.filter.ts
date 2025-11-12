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
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
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
        };
      }

      return {
        statusCode: status,
        timestamp,
        path,
        method,
        message: exceptionResponse,
        error: exception.name,
      };
    }

    if (this.isDatabaseError(exception)) {
      return this.handleDatabaseError(exception, timestamp, path, method);
    }

    if (this.isValidationError(exception)) {
      return this.handleValidationError(exception, timestamp, path, method);
    }

    return this.handleUnknownError(exception, timestamp, path, method);
  }

  private handleDatabaseError(
    exception: any,
    timestamp: string,
    path: string,
    method: string,
  ): ErrorResponse {
    const message = 'Database operation failed';
    let details: any = {};

    if (exception.code) {
      switch (exception.code) {
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
          };
        case '23503':
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            timestamp,
            path,
            method,
            message: 'Invalid reference to related resource',
            error: 'Bad Request',
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
    };
  }

  private handleValidationError(
    exception: any,
    timestamp: string,
    path: string,
    method: string,
  ): ErrorResponse {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp,
      path,
      method,
      message: exception.message || 'Validation failed',
      error: 'Validation Error',
      details: exception.errors,
    };
  }

  private handleUnknownError(
    exception: any,
    timestamp: string,
    path: string,
    method: string,
  ): ErrorResponse {
    const message = exception?.message || 'An unexpected error occurred';

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      method,
      message,
      error: 'Internal Server Error',
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
