import { Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

interface Flag {
  id: string;
  key: string;
  type: string;
  enabled: boolean;
  percentage: number | null;
  identifiers: string[] | null;
}

export default class FlagsList extends Command {
  static override description = 'List feature flags in an environment';
  static override examples = ['$ falcon flags:list --project <id> --env <id>'];

  static override flags = {
    project: Flags.string({ description: 'Project ID', required: true }),
    env: Flags.string({ description: 'Environment ID', required: true }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { flags } = await this.parse(FlagsList);
    const config = await requireConfig();
    const items = await apiFetch<Flag[]>(
      config,
      `/api/projects/${flags.project}/environments/${flags.env}/flags`,
    );

    if (flags.json) {
      this.log(JSON.stringify(items, null, 2));
      return;
    }

    if (items.length === 0) {
      this.log('No flags yet. Create one with:');
      this.log(
        `  falcon flags:create my-flag --project ${flags.project} --env ${flags.env} --type boolean`,
      );
      return;
    }

    this.log('');
    for (const f of items) {
      const status = f.enabled ? '● on ' : '○ off';
      const detail =
        f.type === 'percentage'
          ? ` (${f.percentage}%)`
          : f.type === 'identifier'
            ? ` (${f.identifiers?.length ?? 0} identifiers)`
            : '';
      this.log(`  ${status}  ${f.key}  [${f.type}${detail}]`);
    }
    this.log('');
  }
}
