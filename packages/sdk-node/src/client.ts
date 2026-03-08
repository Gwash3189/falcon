import { TtlCache } from './cache.js';

export interface FalconClientOptions {
  /** Base URL of your Falcon server, e.g. http://localhost:3000 */
  baseUrl: string;
  /** API key scoped to a specific environment */
  apiKey: string;
  /** How long (in ms) to cache evaluation results locally. Default: 30_000 (30s) */
  cacheTtlMs?: number;
}

export interface EvaluateOptions {
  /** Identifier for percentage rollout and identifier targeting (e.g. user ID) */
  identifier?: string;
}

interface EvaluateResponse {
  data: {
    flag_key: string;
    enabled: boolean;
  };
}

export interface FalconClient {
  /**
   * Evaluate a feature flag.
   * @returns true if the flag is enabled for the given identifier, false otherwise.
   */
  evaluate(flagKey: string, options?: EvaluateOptions): Promise<boolean>;

  /** Clear the local evaluation cache. */
  clearCache(): void;
}

export function createFalconClient(options: FalconClientOptions): FalconClient {
  const { baseUrl, apiKey, cacheTtlMs = 30_000 } = options;
  const cache = new TtlCache<boolean>(cacheTtlMs);
  const base = baseUrl.replace(/\/$/, '');

  async function evaluate(flagKey: string, opts: EvaluateOptions = {}): Promise<boolean> {
    const identifier = opts.identifier ?? '';
    const cacheKey = `${flagKey}:${identifier}`;

    const cached = cache.get(cacheKey);
    if (cached !== undefined) return cached;

    const res = await fetch(`${base}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ flag_key: flagKey, identifier: identifier || undefined }),
    });

    if (!res.ok) {
      // On error, default to false (safe default — feature off)
      return false;
    }

    const body = (await res.json()) as EvaluateResponse;
    const enabled = body.data.enabled;
    cache.set(cacheKey, enabled);
    return enabled;
  }

  function clearCache() {
    cache.clear();
  }

  return { evaluate, clearCache };
}
