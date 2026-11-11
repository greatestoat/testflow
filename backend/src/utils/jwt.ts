import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  sub: string; // user id
  wid: string; // active workspace id
}

export const signToken = (userId: string, workspaceId: string) =>
  jwt.sign({ sub: userId, wid: workspaceId } satisfies TokenPayload, env.JWT_SECRET, { expiresIn: '7d' });

export const verifyToken = (token: string): TokenPayload => jwt.verify(token, env.JWT_SECRET) as TokenPayload;
