import { authService } from '../services/auth.service';
import { asyncHandler, created, ok } from '../utils/http';

export const authController = {
  register: asyncHandler(async (req, res) => created(res, await authService.register(req.body))),
  login: asyncHandler(async (req, res) => ok(res, await authService.login(req.body))),
  // JWTs are stateless: logout tells the client to discard its token.
  logout: asyncHandler(async (_req, res) => ok(res, { message: 'Logged out. Discard your token on the client.' })),
  me: asyncHandler(async (req, res) => ok(res, await authService.me(req.auth!.userId, req.auth!.workspaceId))),
};
