import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env.js';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Always log full error details server-side for internal diagnostic & audit trails
  if (ENV.NODE_ENV !== 'test') {
    console.error(`[Error Handler] [${new Date().toISOString()}]`, err);
  }

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
      field,
    });
    return;
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: `Invalid ID format for ${err.path}.`,
    });
    return;
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e: any) => e.message);
    res.status(400).json({
      success: false,
      message: messages.join(', '),
    });
    return;
  }

  // JSON Syntax Error (Malformed JSON payload)
  if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
    res.status(400).json({
      success: false,
      message: 'Malformed JSON payload provided.',
    });
    return;
  }

  // Rate Limiting Error
  if (err.status === 429) {
    res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: err.message || 'Too many requests. Please slow down and try again later.',
    });
    return;
  }

  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);

  // In production mode, prevent leaking internal stack traces and server internals
  const safeMessage =
    ENV.NODE_ENV === 'production' && statusCode >= 500
      ? 'An unexpected internal server error occurred. Please contact support.'
      : err.message || 'Internal server error occurred.';

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
  });
};
