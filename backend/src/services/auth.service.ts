import bcrypt from 'bcrypt';
import { authRepository } from '../repositories/auth.repository';
import { conflict, notFound, unauthorized } from '../utils/errors';
import { signToken } from '../utils/jwt';

const publicUser = (u: { id: string; email: string; name: string }) => ({ id: u.id, email: u.email, name: u.name });

export const authService = {
  async register(input: { name: string; email: string; password: string; workspaceName?: string }) {
    if (await authRepository.findUserByEmail(input.email)) throw conflict('Email is already registered');
    const passwordHash = await bcrypt.hash(input.password, 12);
    const { user, workspace } = await authRepository.createUserWithWorkspace({
      name: input.name,
      email: input.email,
      passwordHash,
      workspaceName: input.workspaceName ?? `${input.name}'s Workspace`,
    });
    return {
      token: signToken(user.id, workspace.id),
      user: publicUser(user),
      workspace: { id: workspace.id, name: workspace.name },
    };
  },

  async login(input: { email: string; password: string }) {
    const user = await authRepository.findUserByEmail(input.email);
    // Same error for unknown email / wrong password
    const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
    if (!user || !valid) throw unauthorized('Invalid email or password');

    const membership = await authRepository.firstMembership(user.id);
    if (!membership) throw unauthorized('User has no workspace');
    return {
      token: signToken(user.id, membership.workspaceId),
      user: publicUser(user),
      workspace: { id: membership.workspace.id, name: membership.workspace.name },
    };
  },

  async me(userId: string, workspaceId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw notFound('User');
    const { memberships, ...rest } = user;
    return {
      ...rest,
      activeWorkspaceId: workspaceId,
      workspaces: memberships.map((m) => ({ id: m.workspace.id, name: m.workspace.name, role: m.role })),
    };
  },
};
