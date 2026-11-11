import { prisma } from '../config/prisma';

export const mcpCredentialRepository = {
  create: (workspaceId: string, name: string, credentialHash: string) =>
    prisma.mcpCredential.create({ data: { workspaceId, name, credentialHash } }),

  list: (workspaceId: string) =>
    prisma.mcpCredential.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    }),

  findByHash: (credentialHash: string) => prisma.mcpCredential.findUnique({ where: { credentialHash } }),

  find: (workspaceId: string, id: string) => prisma.mcpCredential.findFirst({ where: { id, workspaceId } }),

  touch: (id: string) => prisma.mcpCredential.update({ where: { id }, data: { lastUsedAt: new Date() } }),

  revoke: (id: string) => prisma.mcpCredential.update({ where: { id }, data: { revokedAt: new Date() } }),
};
