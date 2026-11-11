import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const skip = () => env.NODE_ENV === 'test';
const message = { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, try again later' } };

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message,
});
