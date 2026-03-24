import { Args, Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

export default class ProjectsDelete extends Command {
  static override description = 'Delete a project';
  static override examples = ['$ falcon projects:delete <id>'];

  static override args = {
    id: Args.string({ description: 'Project ID', required: true }),
  };

  static override flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { args, flags } = await this.parse(ProjectsDelete);
    const config = await requireConfig();
    await apiFetch<void>(config, `/api/projects/${args.id}`, { method: 'DELETE' });

    if (flags.json) {
      this.log(JSON.stringify({ deleted: true, id: args.id }));
      return;
    }

    this.log(`✓ Project deleted: ${args.id}`);
  }
}
