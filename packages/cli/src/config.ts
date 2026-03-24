import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = join(homedir(), '.config', 'falcon');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface CliConfig {
  serverUrl: string;
  apiKey: string;
  email: string;
}

export async function readConfig(): Promise<CliConfig | null> {
  try {
    const raw = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as CliConfig;
  } catch {
    return null;
  }
}

export async function writeConfig(config: CliConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export async function requireConfig(): Promise<CliConfig> {
  const config = await readConfig();
  if (!config) {
    throw new Error(
      'Not configured. Run: falcon init\n\nThis will connect falcon to your server and store credentials locally.',
    );
  }
  return config;
}
