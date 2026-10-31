import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { ENV, getCorsOrigins } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { apiLimiter } from './middleware/rateLimiter.middleware.js';
import { securitySanitizer } from './middleware/sanitize.middleware.js';

export const createApp = () => {
  const app = express();

  // Trust first proxy hop when deployed behind Render or reverse proxies
  app.set('trust proxy', 1);

  // Disable X-Powered-By header to obscure server technology stack
  app.disable('x-powered-by');

  const allowedOrigins = getCorsOrigins();

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://res.cloudinary.com',
            'https://*.cloudinary.com',
          ],
          connectSrc: ["'self'", ...allowedOrigins],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Permits streaming inline PDF and image previews in browsers
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny',
      },
      noSniff: true,
    })
  );

  // Strict CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. server-to-server, curl, uptime monitors, health probes)
        if (!origin) return callback(null, true);

        // Check exact match in configured allowed origins
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Strictly check wildcard subdomains if configured (e.g., https://*.netlify.app)
        const isWildcardMatch = allowedOrigins.some((allowed) => {
          if (allowed.includes('*')) {
            // Replace wildcard only with valid DNS hostname characters [a-zA-Z0-9-]+
            const escaped = allowed
              .replace(/[-[\]/{}()+?.\\^$|]/g, '\\$&')
              .replace(/\\\*/g, '[a-zA-Z0-9-]+');
            const regex = new RegExp(`^${escaped}$`, 'i');
            return regex.test(origin);
          }
          return false;
        });

        if (isWildcardMatch) {
          return callback(null, true);
        }

        // Prohibit untrusted origins safely without crashing the event loop
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id', 'x-refresh-token'],
    })
  );

  app.use(morgan(ENV.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Request Body Size Limits (Mitigates payload flood DoS attacks)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Input Sanitization: NoSQL Injection & XSS Neutralization
  app.use(securitySanitizer);

  // Root Health Check (ideal for Render deployment health probes & external monitors)
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'AdvD Multi-Tenant Legal Case Management API',
    });
  });

  // Apply General Rate Limiter to API routes
  app.use('/api', apiLimiter);

  // Mount API router
  app.use('/api', routes);

  // 404 Handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      message: 'Resource not found or endpoint does not exist.',
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
