import { Request, Response, NextFunction } from 'express';
import BaseError from '../exceptions/BaseError';
import NotFoundError from '../exceptions/NotFoundError';

interface ErrorResponse {
  success: false;
  error: string;
  fields?: Array<{ field: string; message: string }>;
  retryAfter?: number;
}

function errorHandler(
  err: Error,
  req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction
): void {
  const isOperational = err instanceof BaseError && err.isOperational;

  console[isOperational ? 'warn' : 'error'](`[${err.name}]`, err.message, err.stack);

  if (!isOperational) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
    return;
  }

  const response: ErrorResponse = {
    success: false,
    error: err.message,
  };
  if (err instanceof NotFoundError) {
    res.status(err.statusCode).json(response)
  }

  res.status((err as BaseError).statusCode).json(response);
}

export default errorHandler;