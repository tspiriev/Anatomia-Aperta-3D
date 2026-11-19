type RawNode = { instanceID: number; children?: unknown[] };

const childId = (child: unknown): number | null => {
  const value = typeof child === 'object' && child !== null
    ? (child as { instanceID?: unknown }).instanceID : child;
  return (typeof value === 'number' || typeof value === 'string') && Number.isFinite(Number(value))
    ? Number(value) : null;
};

/**
 * A panel's visible flag is not proof that Sketchfab is drawing its geometry.
 * Explicitly enable the requested transforms, their non-selectable descendants,
 * and their ancestor chain. Never enable an independently selectable sibling or
 * child that the collection excluded.
 */
export function collectionVisibilityCommands(
  ids: readonly number[],
  rawNodes: Readonly<Record<string, RawNode>>,
  parents: ReadonlyMap<number, number>,
  selectableIds: ReadonlySet<number>,
): number[] {
  const requested = new Set(ids);
  const raw = new Map(Object.values(rawNodes).map(node => [node.instanceID, node]));
  const commands = new Set<number>();
  const visited = new Set<number>();
  function descend(id: number, embedded?: RawNode) {
    if (visited.has(id)) return;
    visited.add(id);
    commands.add(id);
    const node = raw.get(id) ?? embedded;
    for (const child of node?.children ?? []) {
      const next = childId(child);
      if (next === null || (selectableIds.has(next) && !requested.has(next))) continue;
      descend(next, typeof child === 'object' && child !== null ? child as RawNode : undefined);
    }
  }
  for (const id of ids) {
    const ancestry = new Set<number>();
    let parent = parents.get(id);
    while (parent !== undefined && !ancestry.has(parent)) {
      ancestry.add(parent);
      parent = parents.get(parent);
    }
    for (const ancestor of [...ancestry].reverse()) commands.add(ancestor);
    descend(id);
  }
  return [...commands];
}
