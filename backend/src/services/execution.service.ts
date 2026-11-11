import type { ExecStatus } from '@prisma/client';
import { executionRepository } from '../repositories/execution.repository';
import { testCaseService } from './testcase.service';

export const executionService = {
  async record(
    workspaceId: string,
    testCaseId: string,
    input: { status: ExecStatus; executionNotes?: string | null },
    actor: { userId?: string; label?: string },
  ) {
    await testCaseService.get(workspaceId, testCaseId); // ownership check
    return executionRepository.create({
      workspaceId,
      testCaseId,
      status: input.status,
      executionNotes: input.executionNotes ?? null,
      executedById: actor.userId ?? null,
      executedBy: actor.label ?? null,
    });
  },

  async history(workspaceId: string, testCaseId: string) {
    await testCaseService.get(workspaceId, testCaseId);
    return executionRepository.listForTestCase(workspaceId, testCaseId);
  },
};
