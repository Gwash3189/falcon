import { Args, Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

interface Environment {
  id: string;
  name: string;
  slug: string;
  project_id: string;
}

export default class EnvironmentsCreate extends Command {
  static override description = 'Create a new environment in a project';
  static override examples = [
    '$ falcon environments:create "Production" --project <id> --slug production',
    '$ falcon environments:create "Staging" --project <id> --slug staging',
  ];

  static override args = {
    name: Args.string({ description: 'Environment name', required: true }),
  };

  static override flags = {
    project: Flags.string({ description: 'Project ID', required: true }),
    slug: Flags.string({ description: 'URL-safe identifier (e.g. production)', required: true }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { args, flags } = await this.parse(EnvironmentsCreate);
    const config = await requireConfig();
    const env = await apiFetch<Environment>(config, `/api/projects/${flags.project}/environments`, {
      method: 'POST',
      body: JSON.stringify({ name: args.name, slug: flags.slug }),
    });

    if (flags.json) {
      this.log(JSON.stringify(env, null, 2));
      return;
    }

    this.log('');
    this.log(`✓ Environment created: ${env.name}`);
    this.log(`  ID:   ${env.id}`);
    this.log(`  Slug: ${env.slug}`);
    this.log('');
    this.log('Next: create an API key for this environment');
    this.log(`  falcon api-keys:create --env ${env.id} --project ${flags.project}`);
  }
}
