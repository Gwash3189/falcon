import { Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

interface Environment {
  id: string;
  name: string;
  slug: string;
  project_id: string;
}

export default class EnvironmentsList extends Command {
  static override description = 'List environments in a project';
  static override examples = ['$ falcon environments:list --project <project-id>'];

  static override flags = {
    project: Flags.string({ description: 'Project ID', required: true }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { flags } = await this.parse(EnvironmentsList);
    const config = await requireConfig();
    const envs = await apiFetch<Environment[]>(
      config,
      `/api/projects/${flags.project}/environments`,
    );

    if (flags.json) {
      this.log(JSON.stringify(envs, null, 2));
      return;
    }

    if (envs.length === 0) {
      this.log('No environments yet. Create one with:');
      this.log(
        `  falcon environments:create "Production" --project ${flags.project} --slug production`,
      );
      return;
    }

    this.log('');
    for (const e of envs) {
      this.log(`  ${e.name} (${e.slug})`);
      this.log(`  ID: ${e.id}`);
      this.log('');
    }
  }
}
