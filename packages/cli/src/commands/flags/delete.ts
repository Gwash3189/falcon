import { Args, Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

export default class FlagsDelete extends Command {
  static override description = 'Delete a feature flag';
  static override examples = ['$ falcon flags:delete my-feature --project <id> --env <id>'];

  static override args = {
    key: Args.string({ description: 'Flag key', required: true }),
  };

  static override flags = {
    project: Flags.string({ description: 'Project ID', required: true }),
    env: Flags.string({ description: 'Environment ID', required: true }),
  };

  override async run() {
    const { args, flags } = await this.parse(FlagsDelete);
    const config = await requireConfig();
    await apiFetch<void>(
      config,
      `/api/projects/${flags.project}/environments/${flags.env}/flags/${args.key}`,
      { method: 'DELETE' },
    );
    this.log(`✓ Flag deleted: ${args.key}`);
  }
}
