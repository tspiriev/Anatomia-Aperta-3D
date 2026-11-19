import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff, Focus, RotateCcw } from 'lucide-react';
import type { SceneNode } from '../types/sketchfab';
import { NERVOUS_GROUPS, type NervousGroup } from '../data/nervousTaxonomy';
import { MeshRow } from './MeshRow';

export interface CollectionBrowseState {
  expanded: ReadonlySet<string>;
  showUnassigned: boolean;
}

interface NervousSystemMenuProps {
  mixCategories?: boolean;
  initialExpanded?: ReadonlySet<string>;
  groups?: readonly NervousGroup[];
  heading?: string;
  description?: string;
  namespace?: string;
  preserveUnassigned?: boolean;
  collectionsOnly?: boolean;
  layout?: 'stacked' | 'columns';
  disabled?: boolean;
  showUnassigned?: boolean;
  nodes: SceneNode[];
  pathForNode: (node: SceneNode) => readonly string[] | null;
  pathForGroup?: (node: SceneNode, groupPath: readonly string[]) => readonly string[] | null;
  onSetVisibility: (ids: number[], visible: boolean, path?: readonly string[]) => void;
  onIsolate: (path: readonly string[]) => void;
  isolatedPath: readonly string[] | null;
  onRestore: () => void;
  onSelect: (id: number) => void;
  toggleVisibility: (id: number, visible: boolean) => void;
  onToggleFade: (id: number) => void;
  /** Hide per-mesh fade controls (preserve original materials). */
  disableFade?: boolean;
  fadedNodeIds: Set<number>;
  browseState?: CollectionBrowseState;
  onBrowseStateChange?: (state: CollectionBrowseState) => void;
}

type GroupShape = {
  id: string;
  label: string;
  children?: readonly NervousGroup[];
  subgroups?: readonly NervousGroup[];
};

type ClassifiedNode = { node: SceneNode; path: readonly string[] | null };

// The taxonomy uses hierarchical IDs. Also accept a segment-only child ID so
// this menu remains compatible with taxonomies assembled from nested groups.
function pathOf(group: NervousGroup, parent: readonly string[]): string[] {
  const { id } = group as GroupShape;
  const parts = id.split('/').filter(Boolean);
  if (parts.length > 1) return parts;
  if (parent.length && parts[0] === parent[parent.length - 1]) return [...parent];
  return [...parent, ...parts];
}

function canonicalPath(path: readonly string[]): string[] {
  // Some callers represent the last level by its full hierarchical ID.
  const last = path[path.length - 1];
  return last?.includes('/') ? last.split('/').filter(Boolean) : [...path];
}

function isWithin(path: readonly string[] | null, groupPath: readonly string[]): boolean {
  if (!path) return false;
  const parts = canonicalPath(path);
  return groupPath.every((part, index) => parts[index] === part);
}

/** Restore visibility within the displayed categories, not the whole model.
 * Reuse each collection's scope rules, including laterality and opt-in layers. */
export function menuCollectionNodeIds(
  nodes: readonly SceneNode[], groups: readonly NervousGroup[],
  pathForNode: NervousSystemMenuProps['pathForNode'],
  pathForGroup?: NervousSystemMenuProps['pathForGroup'],
): number[] {
  const paths = groups.map(group => pathOf(group, []));
  return [...new Set(nodes.filter(node => {
    const fallback = pathForGroup ? null : pathForNode(node);
    return paths.some(path => isWithin(pathForGroup ? pathForGroup(node, path) : fallback, path));
  }).map(node => node.instanceID))];
}

function samePath(a: readonly string[] | null, b: readonly string[]): boolean {
  if (!a) return false;
  const parts = canonicalPath(a);
  return parts.length === b.length && b.every((part, index) => parts[index] === part);
}

function GroupRow({
  mixCategories = false,
  group,
  namespace,
  parentPath,
  depth,
  classified,
  pathForGroup,
  expanded,
  onToggle,
  onSetVisibility,
  onIsolate,
  isolatedPath,
  onRestore,
  onSelect,
  toggleVisibility,
  onToggleFade,
  disableFade = false,
  fadedNodeIds,
  collectionsOnly,
  compact,
  disabled,
}: {
  mixCategories?: boolean;
  group: NervousGroup;
  namespace: string;
  parentPath: readonly string[];
  depth: number;
  classified: ClassifiedNode[];
  pathForGroup?: NervousSystemMenuProps['pathForGroup'];
  expanded: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onSetVisibility: NervousSystemMenuProps['onSetVisibility'];
  onIsolate: NervousSystemMenuProps['onIsolate'];
  isolatedPath: NervousSystemMenuProps['isolatedPath'];
  onRestore: NervousSystemMenuProps['onRestore'];
  onSelect: NervousSystemMenuProps['onSelect'];
  toggleVisibility: NervousSystemMenuProps['toggleVisibility'];
  onToggleFade: NervousSystemMenuProps['onToggleFade'];
  disableFade?: boolean;
  fadedNodeIds: NervousSystemMenuProps['fadedNodeIds'];
  collectionsOnly: boolean;
  compact: boolean;
  disabled: boolean;
}) {
  const definition = group as GroupShape;
  const path = pathOf(group, parentPath);
  const key = path.join('/');
  const testId = key.replace(/[^a-z0-9-]/gi, '-');
  const children = definition.children ?? definition.subgroups ?? [];
  const canExpand = !collectionsOnly || children.length > 0;
  const scoped = pathForGroup
    ? classified.map(({ node }) => ({ node, path: pathForGroup(node, path) }))
    : classified;
  const members = scoped.filter(({ path: nodePath }) => isWithin(nodePath, path));
  const open = expanded.has(key);
  const active = !mixCategories && samePath(isolatedPath, path);
  const ids = members.map(({ node }) => node.instanceID);
  const directMembers = children.length ? members.filter(({ path: nodePath }) => samePath(nodePath, path)) : members;
  const brainstemGsa = key === 'advanced-neuroanatomy/brainstem-and-cerebellum/brainstem/nuclei/gsa';
  const actionSizing = compact
    ? 'flex-col min-h-10 lg:min-h-9 gap-0.5 px-0.5 py-1 text-[10px] lg:text-[9px]'
    : 'min-h-10 lg:min-h-0 gap-1 px-1 lg:px-1.5 lg:py-1 text-xs lg:text-[10px]';

  return (
    <div role={brainstemGsa ? 'group' : undefined} aria-label={brainstemGsa ? definition.label : undefined}
      data-collection-path={brainstemGsa ? key : undefined}
      className={brainstemGsa
        ? `min-w-0 rounded-lg border border-sidebar-border bg-sidebar-accent/20 mr-1 my-1 overflow-hidden ${compact ? 'ml-0.5' : 'ml-2 lg:ml-3'}`
        : depth === 0 ? 'min-w-0 rounded-lg border border-sidebar-border bg-background/25 overflow-hidden' : `min-w-0 border-l border-sidebar-border/70 ${compact ? 'ml-0.5' : 'ml-2 lg:ml-3'}`}>
      <div className={depth === 0 ? 'px-2.5 py-2 lg:px-3 lg:py-2.5' : compact ? 'px-1 py-1.5' : 'pl-2 pr-1 py-1.5 lg:pl-3 lg:pr-1.5 lg:py-2'}>
        <div className="flex items-center min-w-0 gap-1 lg:gap-2">
          <button
            type="button"
            disabled={!canExpand}
            aria-expanded={canExpand ? open : undefined}
            aria-controls={canExpand ? `${namespace}-children-${testId}` : undefined}
            aria-label={canExpand ? `${open ? 'Collapse' : 'Expand'} ${definition.label}` : definition.label}
            data-testid={`button-expand-${testId}`}
            onClick={() => onToggle(key)}
            className="group flex flex-1 min-w-0 min-h-10 lg:min-h-0 items-center gap-2 text-left rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            {canExpand && (open
              ? <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary/80" />
              : <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-sidebar-foreground" />)}
            <span className={`${depth === 0 ? 'text-[13px] lg:text-xs font-semibold' : 'text-xs lg:text-[11px] font-medium'} leading-snug text-sidebar-foreground group-hover:text-primary break-words ${compact ? '' : 'lg:truncate'}`}>
              {definition.label}
            </span>
          </button>
          {active && <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] lg:text-[9px] font-medium text-primary" data-testid={`status-isolated-${testId}`}>Isolated</span>}
        </div>
        <div className={`grid grid-cols-3 gap-1 mt-1 ${compact ? 'lg:mt-2' : `lg:flex lg:items-center ${depth === 0 ? 'lg:mt-2 lg:ml-5' : 'lg:mt-1.5 lg:ml-5'}`}`} role="group" aria-label={`${definition.label} visibility actions`}>
          <button
            type="button"
            disabled={disabled || !ids.length}
            aria-label={`Show ${definition.label}`}
            title={`Show ${definition.label}`}
            data-testid={`button-show-${testId}`}
            onClick={() => onSetVisibility(ids, true, path)}
            className={`inline-flex min-w-0 items-center justify-center rounded border border-sidebar-border/70 lg:border-transparent ${actionSizing} text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:opacity-35 disabled:cursor-not-allowed`}
          >
            <Eye aria-hidden="true" className="h-3.5 w-3.5 lg:h-3 lg:w-3 shrink-0" /> Show
          </button>
          <button
            type="button"
            disabled={disabled || !ids.length}
            aria-label={`Hide ${definition.label}`}
            title={`Hide ${definition.label}`}
            data-testid={`button-hide-${testId}`}
            onClick={() => onSetVisibility(ids, false, path)}
            className={`inline-flex min-w-0 items-center justify-center rounded border border-sidebar-border/70 lg:border-transparent ${actionSizing} text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:opacity-35 disabled:cursor-not-allowed`}
          >
            <EyeOff aria-hidden="true" className="h-3.5 w-3.5 lg:h-3 lg:w-3 shrink-0" /> Hide
          </button>
          {!compact && <span aria-hidden="true" className="hidden lg:block mx-0.5 h-3 w-px bg-sidebar-border" />}
          <button
            type="button"
            disabled={disabled || !ids.length}
            aria-label={mixCategories ? `Add ${definition.label} to mixed view` : active ? `Restore view from ${definition.label}` : `Isolate ${definition.label}`}
            title={mixCategories ? `Add ${definition.label} without hiding other models` : active ? 'Restore previous view' : `Isolate ${definition.label}`}
            aria-pressed={active}
            data-testid={`button-isolate-${testId}`}
            onClick={() => active ? onRestore() : onIsolate(path)}
            className={`inline-flex min-w-0 items-center justify-center rounded border border-primary/30 lg:border-transparent ${actionSizing} font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:opacity-35 disabled:cursor-not-allowed ${active ? 'bg-primary/15 text-primary hover:bg-primary/25' : 'text-primary hover:bg-primary/10'}`}
          >
            {active ? <RotateCcw aria-hidden="true" className="h-3.5 w-3.5 lg:h-3 lg:w-3 shrink-0" /> : <Focus aria-hidden="true" className="h-3.5 w-3.5 lg:h-3 lg:w-3 shrink-0" />}
            {mixCategories ? 'Add' : active ? 'Restore' : 'Isolate'}
          </button>
        </div>
      </div>
      {open && (
        <div id={`${namespace}-children-${testId}`} className={depth === 0 ? 'border-t border-sidebar-border/70 px-1.5 py-1.5' : 'pb-1'}>
          {children.map((child) => (
            <GroupRow
              mixCategories={mixCategories}
              key={(child as GroupShape).id}
              group={child}
              namespace={namespace}
              parentPath={path}
              depth={depth + 1}
              classified={classified}
              pathForGroup={pathForGroup}
              expanded={expanded}
              onToggle={onToggle}
              onSetVisibility={onSetVisibility}
              onIsolate={onIsolate}
              isolatedPath={isolatedPath}
              onRestore={onRestore}
              onSelect={onSelect}
              toggleVisibility={toggleVisibility}
              onToggleFade={onToggleFade}
              disableFade={disableFade}
              fadedNodeIds={fadedNodeIds}
              collectionsOnly={collectionsOnly}
              compact={compact}
              disabled={disabled}
            />
          ))}
          {!collectionsOnly && (directMembers.length > 0 ? (
            <div className="space-y-0.5 pl-2 pr-1">
              {directMembers.map(({ node }) => (
                <MeshRow
                  key={node.instanceID}
                  node={node}
                  isSelected={false}
                  isFaded={fadedNodeIds.has(node.instanceID)}
                  selectedRowRef={null}
                  onSelect={onSelect}
                  onToggleFade={onToggleFade}
                  disableFade={disableFade}
                  toggleVisibility={toggleVisibility}
                />
              ))}
            </div>
          ) : children.length === 0 ? (
            <p className="px-6 py-2 text-[11px] text-muted-foreground">No mapped structures in this region.</p>
          ) : null)}
        </div>
      )}
    </div>
  );
}

export function NervousSystemMenu({
  mixCategories = false,
  groups = NERVOUS_GROUPS,
  heading,
  description,
  namespace = 'nervous',
  preserveUnassigned = true,
  collectionsOnly = false,
  layout = 'stacked',
  disabled = false,
  showUnassigned: allowUnassigned = true,
  nodes,
  pathForNode,
  pathForGroup,
  onSetVisibility,
  onIsolate,
  isolatedPath,
  onRestore,
  onSelect,
  toggleVisibility,
  onToggleFade,
  disableFade = false,
  fadedNodeIds,
  browseState,
  onBrowseStateChange,
  initialExpanded,
}: NervousSystemMenuProps) {
  const [localBrowseState, setLocalBrowseState] = useState<CollectionBrowseState>(
    () => ({ expanded: initialExpanded ?? new Set(), showUnassigned: false }),
  );
  const { expanded, showUnassigned } = browseState ?? localBrowseState;
  const updateBrowseState = onBrowseStateChange ?? setLocalBrowseState;
  const classified = useMemo<ClassifiedNode[]>(() => nodes.map((node) => ({ node, path: pathForNode(node) })), [nodes, pathForNode]);
  const allCollectionIds = useMemo(() => menuCollectionNodeIds(nodes, groups, pathForNode, pathForGroup),
    [nodes, groups, pathForNode, pathForGroup]);
  const unassigned = classified.filter(({ path }) => path === null);

  function toggleGroup(key: string) {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    updateBrowseState({ expanded: next, showUnassigned });
  }

  return (
    <section aria-label={heading ? `${heading} regions` : 'Nervous system regions'} className="w-full text-sidebar-foreground">
      <header className="border-b border-sidebar-border px-1 pb-3">
        {heading && <h2 className="mb-1 text-xs font-semibold tracking-widest text-sidebar-foreground">{heading}</h2>}
        {description !== '' && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">{description ?? 'Choose a region to control the view. Expand for structures.'}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled || allCollectionIds.length === 0}
            onClick={() => onSetVisibility(allCollectionIds, true)}
            data-testid={`button-show-all-${namespace}-view`}
            title="Show all structures in the categories listed below. Other categories are unchanged."
            className="inline-flex min-h-10 lg:min-h-0 items-center gap-1.5 rounded border border-primary/30 bg-primary/10 px-3 lg:px-2 lg:py-1.5 text-xs lg:text-[11px] font-medium text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            <Eye aria-hidden="true" className="h-3 w-3" /> Show all
          </button>
        {isolatedPath && (
          <button
            type="button"
            disabled={disabled}
            onClick={onRestore}
            data-testid={`button-restore-${namespace}-view`}
            className="inline-flex min-h-10 lg:min-h-0 items-center gap-1.5 rounded border border-primary/30 bg-primary/10 px-3 lg:px-2 lg:py-1.5 text-xs lg:text-[11px] font-medium text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RotateCcw aria-hidden="true" className="h-3 w-3" /> Restore previous view
          </button>
        )}
        </div>
      </header>
      <div>
        <div className={layout === 'columns' ? 'grid grid-cols-1 sm:grid-cols-2 items-start gap-2 py-3' : 'space-y-1.5 py-3'}>
          {groups.map((group) => (
            <GroupRow
              mixCategories={mixCategories}
              key={(group as GroupShape).id}
              group={group}
              namespace={namespace}
              parentPath={[]}
              depth={0}
              classified={classified}
              pathForGroup={pathForGroup}
              expanded={expanded}
              onToggle={toggleGroup}
              onSetVisibility={onSetVisibility}
              onIsolate={onIsolate}
              isolatedPath={isolatedPath}
              onRestore={onRestore}
              onSelect={onSelect}
              toggleVisibility={toggleVisibility}
              onToggleFade={onToggleFade}
              disableFade={disableFade}
              fadedNodeIds={fadedNodeIds}
              collectionsOnly={collectionsOnly}
              compact={layout === 'columns'}
              disabled={disabled}
            />
          ))}
          {allowUnassigned && !collectionsOnly && unassigned.length > 0 && (
            <div className="border-t border-sidebar-border pt-3 mt-4">
              <button
                type="button"
                aria-expanded={showUnassigned}
                aria-controls={`${namespace}-unassigned-structures`}
                data-testid="button-expand-unassigned-structures"
                onClick={() => updateBrowseState({ expanded, showUnassigned: !showUnassigned })}
                className="flex w-full min-h-10 lg:min-h-0 items-center gap-2 rounded px-2 lg:px-1.5 lg:py-1.5 text-left text-xs lg:text-[11px] text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
              >
                {showUnassigned ? <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" /> : <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />}
                <span>Unassigned structures</span>
                <span className="ml-auto tabular-nums">{unassigned.length}</span>
              </button>
              {showUnassigned && (
                <div id={`${namespace}-unassigned-structures`} className="pt-1">
                  <p className="px-2 pb-2 text-[10px] leading-relaxed text-muted-foreground">
                    {preserveUnassigned
                      ? 'These structures remain unchanged when a region is isolated.'
                      : 'These structures have no confirmed region and are hidden during region isolation. Restore returns their previous visibility.'}
                  </p>
                  {unassigned.map(({ node }) => (
                    <MeshRow
                      key={node.instanceID}
                      node={node}
                      isSelected={false}
                      isFaded={fadedNodeIds.has(node.instanceID)}
                      selectedRowRef={null}
                      onSelect={onSelect}
                      onToggleFade={onToggleFade}
                      disableFade={disableFade}
                      toggleVisibility={toggleVisibility}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}