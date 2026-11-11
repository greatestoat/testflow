import { suiteRepository } from '../repositories/suite.repository';
import { projectService } from './project.service';
import { notFound } from '../utils/errors';

export const suiteService = {
  list: (workspaceId: string, projectId?: string) => suiteRepository.list(workspaceId, projectId),

  async get(workspaceId: string, id: string) {
    const suite = await suiteRepository.find(workspaceId, id);
    if (!suite) throw notFound('Suite');
    return suite;
  },

  async create(
    workspaceId: string,
    data: { projectId: string; name: string; description?: string | null; feature?: string | null },
  ) {
    await projectService.get(workspaceId, data.projectId); // project must belong to this workspace
    return suiteRepository.create(workspaceId, data);
  },

  async update(workspaceId: string, id: string, data: Record<string, unknown>) {
    await suiteService.get(workspaceId, id);
    return suiteRepository.update(id, data);
  },

  async remove(workspaceId: string, id: string) {
    await suiteService.get(workspaceId, id);
    await suiteRepository.deleteDetach(workspaceId, id);
  },
};
