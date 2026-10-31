import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/advd',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'advd_access_secret_super_secure_key_2026_dev',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'advd_refresh_secret_super_secure_key_2026_dev',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  APP_URL: (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  API_URL: (process.env.API_URL || 'http://localhost:5000').replace(/\/+$/, ''),
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
};

/**
 * Validates critical environment variables and guards against insecure production deployment configurations.
 */
export const validateEnv = (): void => {
  if (ENV.NODE_ENV === 'production') {
    const insecureDevKeys = [
      'advd_access_secret_super_secure_key_2026_dev',
      'your_super_secure_jwt_access_secret_key_change_in_production',
      'advd_refresh_secret_super_secure_key_2026_dev',
      'your_super_secure_jwt_refresh_secret_key_change_in_production',
    ];

    if (insecureDevKeys.includes(ENV.JWT_ACCESS_SECRET) || ENV.JWT_ACCESS_SECRET.length < 32) {
      throw new Error(
        '[Security Violation] In production, JWT_ACCESS_SECRET must be a cryptographically secure string with at least 32 characters, and cannot use the development fallback key.'
      );
    }

    if (insecureDevKeys.includes(ENV.JWT_REFRESH_SECRET) || ENV.JWT_REFRESH_SECRET.length < 32) {
      throw new Error(
        '[Security Violation] In production, JWT_REFRESH_SECRET must be a cryptographically secure string with at least 32 characters, and cannot use the development fallback key.'
      );
    }

    if (ENV.MONGODB_URI.includes('127.0.0.1') || ENV.MONGODB_URI.includes('localhost')) {
      console.warn(
        '[Security Warning] MONGODB_URI in production is currently targeting a localhost instance. Ensure a production MongoDB Atlas URI is configured before public traffic.'
      );
    }

    if (ENV.CORS_ORIGIN.trim() === '*' || ENV.CORS_ORIGIN.includes('*') && !ENV.CORS_ORIGIN.includes('.')) {
      throw new Error(
        '[Security Violation] Open wildcard CORS origin ("*") is prohibited in production when credentials/cookies are enabled.'
      );
    }
  }
};

/**
 * Returns a normalized array of allowed origins parsed from CORS_ORIGIN
 * Supports single origin or comma-separated list of origins.
 */
export const getCorsOrigins = (): string[] => {
  const configured = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    const devDefaults = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];
    devDefaults.forEach((d) => {
      if (!configured.includes(d)) {
        configured.push(d);
      }
    });
  }

  return configured;
};
