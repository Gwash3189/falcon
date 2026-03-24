import { Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

interface ApiKey {
  id: string;
  keyPrefix: string;
  environmentId: string;
  createdAt: string;
}

export default class ApiKeysList extends Command {
  static override description = 'List API keys for an environment';
  static override examples = ['$ falcon api-keys:list --project <id> --env <id>'];

  static override flags = {
    project: Flags.string({ description: 'Project ID', required: true }),
    env: Flags.string({ description: 'Environment ID', required: true }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { flags } = await this.parse(ApiKeysList);
    const config = await requireConfig();
    const keys = await apiFetch<ApiKey[]>(
      config,
      `/api/projects/${flags.project}/environments/${flags.env}/api-keys`,
    );

    if (flags.json) {
      this.log(JSON.stringify(keys, null, 2));
      return;
    }

    if (keys.length === 0) {
      this.log('No API keys found.');
      return;
    }

    for (const k of keys) {
      this.log(`${k.id}  ${k.keyPrefix}…  created: ${k.createdAt}`);
    }
  }
}
