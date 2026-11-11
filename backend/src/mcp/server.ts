import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { projectService } from '../services/project.service';
import { suiteService } from '../services/suite.service';
import { testCaseService } from '../services/testcase.service';
import { executionService } from '../services/execution.service';
import { reportService } from '../services/report.service';
import { AppError } from '../utils/errors';
import * as v from '../validators';

const text = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] });

/** Wraps a tool handler so domain errors become readable MCP tool errors. */
const safe = (fn: (args: any) => Promise<unknown>) => async (args: any) => {
  try {
    return text(await fn(args ?? {}));
  } catch (err) {
    const message =
      err instanceof AppError ? err.message : err instanceof z.ZodError ? `Invalid input: ${err.issues[0]?.message}` : 'Internal error';
    return { isError: true, content: [{ type: 'text' as const, text: message }] };
  }
};

const caseShape = {
  projectId: v.objectId,
  suiteId: v.objectId.optional(),
  title: z.string().min(1).max(250),
  description: z.string().max(5000).optional(),
  preconditions: z.string().max(5000).optional(),
  steps: z.array(z.string().min(1).max(1000)).max(100),
  expectedResult: z.string().min(1).max(5000),
  priority: v.Priority.optional(),
  type: v.TestType.optional(),
  status: v.TestStatus.optional(),
};

/**
 * Builds an MCP server scoped to ONE workspace. The workspace id comes from the
 * authenticated credential, never from tool arguments, so tools cannot cross tenants.
 * No AI runs here: Claude (run by the customer) calls these tools.
 */
export function buildMcpServer(workspaceId: string, credentialName: string) {
  const server = new McpServer({ name: 'testflow', version: '1.0.0' });
  const actor = { label: `mcp:${credentialName}` };

  // Loosely typed on purpose: the SDK's deep generics + zod make tsc extremely slow otherwise.
  const tool = (name: string, description: string, shape: z.ZodRawShape, handler: (args: any) => Promise<unknown>) =>
    (server as any).registerTool(name, { description, inputSchema: shape }, safe(handler));

  tool('list_projects', 'List all projects in the TestFlow workspace.', {}, async () => projectService.list(workspaceId));

  tool(
    'create_project',
    'Create a project (an application/environment under test).',
    {
      name: z.string().min(1).max(150),
      description: z.string().max(5000).optional(),
      applicationName: z.string().max(150).optional(),
      environment: z.string().max(100).optional(),
    },
    async (a) => projectService.create(workspaceId, a),
  );

  tool('list_suites', 'List test suites, optionally for one project.', { projectId: v.objectId.optional() }, async (a) =>
    suiteService.list(workspaceId, a.projectId),
  );

  tool(
    'create_suite',
    'Create a test suite inside a project.',
    {
      projectId: v.objectId,
      name: z.string().min(1).max(150),
      description: z.string().max(5000).optional(),
      feature: z.string().max(150).optional(),
    },
    async (a) => suiteService.create(workspaceId, a),
  );

  tool(
    'list_test_cases',
    'List/search test cases with optional filters. Paginated.',
    {
      projectId: v.objectId.optional(),
      suiteId: v.objectId.optional(),
      status: v.TestStatus.optional(),
      priority: v.Priority.optional(),
      type: v.TestType.optional(),
      search: z.string().max(200).optional(),
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    async (a) => testCaseService.list(workspaceId, v.testCaseQuery.parse(a)),
  );

  tool('get_test_case', 'Get one test case by id.', { id: v.objectId }, async (a) => testCaseService.get(workspaceId, a.id));

  tool('create_test_case', 'Store one test case you generated.', caseShape, async (a) =>
    testCaseService.create(workspaceId, v.testCaseCreate.parse(a)),
  );

  tool(
    'bulk_create_test_cases',
    'Store many generated test cases at once (max 50, all-or-nothing).',
    { testCases: z.array(z.object(caseShape)).min(1).max(50) },
    async (a) => testCaseService.createMany(workspaceId, (a.testCases as unknown[]).map((t) => v.testCaseCreate.parse(t))),
  );

  tool(
    'update_test_case',
    'Update fields of an existing test case.',
    {
      id: v.objectId,
      suiteId: v.objectId.optional(),
      title: z.string().min(1).max(250).optional(),
      description: z.string().max(5000).optional(),
      preconditions: z.string().max(5000).optional(),
      steps: z.array(z.string().min(1).max(1000)).max(100).optional(),
      expectedResult: z.string().min(1).max(5000).optional(),
      priority: v.Priority.optional(),
      type: v.TestType.optional(),
      status: v.TestStatus.optional(),
    },
    async (a) => {
      const { id, ...rest } = a;
      return testCaseService.update(workspaceId, id, v.testCaseUpdate.parse(rest));
    },
  );

  tool(
    'record_execution',
    'Record the result of running a test case.',
    { testCaseId: v.objectId, status: v.ExecStatus, executionNotes: z.string().max(5000).optional() },
    async (a) => executionService.record(workspaceId, a.testCaseId, a, actor),
  );

  tool('get_quality_summary', 'Get totals, pass rate and execution breakdown for the workspace.', {}, async () =>
    reportService.summary(workspaceId),
  );

  return server;
}
