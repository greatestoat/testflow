import { prisma } from '../config/prisma';
import { executionRepository } from '../repositories/execution.repository';
import { testCaseRepository } from '../repositories/testcase.repository';

const EXEC_STATUSES = ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'] as const;

/** Latest execution status per test case id. */
async function latestStatuses(workspaceId: string) {
  const all = await executionRepository.allForWorkspace(workspaceId); // newest first
  const latest = new Map<string, string>();
  for (const e of all) if (!latest.has(e.testCaseId)) latest.set(e.testCaseId, e.status);
  return latest;
}

const csvCell = (v: unknown) => {
  let s = v == null ? '' : String(v);
  // Neutralise spreadsheet formula injection
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export const reportService = {
  async summary(workspaceId: string) {
    const [projects, suites, testCases, byStatus, latest, byPriority, byTcStatus] = await Promise.all([
      prisma.project.count({ where: { workspaceId } }),
      prisma.testSuite.count({ where: { workspaceId } }),
      prisma.testCase.count({ where: { workspaceId } }),
      executionRepository.countByStatus(workspaceId),
      latestStatuses(workspaceId),
      prisma.testCase.groupBy({ by: ['priority'], where: { workspaceId }, _count: { _all: true } }),
      prisma.testCase.groupBy({ by: ['status'], where: { workspaceId }, _count: { _all: true } }),
    ]);

    const executionsByStatus = Object.fromEntries(EXEC_STATUSES.map((s) => [s, 0])) as Record<string, number>;
    let totalExecutions = 0;
    for (const row of byStatus) {
      executionsByStatus[row.status] = row._count._all;
      totalExecutions += row._count._all;
    }

    const latestCounts = Object.fromEntries(EXEC_STATUSES.map((s) => [s, 0])) as Record<string, number>;
    for (const s of latest.values()) latestCounts[s] += 1;
    const executedCases = latest.size;
    const passRate = executedCases === 0 ? null : Math.round((latestCounts.PASSED / executedCases) * 1000) / 10;

    return {
      totals: { projects, suites, testCases, executions: totalExecutions },
      testCasesByPriority: Object.fromEntries(byPriority.map((r) => [r.priority, r._count._all])),
      testCasesByStatus: Object.fromEntries(byTcStatus.map((r) => [r.status, r._count._all])),
      executionsByStatus,
      latestResults: { ...latestCounts, notRun: Math.max(testCases - executedCases, 0) },
      passRate, // % of executed cases whose latest result is PASSED; null if nothing executed
    };
  },

  async exportCsv(workspaceId: string, projectId?: string) {
    const [cases, latest] = await Promise.all([
      testCaseRepository.allForReport(workspaceId, projectId),
      latestStatuses(workspaceId),
    ]);
    const header = ['ID', 'Project', 'Suite', 'Title', 'Priority', 'Type', 'Status', 'Preconditions', 'Steps', 'Expected Result', 'Latest Execution'];
    const rows = cases.map((c) => [
      c.id,
      c.project.name,
      c.suite?.name ?? '',
      c.title,
      c.priority,
      c.type,
      c.status,
      c.preconditions ?? '',
      c.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
      c.expectedResult,
      latest.get(c.id) ?? 'NOT_RUN',
    ]);
    return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  },
};
