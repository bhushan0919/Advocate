import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { ENV, getCorsOrigins } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';

export const createApp = () => {
  const app = express();

  // Trust first proxy hop when deployed behind Render or reverse proxies
  app.set('trust proxy', 1);

  // Security & Utility Middlewares
  app.use(helmet());

  const allowedOrigins = getCorsOrigins();

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, uptime checks)
        if (!origin) return callback(null, true);

        // Check exact match
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Check wildcard subdomains if configured (e.g., https://*.netlify.app)
        const isWildcardMatch = allowedOrigins.some((allowed) => {
          if (allowed.includes('*')) {
            const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            return regex.test(origin);
          }
          return false;
        });

        if (isWildcardMatch) {
          return callback(null, true);
        }

        // Deny without throwing unhandled server error
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id', 'x-refresh-token'],
    })
  );
  app.use(morgan(ENV.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Root Health Check (ideal for Render deployment health probes & external monitors)
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'AdvD Multi-Tenant Legal Case Management API',
    });
  });

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


