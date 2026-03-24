import { Args, Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

export default class EnvironmentsDelete extends Command {
  static override description = 'Delete an environment';
  static override examples = ['$ falcon environments:delete <id> --project <id>'];

  static override args = {
    id: Args.string({ description: 'Environment ID', required: true }),
  };

  static override flags = {
    project: Flags.string({ description: 'Project ID', required: true }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { args, flags } = await this.parse(EnvironmentsDelete);
    const config = await requireConfig();
    await apiFetch<void>(config, `/api/projects/${flags.project}/environments/${args.id}`, {
      method: 'DELETE',
    });

    if (flags.json) {
      this.log(JSON.stringify({ deleted: true, id: args.id }));
      return;
    }

    this.log(`✓ Environment deleted: ${args.id}`);
  }
}
