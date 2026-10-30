import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { ENV } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  email: string;
  workspaceId?: string;
  role?: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: ENV.JWT_ACCESS_EXPIRES_IN as any,
  };
  return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, options);
};

export const generateRefreshToken = (payload: { userId: string }): { token: string; hash: string } => {
  const options: SignOptions = {
    expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as any,
    jwtid: crypto.randomUUID(),
  };
  const token = jwt.sign(payload, ENV.JWT_REFRESH_SECRET, options);
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ENV.JWT_ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as { userId: string };
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateInvitationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};
