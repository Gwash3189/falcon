import { createHash } from 'node:crypto';
import { command, FLAG_TYPES } from '@falcon/shared';
import type { Flag } from '../../db/schema/index.js';

export type Dependencies = Record<string, never>;
export type Params = { flag: Flag; identifier?: string };

export const evaluateFlagCommand = command<Dependencies, Params, boolean>(({ params }) => {
  const { flag, identifier } = params;

  if (flag.type === FLAG_TYPES.boolean) {
    return flag.enabled;
  }

  if (flag.type === FLAG_TYPES.percentage) {
    if (!flag.enabled) return false;
    if (flag.percentage === null || flag.percentage === undefined) return false;
    const id = identifier ?? '';
    const hash = createHash('sha256').update(`${flag.key}:${id}`).digest('hex');
    const bucket = parseInt(hash.slice(0, 8), 16) % 100;
    return bucket < flag.percentage;
  }

  if (flag.type === FLAG_TYPES.identifier) {
    if (!flag.enabled) return false;
    if (!identifier || !flag.identifiers) return false;
    return flag.identifiers.includes(identifier);
  }

  return false;
});
