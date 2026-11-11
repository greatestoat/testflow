import { prisma } from '../config/prisma';

type SuiteInput = { name?: string; description?: string | null; feature?: string | null };

export const suiteRepository = {
  list: (workspaceId: string, projectId?: string) =>
    prisma.testSuite.findMany({
      where: { workspaceId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { testCases: true } } },
    }),

  find: (workspaceId: string, id: string) => prisma.testSuite.findFirst({ where: { id, workspaceId } }),

  create: (workspaceId: string, data: SuiteInput & { name: string; projectId: string }) =>
    prisma.testSuite.create({ data: { ...data, workspaceId } }),

  update: (id: string, data: SuiteInput) => prisma.testSuite.update({ where: { id }, data }),

  /** Test cases are kept but detached from the suite. */
  deleteDetach: (workspaceId: string, id: string) =>
    prisma.$transaction(async (tx) => {
      await tx.testCase.updateMany({ where: { suiteId: id, workspaceId }, data: { suiteId: null } });
      await tx.testSuite.delete({ where: { id } });
    }),
};
