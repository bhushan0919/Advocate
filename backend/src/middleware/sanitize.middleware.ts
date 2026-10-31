import { Request, Response, NextFunction } from 'express';

/**
 * Recursively strips keys starting with '$' or containing '.' to eliminate NoSQL query injection.
 */
const sanitizeObject = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Prohibit MongoDB operator injection ($gt, $ne, $where, etc.) and dot notation traversal
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitizeObject(value);
    } else if (typeof value === 'string') {
      // Clean string inputs
      cleaned[key] = sanitizeString(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
};

/**
 * Sanitizes strings by stripping dangerous script tags, null bytes, and malicious execution schemes
 * while completely preserving legitimate case text, punctuation, and Unicode / Marathi Devanagari characters.
 */
const sanitizeString = (str: string): string => {
  if (!str) return str;

  return str
    // Remove null bytes
    .replace(/\0/g, '')
    // Strip inline <script>...</script> tags case-insensitively
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Strip malicious protocol links
    .replace(/(?:javascript|vbscript|data\s*:\s*text\/html):/gi, 'blocked:');
};

/**
 * Express middleware that executes recursive NoSQL injection sanitization
 * and string XSS neutralization across req.body, req.query, and req.params.
 */
export const securitySanitizer = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

