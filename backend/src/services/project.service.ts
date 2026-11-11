import { projectRepository } from '../repositories/project.repository';
import { notFound } from '../utils/errors';

export const projectService = {
  list: (workspaceId: string) => projectRepository.list(workspaceId),

  async get(workspaceId: string, id: string) {
    const project = await projectRepository.find(workspaceId, id);
    if (!project) throw notFound('Project');
    return project;
  },

  create: (workspaceId: string, data: { name: string; description?: string | null; applicationName?: string | null; environment?: string | null }) =>
    projectRepository.create(workspaceId, data),

  async update(workspaceId: string, id: string, data: Record<string, unknown>) {
    await projectService.get(workspaceId, id); // ownership check
    return projectRepository.update(id, data);
  },

  async remove(workspaceId: string, id: string) {
    await projectService.get(workspaceId, id);
    await projectRepository.deleteCascade(workspaceId, id);
  },
};
