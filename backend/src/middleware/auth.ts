import type { RequestHandler } from 'express';
import { prisma } from '../config/prisma';
import { unauthorized, forbidden } from '../utils/errors';
import { verifyToken } from '../utils/jwt';
import { asyncHandler } from '../utils/http';

/** Verifies the JWT and that the user is still a member of the workspace in the token. */
export const requireAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw unauthorized('Missing bearer token');

  let payload;
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    throw unauthorized('Invalid or expired token');
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: payload.wid, userId: payload.sub } },
  });
  if (!member) throw forbidden('No access to this workspace');

  req.auth = { userId: payload.sub, workspaceId: payload.wid, role: member.role };
  next();
});
