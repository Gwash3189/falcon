import { Args, Command, Flags } from '@oclif/core';
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

export default class FlagsCreate extends Command {
  static override description = 'Create a feature flag';
  static override examples = [
    '$ falcon flags:create my-feature --project <id> --env <id> --type boolean',
    '$ falcon flags:create dark-mode --project <id> --env <id> --type percentage --percentage 20',
    '$ falcon flags:create beta --project <id> --env <id> --type identifier --identifiers user-1,user-2',
  ];

  static override args = {
    key: Args.string({ description: 'Flag key (lowercase, hyphens ok)', required: true }),
  };

  static override flags = {
    project: Flags.string({ description: 'Project ID', required: true }),
    env: Flags.string({ description: 'Environment ID', required: true }),
    type: Flags.string({
      description: 'Flag type: boolean | percentage | identifier',
      required: true,
      options: ['boolean', 'percentage', 'identifier'],
    }),
    enabled: Flags.boolean({ description: 'Enable the flag on creation', default: false }),
    percentage: Flags.integer({ description: 'Rollout percentage (0-100), for type=percentage' }),
    identifiers: Flags.string({
      description: 'Comma-separated list of identifiers, for type=identifier',
    }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { args, flags } = await this.parse(FlagsCreate);
    const config = await requireConfig();

    const body: Record<string, unknown> = {
      key: args.key,
      type: flags.type,
      enabled: flags.enabled,
    };

    if (flags.type === 'percentage') {
      if (flags.percentage === undefined) {
        this.error('--percentage is required for type=percentage');
      }
      body.percentage = flags.percentage;
    }

    if (flags.type === 'identifier') {
      if (!flags.identifiers) {
        this.error('--identifiers is required for type=identifier (comma-separated)');
      }
      body.identifiers = flags.identifiers.split(',').map((s) => s.trim());
    }

    const flag = await apiFetch<Flag>(
      config,
      `/api/projects/${flags.project}/environments/${flags.env}/flags`,
      { method: 'POST', body: JSON.stringify(body) },
    );

    if (flags.json) {
      this.log(JSON.stringify(flag, null, 2));
      return;
    }

    this.log('');
    this.log(`✓ Flag created: ${flag.key} [${flag.type}]`);
    this.log(`  Status: ${flag.enabled ? 'enabled' : 'disabled'}`);
    this.log('');
    this.log('Toggle it:');
    this.log(
      `  falcon flags:update ${flag.key} --project ${flags.project} --env ${flags.env} --enabled`,
    );
  }
}
