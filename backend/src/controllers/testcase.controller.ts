import { testCaseService } from '../services/testcase.service';
import { executionService } from '../services/execution.service';
import { asyncHandler, created, ok } from '../utils/http';
import type { TestCaseQuery } from '../validators';

export const testCaseController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await testCaseService.list(req.auth!.workspaceId, req.query as unknown as TestCaseQuery);
    ok(res, items, meta);
  }),
  get: asyncHandler(async (req, res) => ok(res, await testCaseService.get(req.auth!.workspaceId, req.params.id))),
  create: asyncHandler(async (req, res) => created(res, await testCaseService.create(req.auth!.workspaceId, req.body))),
  update: asyncHandler(async (req, res) =>
    ok(res, await testCaseService.update(req.auth!.workspaceId, req.params.id, req.body)),
  ),
  remove: asyncHandler(async (req, res) => {
    await testCaseService.remove(req.auth!.workspaceId, req.params.id);
    res.status(204).send();
  }),
  execute: asyncHandler(async (req, res) =>
    created(
      res,
      await executionService.record(req.auth!.workspaceId, req.params.id, req.body, { userId: req.auth!.userId }),
    ),
  ),
  executions: asyncHandler(async (req, res) =>
    ok(res, await executionService.history(req.auth!.workspaceId, req.params.id)),
  ),
};
