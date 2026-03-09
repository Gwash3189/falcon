import { createDb } from '../db/connection.js';
import { createEnvironmentCommand } from './commands/create_environment.js';
import { deleteEnvironmentCommand } from './commands/delete_environment.js';
import { getEnvironmentCommand } from './commands/get_environment.js';
import { listEnvironmentsCommand } from './commands/list_environments.js';
import { updateEnvironmentCommand } from './commands/update_environment.js';

export async function listEnvironments(projectId: string) {
  return listEnvironmentsCommand({
    dependencies: { db: createDb() },
    params: { projectId },
  });
}

export async function getEnvironment(id: string, projectId: string) {
  return getEnvironmentCommand({
    dependencies: { db: createDb() },
    params: { id, projectId },
  });
}

export async function createEnvironment(projectId: string, data: { name: string; slug: string }) {
  return createEnvironmentCommand({
    dependencies: { db: createDb() },
    params: { projectId, ...data },
  });
}

export async function updateEnvironment(
  id: string,
  projectId: string,
  data: { name?: string; slug?: string },
) {
  return updateEnvironmentCommand({
    dependencies: { db: createDb() },
    params: { id, projectId, data },
  });
}

export async function deleteEnvironment(id: string, projectId: string) {
  return deleteEnvironmentCommand({
    dependencies: { db: createDb() },
    params: { id, projectId },
  });
}
