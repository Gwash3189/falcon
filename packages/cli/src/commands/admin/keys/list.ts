import { Command, Flags } from '@oclif/core';
import { requireConfig } from '../../../config.js';

interface UserKeyRecord {
  id: string;
  email: string;
  keyPrefix: string;
  createdAt: string;
  revokedAt: string | null;
}

export default class AdminKeysList extends Command {
  static override description = 'List all user API keys';
  static override examples = ['$ falcon admin:keys:list'];

  static override flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { flags } = await this.parse(AdminKeysList);
    const config = await requireConfig();

    const url = `${config.serverUrl.replace(/\/$/, '')}/admin/keys`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });

    if (!res.ok) {
      const body = (await res.json()) as { error: { message: string } };
      this.error(body.error?.message ?? `HTTP ${res.status}`);
    }

    const body = (await res.json()) as { data: UserKeyRecord[] };
    const keys = body.data;

    if (flags.json) {
      this.log(JSON.stringify(keys));
      return;
    }

    if (keys.length === 0) {
      this.log('No user keys found.');
      return;
    }

    for (const k of keys) {
      const status = k.revokedAt ? '✗ revoked' : '✓ active';
      this.log(`${status}  ${k.email}  (${k.keyPrefix}…)  created: ${k.createdAt}`);
    }
  }
}
