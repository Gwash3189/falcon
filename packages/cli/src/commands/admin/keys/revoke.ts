import { Args, Command, Flags } from '@oclif/core';
import { requireConfig } from '../../../config.js';

export default class AdminKeysRevoke extends Command {
  static override description = 'Revoke all user API keys for an email address';
  static override examples = ['$ falcon admin:keys:revoke user@example.com'];

  static override args = {
    email: Args.string({ description: 'Email address to revoke all keys for', required: true }),
  };

  static override flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { args, flags } = await this.parse(AdminKeysRevoke);
    const config = await requireConfig();

    const url = `${config.serverUrl.replace(/\/$/, '')}/admin/keys/${encodeURIComponent(args.email)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });

    if (!res.ok && res.status !== 204) {
      const body = (await res.json()) as { error: { message: string } };
      this.error(body.error?.message ?? `HTTP ${res.status}`);
    }

    if (flags.json) {
      this.log(JSON.stringify({ revoked: true, email: args.email }));
      return;
    }

    this.log(`✓ All keys revoked for ${args.email}`);
  }
}
