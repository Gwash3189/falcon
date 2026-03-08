import { Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

interface Project {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export default class ProjectsList extends Command {
  static override description = 'List all projects';
  static override examples = ['$ falcon projects:list', '$ falcon projects:list --json'];
  static override flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { flags } = await this.parse(ProjectsList);
    const config = await requireConfig();
    const projects = await apiFetch<Project[]>(config, '/api/projects');

    if (flags.json) {
      this.log(JSON.stringify(projects, null, 2));
      return;
    }

    if (projects.length === 0) {
      this.log('No projects yet. Create one with: falcon projects:create');
      return;
    }

    this.log('');
    for (const p of projects) {
      this.log(`  ${p.name} (${p.slug})`);
      this.log(`  ID: ${p.id}`);
      this.log('');
    }
  }
}
