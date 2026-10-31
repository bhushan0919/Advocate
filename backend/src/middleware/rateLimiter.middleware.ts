import rateLimit from 'express-rate-limit';
import { ENV } from '../config/env.js';

// Helper to determine if rate limiting should be skipped (e.g. during test suites)
const shouldSkip = () => {
  return ENV.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMITING === 'true';
};

/**
 * General API rate limiter for standard endpoints.
 * Allows 300 requests per 15 minutes per IP.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: shouldSkip,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP address. Please try again after 15 minutes.',
  },
});

/**
 * Strict authentication rate limiter to defend against brute-force
 * and credential stuffing attacks on login, registration, and invitation acceptance.
 * Allows 20 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: shouldSkip,
  message: {
    success: false,
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
  },
});

/**
 * Heavy export operation rate limiter to prevent resource exhaustion (PDF/Excel generation).
 * Allows 30 requests per 15 minutes per IP.
 */
export const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: shouldSkip,
  message: {
    success: false,
    code: 'EXPORT_RATE_LIMIT_EXCEEDED',
    message: 'Too many export requests generated. Please wait a few minutes before downloading again.',
  },
});

