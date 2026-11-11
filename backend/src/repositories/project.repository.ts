import { prisma } from '../config/prisma';

type ProjectInput = {
  name?: string;
  description?: string | null;
  applicationName?: string | null;
  environment?: string | null;
};

export const projectRepository = {
  list: (workspaceId: string) =>
    prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { suites: true, testCases: true } } },
    }),

  find: (workspaceId: string, id: string) =>
    prisma.project.findFirst({
      where: { id, workspaceId },
      include: { _count: { select: { suites: true, testCases: true } } },
    }),

  create: (workspaceId: string, data: ProjectInput & { name: string }) =>
    prisma.project.create({ data: { ...data, workspaceId } }),

  update: (id: string, data: ProjectInput) => prisma.project.update({ where: { id }, data }),

  /** Deletes a project and everything under it atomically. */
  deleteCascade: (workspaceId: string, id: string) =>
    prisma.$transaction(async (tx) => {
      const cases = await tx.testCase.findMany({ where: { projectId: id, workspaceId }, select: { id: true } });
      const caseIds = cases.map((c) => c.id);
      if (caseIds.length) await tx.testExecution.deleteMany({ where: { testCaseId: { in: caseIds }, workspaceId } });
      await tx.testCase.deleteMany({ where: { projectId: id, workspaceId } });
      await tx.testSuite.deleteMany({ where: { projectId: id, workspaceId } });
      await tx.project.delete({ where: { id } });
    }),
};
