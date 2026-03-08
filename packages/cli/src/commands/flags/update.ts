import { Args, Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

interface Flag {
  id: string;
  key: string;
  type: string;
  enabled: boolean;
}

export default class FlagsUpdate extends Command {
  static override description = 'Update a feature flag (toggle or change config)';
  static override examples = [
    '$ falcon flags:update my-feature --project <id> --env <id> --enabled',
    '$ falcon flags:update dark-mode --project <id> --env <id> --no-enabled',
    '$ falcon flags:update rollout --project <id> --env <id> --percentage 50',
  ];

  static override args = {
    key: Args.string({ description: 'Flag key', required: true }),
  };

  static override flags = {
    project: Flags.string({ description: 'Project ID', required: true }),
    env: Flags.string({ description: 'Environment ID', required: true }),
    enabled: Flags.boolean({ description: 'Enable or disable the flag', allowNo: true }),
    percentage: Flags.integer({ description: 'New rollout percentage (0-100)' }),
    identifiers: Flags.string({ description: 'New comma-separated list of identifiers' }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { args, flags } = await this.parse(FlagsUpdate);
    const config = await requireConfig();

    const body: Record<string, unknown> = {};
    if (flags.enabled !== undefined) body.enabled = flags.enabled;
    if (flags.percentage !== undefined) body.percentage = flags.percentage;
    if (flags.identifiers !== undefined) {
      body.identifiers = flags.identifiers.split(',').map((s) => s.trim());
    }

    if (Object.keys(body).length === 0) {
      this.error('Specify at least one field to update: --enabled, --percentage, --identifiers');
    }

    const flag = await apiFetch<Flag>(
      config,
      `/api/projects/${flags.project}/environments/${flags.env}/flags/${args.key}`,
      { method: 'PUT', body: JSON.stringify(body) },
    );

    if (flags.json) {
      this.log(JSON.stringify(flag, null, 2));
      return;
    }

    this.log(`✓ ${flag.key} → ${flag.enabled ? 'enabled' : 'disabled'}`);
  }
}
