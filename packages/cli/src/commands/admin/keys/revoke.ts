import { Args, Command, Flags } from '@oclif/core';
import { resolveAdminConfig } from '../../../admin-config.js';

export default class AdminKeysRevoke extends Command {
  static override description = 'Revoke all user API keys for an email address';
  static override examples = [
    '$ falcon admin:keys:revoke user@example.com --admin-key <BOOTSTRAP_ADMIN_KEY>',
  ];

  static override args = {
    email: Args.string({ description: 'Email address to revoke all keys for', required: true }),
  };

  static override flags = {
    'admin-key': Flags.string({
      description: 'Bootstrap admin key (or set FALCON_ADMIN_KEY env var)',
      env: 'FALCON_ADMIN_KEY',
    }),
    'server-url': Flags.string({
      description: 'Server URL (or set FALCON_SERVER_URL env var)',
      env: 'FALCON_SERVER_URL',
      default: 'http://localhost:3000',
    }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { args, flags } = await this.parse(AdminKeysRevoke);
    const { serverUrl, adminKey } = resolveAdminConfig(flags);

    const url = `${serverUrl}/admin/keys/${encodeURIComponent(args.email)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminKey}` },
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
