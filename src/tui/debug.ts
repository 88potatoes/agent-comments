import { appendFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const LOG_FILE = process.env.AGENT_COMMENTS_DEBUG
  ? process.env.AGENT_COMMENTS_DEBUG === '1'
    ? resolve(process.cwd(), 'tmp/ac-debug.log')
    : process.env.AGENT_COMMENTS_DEBUG
  : null;

if (LOG_FILE) {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    writeFileSync(LOG_FILE, '');
  } catch (e) {
    process.stderr.write(`[debug] failed to init log file: ${e}\n`);
  }
}

export function debug(...args: unknown[]) {
  const line = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');

  if (LOG_FILE) {
    try {
      appendFileSync(LOG_FILE, line + '\n');
    } catch {
      // fall through to stderr
    }
  }
}
