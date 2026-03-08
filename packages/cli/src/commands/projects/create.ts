import { Args, Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

interface Project {
  id: string;
  name: string;
  slug: string;
}

export default class ProjectsCreate extends Command {
  static override description = 'Create a new project';
  static override examples = [
    '$ falcon projects:create "My App" --slug my-app',
    '$ falcon projects:create "My App" --slug my-app --json',
  ];

  static override args = {
    name: Args.string({ description: 'Project name', required: true }),
  };

  static override flags = {
    slug: Flags.string({ description: 'URL-safe identifier (e.g. my-app)', required: true }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { args, flags } = await this.parse(ProjectsCreate);
    const config = await requireConfig();
    const project = await apiFetch<Project>(config, '/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: args.name, slug: flags.slug }),
    });

    if (flags.json) {
      this.log(JSON.stringify(project, null, 2));
      return;
    }

    this.log('');
    this.log(`✓ Project created: ${project.name}`);
    this.log(`  ID:   ${project.id}`);
    this.log(`  Slug: ${project.slug}`);
    this.log('');
    this.log('Next: create an environment');
    this.log(`  falcon environments:create production --project ${project.id} --slug production`);
  }
}
