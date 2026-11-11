import { testCaseRepository } from '../repositories/testcase.repository';
import { projectService } from './project.service';
import { suiteService } from './suite.service';
import { badRequest, notFound } from '../utils/errors';
import type { TestCaseCreate, TestCaseQuery, TestCaseUpdate } from '../validators';

export const testCaseService = {
  async list(workspaceId: string, q: TestCaseQuery) {
    const { items, total } = await testCaseRepository.list(workspaceId, q);
    return { items, meta: { total, page: q.page, limit: q.limit } };
  },

  async get(workspaceId: string, id: string) {
    const tc = await testCaseRepository.find(workspaceId, id);
    if (!tc) throw notFound('Test case');
    return tc;
  },

  /** Verifies project (and suite, if given) belong to the workspace and to each other. */
  async assertParents(workspaceId: string, projectId: string, suiteId?: string | null) {
    await projectService.get(workspaceId, projectId);
    if (suiteId) {
      const suite = await suiteService.get(workspaceId, suiteId);
      if (suite.projectId !== projectId) throw badRequest('Suite does not belong to this project');
    }
  },

  async create(workspaceId: string, data: TestCaseCreate) {
    await testCaseService.assertParents(workspaceId, data.projectId, data.suiteId);
    return testCaseRepository.create({ ...data, suiteId: data.suiteId ?? null, workspaceId });
  },

  async createMany(workspaceId: string, rows: TestCaseCreate[]) {
    const checked = new Set<string>();
    for (const r of rows) {
      const key = `${r.projectId}:${r.suiteId ?? ''}`;
      if (!checked.has(key)) {
        await testCaseService.assertParents(workspaceId, r.projectId, r.suiteId);
        checked.add(key);
      }
    }
    return testCaseRepository.createMany(rows.map((r) => ({ ...r, suiteId: r.suiteId ?? null, workspaceId })));
  },

  async update(workspaceId: string, id: string, data: TestCaseUpdate) {
    const existing = await testCaseService.get(workspaceId, id);
    if (data.suiteId) await testCaseService.assertParents(workspaceId, existing.projectId, data.suiteId);
    return testCaseRepository.update(id, data);
  },

  async remove(workspaceId: string, id: string) {
    await testCaseService.get(workspaceId, id);
    await testCaseRepository.deleteWithExecutions(workspaceId, id);
  },
};
