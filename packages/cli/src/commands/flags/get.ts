import { Args, Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

interface Flag {
  id: string;
  key: string;
  type: string;
  enabled: boolean;
  percentage?: number;
  identifiers?: string[];
  createdAt: string;
  updatedAt: string;
}

export default class FlagsGet extends Command {
  static override description = 'Get a flag by key';
  static override examples = ['$ falcon flags:get <key> --project <id> --env <id>'];

  static override args = {
    key: Args.string({ description: 'Flag key', required: true }),
  };

  static override flags = {
    project: Flags.string({ description: 'Project ID', required: true }),
    env: Flags.string({ description: 'Environment ID', required: true }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { args, flags } = await this.parse(FlagsGet);
    const config = await requireConfig();
    const flag = await apiFetch<Flag>(
      config,
      `/api/projects/${flags.project}/environments/${flags.env}/flags/${args.key}`,
    );

    if (flags.json) {
      this.log(JSON.stringify(flag, null, 2));
      return;
    }

    const status = flag.enabled ? '● on' : '○ off';
    this.log(`${status}  ${flag.key}  (${flag.type})`);
    if (flag.type === 'percentage') this.log(`  Rollout: ${flag.percentage}%`);
    if (flag.type === 'identifier') this.log(`  Identifiers: ${flag.identifiers?.join(', ')}`);
    this.log(`  Updated: ${flag.updatedAt}`);
  }
}
