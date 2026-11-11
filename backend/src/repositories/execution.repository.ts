import type { ExecStatus } from '@prisma/client';
import { prisma } from '../config/prisma';

export const executionRepository = {
  create: (data: {
    workspaceId: string;
    testCaseId: string;
    status: ExecStatus;
    executionNotes?: string | null;
    executedById?: string | null;
    executedBy?: string | null;
  }) => prisma.testExecution.create({ data }),

  listForTestCase: (workspaceId: string, testCaseId: string) =>
    prisma.testExecution.findMany({ where: { workspaceId, testCaseId }, orderBy: { executedAt: 'desc' } }),

  /** All executions newest first; callers reduce to latest per test case. */
  allForWorkspace: (workspaceId: string) =>
    prisma.testExecution.findMany({
      where: { workspaceId },
      orderBy: { executedAt: 'desc' },
      select: { testCaseId: true, status: true, executedAt: true },
    }),

  countByStatus: (workspaceId: string) =>
    prisma.testExecution.groupBy({ by: ['status'], where: { workspaceId }, _count: { _all: true } }),
};
