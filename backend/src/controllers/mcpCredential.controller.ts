import { mcpCredentialService } from '../services/mcpCredential.service';
import { asyncHandler, created, ok } from '../utils/http';

export const mcpCredentialController = {
  list: asyncHandler(async (req, res) => ok(res, await mcpCredentialService.list(req.auth!.workspaceId))),
  create: asyncHandler(async (req, res) =>
    created(res, await mcpCredentialService.create(req.auth!.workspaceId, req.body.name)),
  ),
  revoke: asyncHandler(async (req, res) => {
    await mcpCredentialService.revoke(req.auth!.workspaceId, req.params.id);
    res.status(204).send();
  }),
};
