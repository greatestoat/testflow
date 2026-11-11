import { suiteService } from '../services/suite.service';
import { asyncHandler, created, ok } from '../utils/http';

export const suiteController = {
  list: asyncHandler(async (req, res) =>
    ok(res, await suiteService.list(req.auth!.workspaceId, req.query.projectId as string | undefined)),
  ),
  create: asyncHandler(async (req, res) => created(res, await suiteService.create(req.auth!.workspaceId, req.body))),
  update: asyncHandler(async (req, res) =>
    ok(res, await suiteService.update(req.auth!.workspaceId, req.params.id, req.body)),
  ),
  remove: asyncHandler(async (req, res) => {
    await suiteService.remove(req.auth!.workspaceId, req.params.id);
    res.status(204).send();
  }),
};
