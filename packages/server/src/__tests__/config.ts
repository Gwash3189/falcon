/**
 * Test configuration loaded from repo root .env file.
 * Import DATABASE_URL, VALKEY_URL from this module in integration tests.
 * Do not access process.env directly in tests.
 */
import { config } from '../config.js';

export const { DATABASE_URL, VALKEY_URL } = config();
