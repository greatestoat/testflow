import { projectService } from '../services/project.service';
import { asyncHandler, created, ok } from '../utils/http';

export const projectController = {
  list: asyncHandler(async (req, res) => ok(res, await projectService.list(req.auth!.workspaceId))),
  get: asyncHandler(async (req, res) => ok(res, await projectService.get(req.auth!.workspaceId, req.params.id))),
  create: asyncHandler(async (req, res) => created(res, await projectService.create(req.auth!.workspaceId, req.body))),
  update: asyncHandler(async (req, res) =>
    ok(res, await projectService.update(req.auth!.workspaceId, req.params.id, req.body)),
  ),
  remove: asyncHandler(async (req, res) => {
    await projectService.remove(req.auth!.workspaceId, req.params.id);
    res.status(204).send();
  }),
};
