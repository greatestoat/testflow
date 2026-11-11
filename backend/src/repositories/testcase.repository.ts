import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { TestCaseQuery } from '../validators';

export const testCaseRepository = {
  async list(workspaceId: string, q: TestCaseQuery) {
    const where: Prisma.TestCaseWhereInput = {
      workspaceId,
      ...(q.projectId ? { projectId: q.projectId } : {}),
      ...(q.suiteId ? { suiteId: q.suiteId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.priority ? { priority: q.priority } : {}),
      ...(q.type ? { type: q.type } : {}),
      ...(q.search ? { title: { contains: q.search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.testCase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.testCase.count({ where }),
    ]);
    return { items, total };
  },

  find: (workspaceId: string, id: string) => prisma.testCase.findFirst({ where: { id, workspaceId } }),

  create: (data: Prisma.TestCaseUncheckedCreateInput) => prisma.testCase.create({ data }),

  createMany: (rows: Prisma.TestCaseUncheckedCreateInput[]) =>
    prisma.$transaction(rows.map((data) => prisma.testCase.create({ data }))),

  update: (id: string, data: Prisma.TestCaseUncheckedUpdateInput) => prisma.testCase.update({ where: { id }, data }),

  deleteWithExecutions: (workspaceId: string, id: string) =>
    prisma.$transaction([
      prisma.testExecution.deleteMany({ where: { testCaseId: id, workspaceId } }),
      prisma.testCase.delete({ where: { id } }),
    ]),

  allForReport: (workspaceId: string, projectId?: string) =>
    prisma.testCase.findMany({
      where: { workspaceId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: 'asc' },
      include: { project: { select: { name: true } }, suite: { select: { name: true } } },
    }),
};
