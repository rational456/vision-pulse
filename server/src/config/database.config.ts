import { fileURLToPath } from 'node:url';

export function getDatabasePath(): string {
  return process.env.DATABASE_PATH?.trim() || fileURLToPath(
    new URL('../../data/hotwords.sqlite', import.meta.url),
  );
}
