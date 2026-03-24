import { Args, Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

interface Environment {
  id: string;
  name: string;
  slug: string;
  project_id: string;
}

export default class EnvironmentsGet extends Command {
  static override description = 'Get an environment by ID';
  static override examples = ['$ falcon environments:get <env-id> --project <project-id>'];

  static override args = {
    id: Args.string({ description: 'Environment ID', required: true }),
  };

  static override flags = {
    project: Flags.string({ description: 'Project ID', required: true }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { args, flags } = await this.parse(EnvironmentsGet);
    const config = await requireConfig();
    const env = await apiFetch<Environment>(
      config,
      `/api/projects/${flags.project}/environments/${args.id}`,
    );

    if (flags.json) {
      this.log(JSON.stringify(env, null, 2));
      return;
    }

    this.log('');
    this.log(`  ${env.name} (${env.slug})`);
    this.log(`  ID: ${env.id}`);
    this.log(`  Project: ${env.project_id}`);
    this.log('');
  }
}
