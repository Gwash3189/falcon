export interface AdminConfig {
  serverUrl: string;
  adminKey: string;
}

export function resolveAdminConfig(flags: {
  'admin-key'?: string | undefined;
  'server-url'?: string | undefined;
}): AdminConfig {
  const adminKey = flags['admin-key'];
  if (!adminKey) {
    throw new Error(
      'Missing admin key. Provide --admin-key <key> or set the FALCON_ADMIN_KEY environment variable.',
    );
  }

  const serverUrl = (flags['server-url'] ?? 'http://localhost:3000').replace(/\/$/, '');

  return { serverUrl, adminKey };
}
