import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getDbPath } from '../lib/db.ts';

export type TuiSettings = {
  showResolved: boolean;
};

const defaults: TuiSettings = {
  showResolved: true,
};

function settingsPath(): string {
  const dbDir = dirname(getDbPath());
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  return join(dbDir, 'settings.json');
}

export function loadSettings(): TuiSettings {
  try {
    const raw = readFileSync(settingsPath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<TuiSettings>;
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(settings: TuiSettings): void {
  try {
    writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
  } catch {
    // fail silently — settings are non-critical
  }
}