import { z } from 'zod';

export const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');
export const idParams = z.object({ id: objectId });

const optText = (max = 5000) => z.string().trim().max(max).optional().nullable();

export const Priority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const TestType = z.enum(['FUNCTIONAL', 'REGRESSION', 'SMOKE', 'INTEGRATION', 'E2E', 'PERFORMANCE', 'SECURITY']);
export const TestStatus = z.enum(['DRAFT', 'READY', 'DEPRECATED']);
export const ExecStatus = z.enum(['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED']);

// ---- auth
export const registerBody = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  workspaceName: z.string().trim().min(1).max(100).optional(),
});
export const loginBody = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

// ---- projects
export const projectCreate = z.object({
  name: z.string().trim().min(1).max(150),
  description: optText(),
  applicationName: optText(150),
  environment: optText(100),
});
export const projectUpdate = projectCreate.partial().refine((v) => Object.keys(v).length > 0, 'No fields to update');

// ---- suites
export const suiteCreate = z.object({
  projectId: objectId,
  name: z.string().trim().min(1).max(150),
  description: optText(),
  feature: optText(150),
});
export const suiteUpdate = suiteCreate
  .omit({ projectId: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'No fields to update');
export const suiteQuery = z.object({ projectId: objectId.optional() });

// ---- test cases
export const testCaseCreate = z.object({
  projectId: objectId,
  suiteId: objectId.optional().nullable(),
  title: z.string().trim().min(1).max(250),
  description: optText(),
  preconditions: optText(),
  steps: z.array(z.string().trim().min(1).max(1000)).max(100).default([]),
  expectedResult: z.string().trim().min(1).max(5000),
  priority: Priority.default('MEDIUM'),
  type: TestType.default('FUNCTIONAL'),
  status: TestStatus.default('DRAFT'),
});
export const testCaseUpdate = testCaseCreate
  .omit({ projectId: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'No fields to update');
export const testCaseQuery = z.object({
  projectId: objectId.optional(),
  suiteId: objectId.optional(),
  status: TestStatus.optional(),
  priority: Priority.optional(),
  type: TestType.optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ---- executions
export const executeBody = z.object({
  status: ExecStatus,
  executionNotes: z.string().trim().max(5000).optional().nullable(),
});

// ---- mcp credentials
export const mcpCredentialCreate = z.object({ name: z.string().trim().min(1).max(100) });

export const reportQuery = z.object({ projectId: objectId.optional() });

export type TestCaseCreate = z.infer<typeof testCaseCreate>;
export type TestCaseUpdate = z.infer<typeof testCaseUpdate>;
export type TestCaseQuery = z.infer<typeof testCaseQuery>;
