import { Args, Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

interface Project {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export default class ProjectsGet extends Command {
  static override description = 'Get a project by ID';
  static override examples = ['$ falcon projects:get <project-id>'];

  static override args = {
    id: Args.string({ description: 'Project ID', required: true }),
  };

  static override flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { args, flags } = await this.parse(ProjectsGet);
    const config = await requireConfig();
    const project = await apiFetch<Project>(config, `/api/projects/${args.id}`);

    if (flags.json) {
      this.log(JSON.stringify(project, null, 2));
      return;
    }

    this.log('');
    this.log(`  ${project.name} (${project.slug})`);
    this.log(`  ID: ${project.id}`);
    this.log(`  Created: ${project.created_at}`);
    this.log('');
  }
}
