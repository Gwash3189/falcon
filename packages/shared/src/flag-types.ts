export const FLAG_TYPES = {
  boolean: 'boolean',
  percentage: 'percentage',
  identifier: 'identifier',
} as const;

export type FlagType = (typeof FLAG_TYPES)[keyof typeof FLAG_TYPES];
