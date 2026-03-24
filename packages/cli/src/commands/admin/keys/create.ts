import { Args, Command, Flags } from '@oclif/core';
import { requireConfig } from '../../../config.js';

interface CreatedKey {
  id: string;
  email: string;
  keyPrefix: string;
  rawKey: string;
  createdAt: string;
}

export default class AdminKeysCreate extends Command {
  static override description = 'Create a user API key for an email address';
  static override examples = ['$ falcon admin:keys:create user@example.com'];

  static override args = {
    email: Args.string({ description: 'Email address for the new key', required: true }),
  };

  static override flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
  };

  override async run() {
    const { args, flags } = await this.parse(AdminKeysCreate);
    const config = await requireConfig();

    const url = `${config.serverUrl.replace(/\/$/, '')}/admin/keys`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
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
