import { createDb } from '../db/connection.js';
import { createProjectCommand } from './commands/create_project.js';
import { deleteProjectCommand } from './commands/delete_project.js';
import { getProjectCommand } from './commands/get_project.js';
import { getProjectBySlugCommand } from './commands/get_project_by_slug.js';
import { listProjectsCommand } from './commands/list_projects.js';
import { updateProjectCommand } from './commands/update_project.js';

export type { Project } from '../db/schema/index.js';

export async function listProjects() {
  return listProjectsCommand({
    dependencies: { db: createDb() },
    params: {},
  });
}

export async function getProject(id: string) {
  return getProjectCommand({
    dependencies: { db: createDb() },
    params: { id },
  });
}

export async function getProjectBySlug(slug: string) {
  return getProjectBySlugCommand({
    dependencies: { db: createDb() },
    params: { slug },
  });
}

export async function createProject(data: { name: string; slug: string }) {
  return createProjectCommand({
    dependencies: { db: createDb() },
    params: data,
  });
}

export async function updateProject(id: string, data: { name?: string; slug?: string }) {
  return updateProjectCommand({
    dependencies: { db: createDb() },
    params: { id, data },
  });
}

export async function deleteProject(id: string) {
  return deleteProjectCommand({
    dependencies: { db: createDb() },
    params: { id },
  });
}
