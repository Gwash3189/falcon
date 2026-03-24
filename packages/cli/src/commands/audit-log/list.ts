import { Command, Flags } from '@oclif/core';
import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';

interface AuditLogEntry {
  id: string;
  flag_id: string;
  environment_id: string;
  action: string;
  actor: string | null;
  before_state: unknown;
  after_state: unknown;
  created_at: string;
}

export default class AuditLogList extends Command {
  static override description = 'List audit log entries for an environment';
  static override examples = [
    '$ falcon audit-log:list --project <id> --env <id>',
    '$ falcon audit-log:list --project <id> --env <id> --flag-id <id>',
  ];

  static override flags = {
    project: Flags.string({ description: 'Project ID', required: true }),
    env: Flags.string({ description: 'Environment ID', required: true }),
    'flag-id': Flags.string({ description: 'Filter by flag ID' }),
    limit: Flags.integer({ description: 'Max entries to return', default: 50 }),
    offset: Flags.integer({ description: 'Number of entries to skip', default: 0 }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { flags } = await this.parse(AuditLogList);
    const config = await requireConfig();

    const params = new URLSearchParams();
    params.set('limit', String(flags.limit));
    params.set('offset', String(flags.offset));
    if (flags['flag-id']) params.set('flag_id', flags['flag-id']);

    const items = await apiFetch<AuditLogEntry[]>(
      config,
      `/api/projects/${flags.project}/environments/${flags.env}/audit-log?${params.toString()}`,
    );

    if (flags.json) {
      this.log(JSON.stringify(items, null, 2));
      return;
    }

    if (items.length === 0) {
      this.log('No audit log entries found.');
      return;
    }

    this.log('');
    for (const entry of items) {
      const time = new Date(entry.created_at).toLocaleString();
      const actor = entry.actor ?? 'unknown';
      this.log(`  ${time}  ${entry.action}  by ${actor}  (flag: ${entry.flag_id})`);
    }
    this.log('');
  }
}
