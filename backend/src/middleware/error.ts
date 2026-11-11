import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

const fail = (code: string, message: string, details?: unknown) => ({
  success: false,
  error: { code, message, ...(details ? { details } : {}) },
});

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(fail('NOT_FOUND', `Route ${req.method} ${req.path} not found`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json(
      fail(
        'VALIDATION_ERROR',
        'Invalid request',
        err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      ),
    );
  }
  if (err instanceof AppError) {
    return res.status(err.status).json(fail(err.code, err.message, err.details));
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json(fail('BAD_REQUEST', 'Malformed JSON body'));
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return res.status(409).json(fail('CONFLICT', 'A record with these values already exists'));
  }
  if (env.NODE_ENV !== 'test') console.error(err);
  // Never leak internals
  return res.status(500).json(fail('INTERNAL_ERROR', 'Something went wrong'));
};
