import { prisma } from '../config/prisma';

export const authRepository = {
  findUserByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),

  findUserById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        memberships: { select: { role: true, workspace: { select: { id: true, name: true } } } },
      },
    }),

  firstMembership: (userId: string) =>
    prisma.workspaceMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { workspace: true },
    }),

  /** Creates user + workspace + owner membership atomically. */
  createUserWithWorkspace: (data: { name: string; email: string; passwordHash: string; workspaceName: string }) =>
    prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: data.name, email: data.email, passwordHash: data.passwordHash },
      });
      const workspace = await tx.workspace.create({ data: { name: data.workspaceName } });
      await tx.workspaceMember.create({ data: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' } });
      return { user, workspace };
    }),
};
