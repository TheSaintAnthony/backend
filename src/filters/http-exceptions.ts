/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  HttpException,
  HttpStatus,
  BadRequestException as NestBadRequestException,
  NotFoundException as NestNotFoundException,
  ConflictException as NestConflictException,
  UnauthorizedException as NestUnauthorizedException,
  ForbiddenException as NestForbiddenException,
} from '@nestjs/common';

export class BadRequestException extends NestBadRequestException {
  constructor(message: string | string[], details?: any) {
    super(details ? { message, error: 'Bad Request', details } : message);
  }
}

export class NotFoundException extends NestNotFoundException {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super(message);
  }
}

export class ConflictException extends NestConflictException {
  constructor(message: string, details?: any) {
    super(details ? { message, error: 'Conflict', details } : message);
  }
}

export class UnauthorizedException extends NestUnauthorizedException {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'Unauthorized');
  }
}

export class ForbiddenException extends NestForbiddenException {
  constructor(message: string = 'Access forbidden') {
    super(message, 'Forbidden');
  }
}

export class ValidationException extends HttpException {
  constructor(errors: any) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        error: 'Validation Error',
        details: errors,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class DatabaseException extends HttpException {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        error: 'Database Error',
        details,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class BusinessLogicException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        statusCode,
        message,
        error: 'Business Logic Error',
      },
      statusCode,
    );
  }
}
