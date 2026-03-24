import { Args, Command, Flags } from '@oclif/core';
import { resolveAdminConfig } from '../../../admin-config.js';

interface CreatedKey {
  id: string;
  email: string;
  keyPrefix: string;
  rawKey: string;
  createdAt: string;
}

export default class AdminKeysCreate extends Command {
  static override description = 'Create a user API key for an email address';
  static override examples = [
    '$ falcon admin:keys:create user@example.com --admin-key <BOOTSTRAP_ADMIN_KEY>',
  ];

  static override args = {
    email: Args.string({ description: 'Email address for the new key', required: true }),
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
    const { args, flags } = await this.parse(AdminKeysCreate);
    const { serverUrl, adminKey } = resolveAdminConfig(flags);

    const url = `${serverUrl}/admin/keys`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminKey}`,
      },
      body: JSON.stringify({ email: args.email }),
    });

    if (!res.ok) {
      const body = (await res.json()) as { error: { message: string } };
      this.error(body.error?.message ?? `HTTP ${res.status}`);
    }

    const body = (await res.json()) as { data: CreatedKey };
    const key = body.data;

    if (flags.json) {
      this.log(JSON.stringify(key));
      return;
    }

    this.log('');
    this.log(`✓ User key created for ${key.email}`);
    this.log(`  Key (shown once): ${key.rawKey}`);
    this.log(`  Prefix: ${key.keyPrefix}`);
    this.log('');
    this.log('Share the key with the user. They run:');
    this.log(`  falcon init --key ${key.rawKey} --email ${key.email}`);
  }
}
