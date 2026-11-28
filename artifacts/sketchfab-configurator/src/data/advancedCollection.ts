import type { NervousGroup } from './nervousTaxonomy';

export type AdvancedCollection = {
  id: string;
  label: string;
  objects?: readonly string[];
  children?: readonly AdvancedCollection[];
};

export const structures = (id: string, label: string, ...objects: string[]): AdvancedCollection => ({ id, label, objects });
export const collection = (id: string, label: string, ...children: AdvancedCollection[]): AdvancedCollection => ({ id, label, children });

export function normalizeAdvancedObjectName(rawName: string): string {
  return rawName.trim().toLowerCase()
    // Preserve numbered nucleus prefixes; handle ".l.", "..l", duplicates,
    // and terminal Sketchfab IDs without merging distinct named nuclei.
    .replace(/(?:\.+(?:l|r|\d+)\.*|_\d+)+$/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

export function buildAdvancedCollection(definition: AdvancedCollection) {
  const paths = new Map<string, readonly string[]>();
  function build(group: AdvancedCollection, parentPath: readonly string[]): NervousGroup {
    const path = [...parentPath, group.id];
    for (const object of group.objects ?? []) {
      const key = normalizeAdvancedObjectName(object);
      if (paths.has(key)) throw new Error(`Duplicate advanced collection assignment: ${object}`);
      paths.set(key, path);
    }
    return {
      id: path.join('/'),
      label: group.label,
      ...(group.children ? { children: group.children.map((child) => build(child, path)) } : {}),
    };
  }
  const group = build(definition, ['advanced-neuroanatomy']);
  return {
    group,
    classify: (rawName: string): readonly string[] | null => paths.get(normalizeAdvancedObjectName(rawName)) ?? null,
  };
}
