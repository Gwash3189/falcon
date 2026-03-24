import { Command, Flags } from '@oclif/core';
import { readConfig, writeConfig } from '../config.js';

/**
 * falcon init
 *
 * Connect the CLI to a running Falcon server. Stores server URL, API key, and
 * email in ~/.config/falcon/config.json. Run this once and you're ready to go.
 */
export default class Init extends Command {
  static override description = 'Connect falcon CLI to a running server';

  static override examples = [
    '$ falcon init',
    '$ falcon init --url http://localhost:3000 --key flk_abc123 --email me@example.com',
  ];

  static override flags = {
    url: Flags.string({
      description: 'Falcon server URL',
      default: 'http://localhost:3000',
    }),
    key: Flags.string({
      description: 'User API key (from `falcon admin:keys:create`)',
    }),
    email: Flags.string({
      description: 'Your email address (must match the key)',
    }),
  };

  override async run() {
    const { flags } = await this.parse(Init);

    const { url, key, email } = flags;

    if (!key || !email) {
      this.log('');
      this.log('Welcome to Falcon! 🦅');
      this.log('');
      this.log('To get started, you need a user API key from a Falcon admin.');
      this.log('');
      this.log('Quick start:');
      this.log('  1. Start the server: npx @flagline/server (or pnpm dev)');
      this.log('  2. Create your first user key:');
      this.log('     falcon admin:keys:create admin@example.com --admin-key <BOOTSTRAP_ADMIN_KEY>');
      this.log('  3. Run: falcon init --key <your-key> --email <your-email>');
      this.log('');
      this.log('Or use explicit flags:');
      this.log('  falcon init --url http://my-server.com --key flk_abc123 --email me@example.com');
      this.log('');
      this.error('--key and --email are required. See instructions above.');
    }

    const existing = await readConfig();
    if (existing) {
      this.log(`Reconfiguring (was: ${existing.serverUrl})`);
    }

    await writeConfig({ serverUrl: url, apiKey: key, email });

    this.log('');
    this.log(`✓ Connected to ${url}`);
    this.log(`✓ Authenticated as ${email}`);
    this.log('Config saved to ~/.config/falcon/config.json');
    this.log('');
    this.log('Next steps:');
    this.log('  falcon projects:list         — see your projects');
    this.log('  falcon projects:create       — create a project');
    this.log('  falcon flags:list --env <id> — list flags in an environment');
  }
}
