import { Args, Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

export default class ApiKeysRevoke extends Command {
  static override description = 'Revoke an API key';
  static override examples = ['$ falcon api-keys:revoke <key-id> --project <id> --env <id>'];

  static override args = {
    id: Args.string({ description: 'API key ID', required: true }),
  };

  static override flags = {
    project: Flags.string({ description: 'Project ID', required: true }),
    env: Flags.string({ description: 'Environment ID', required: true }),
  };

  override async run() {
    const { args, flags } = await this.parse(ApiKeysRevoke);
    const config = await requireConfig();
    await apiFetch<void>(
      config,
      `/api/projects/${flags.project}/environments/${flags.env}/api-keys/${args.id}`,
      { method: 'DELETE' },
    );
    this.log(`✓ API key revoked: ${args.id}`);
  }
}
