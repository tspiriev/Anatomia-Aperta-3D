import type { NervousGroup } from './nervousTaxonomy';

/** Infer only an explicitly named parent nerve, never from source folder or a muscle name. */
export function explicitlyNamedBranchParent(key: string): string | null {
  return /(?:branch(?:es)?|ramus|rami|division)\s+(?:of|from)\s+(.+ nerve)$/.exec(key)?.[1] ?? null;
}

/** Add live-only branch leaves only where a real scene node requires them. */
export function withNamedModelBranchGroups(
  groups: readonly NervousGroup[], paths: readonly (readonly string[])[],
): readonly NervousGroup[] {
  if (!paths.length) return groups;
  const parents = new Set(paths.map(path => path.slice(0, -2).join('/')));
  const visit = (group: NervousGroup): NervousGroup => {
    const children = group.children?.map(visit) ?? [];
    if (parents.has(group.id)) {
      const branchId = `${group.id}/branches`;
      const leaf = { id: `${branchId}/other-model-branches`, label: 'Other named branches in model' };
      const existing = children.findIndex(child => child.id === branchId);
      if (existing >= 0) {
        const branch = children[existing];
        children[existing] = { ...branch, children: [...branch.children ?? [], leaf] };
      } else {
        children.push({ id: branchId, label: 'Distal branches', children: [leaf] });
      }
    }
    return children.length ? { ...group, children } : group;
  };
  return groups.map(visit);
}
