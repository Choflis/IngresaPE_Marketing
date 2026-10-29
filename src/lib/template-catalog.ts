import type { Template } from './types';

// Old test runs and imports may have created identical rows. Group their cards,
// preserving every stored template/version and any jobs that reference them.
export function catalogTemplates(templates: Template[], preferredVersionId?: number) {
  const groups = new Map<string, Template>();
  for (const t of templates) {
    const key = JSON.stringify([
      t.name,
      t.description,
      t.kind,
      t.composition,
      t.accent.trim().toLowerCase(),
      t.duration_seconds,
    ]);
    if (!groups.has(key) || t.version_id === preferredVersionId) groups.set(key, t);
  }
  return [...groups.values()];
}
