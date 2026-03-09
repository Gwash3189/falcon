import type { Flag } from '../db/schema/index.js';
import { evaluateFlagCommand } from './commands/evaluate_flag.js';

export interface EvaluationResult {
  flagKey: string;
  enabled: boolean;
}

export function evaluateFlag(flag: Flag, identifier?: string): boolean {
  return evaluateFlagCommand({
    dependencies: {},
    params: identifier !== undefined ? { flag, identifier } : { flag },
  });
}
