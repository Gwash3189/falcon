import { Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

interface ApiKey {
  id: string;
  key_prefix: string;
  environment_id: string;
  rawKey: string;
}

export default class ApiKeysCreate extends Command {
  static override description = 'Create an API key for an environment';
  static override examples = ['$ falcon api-keys:create --project <id> --env <id>'];

  static override flags = {
    project: Flags.string({ description: 'Project ID', required: true }),
    env: Flags.string({ description: 'Environment ID', required: true }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { flags } = await this.parse(ApiKeysCreate);
    const config = await requireConfig();
    const key = await apiFetch<ApiKey>(
      config,
      `/api/projects/${flags.project}/environments/${flags.env}/api-keys`,
      { method: 'POST' },
    );

    if (flags.json) {
      this.log(JSON.stringify(key, null, 2));
      return;
    }

    this.log('');
    this.log('✓ API key created');
    this.log('');
    this.log('  Save this key — it will NOT be shown again:');
    this.log('');
    this.log(`  ${key.rawKey}`);
    this.log('');
    this.log('Use this key with the SDK or to authenticate CLI requests:');
    this.log(`  falcon init --key ${key.rawKey}`);
  }
}
