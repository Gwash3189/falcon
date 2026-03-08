import { Command, Flags } from '@oclif/core';
import { readConfig, writeConfig } from '../config.js';

/**
 * falcon init
 *
 * Connect the CLI to a running Falcon server. Stores server URL and API key
 * in ~/.config/falcon/config.json. Run this once and you're ready to go.
 */
export default class Init extends Command {
  static override description = 'Connect falcon CLI to a running server';

  static override examples = [
    '$ falcon init',
    '$ falcon init --url http://localhost:3000 --key flk_abc123',
  ];

  static override flags = {
    url: Flags.string({
      description: 'Falcon server URL',
      default: 'http://localhost:3000',
    }),
    key: Flags.string({
      description: 'API key (from `falcon api-keys:create`)',
    }),
  };

  override async run() {
    const { flags } = await this.parse(Init);

    const { url, key } = flags;

    if (!key) {
      // If no key provided, check if we're bootstrapping a fresh server
      this.log('');
      this.log('Welcome to Falcon! 🦅');
      this.log('');
      this.log('To get started, you need an API key from a Falcon server.');
      this.log('');
      this.log('Quick start:');
      this.log('  1. Start the server: pnpm dev (or npx @falcon/server)');
      this.log('  2. Create a project: POST http://localhost:3000/api/projects');
      this.log('  3. Create an API key and run: falcon init --key <your-key>');
      this.log('');
      this.log('Or use the server URL and an existing key:');
      this.log('  falcon init --url http://my-server.com --key flk_abc123');
      this.log('');
      this.error('--key is required. See instructions above.');
    }

    const existing = await readConfig();
    if (existing) {
      this.log(`Reconfiguring (was: ${existing.serverUrl})`);
    }

    await writeConfig({ serverUrl: url, apiKey: key });

    this.log('');
    this.log(`✓ Connected to ${url}`);
    this.log('Config saved to ~/.config/falcon/config.json');
    this.log('');
    this.log('Next steps:');
    this.log('  falcon projects:list         — see your projects');
    this.log('  falcon projects:create       — create a project');
    this.log('  falcon flags:list --env <id> — list flags in an environment');
  }
}
