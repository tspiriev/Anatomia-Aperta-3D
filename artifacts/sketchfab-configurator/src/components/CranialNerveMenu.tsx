import { useMemo, useState } from 'react';
import { Blend, Eye, EyeOff, Focus, Search, X } from 'lucide-react';
import type { SceneNode } from '../types/sketchfab';
import { ANATOMICAL_SYSTEMS } from '../data/anatomicalSystems';
import { CRANIAL_NERVE_GROUPS, cranialNervePathForGroup } from '../data/cranialNerveTaxonomy';
import { NervousSystemMenu, type CollectionBrowseState } from './NervousSystemMenu';
import { isAlwaysOpaqueStructure } from '../lib/materialTransparency';

type Variant = 'strip' | 'sidebar' | 'fullscreen';

interface Props {
  variant: Variant;
  nodes: SceneNode[];
  activeNerveId: string | null;
  onActivateNerve: (path: readonly string[]) => void;
  mixCategories?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  isolatedRegionPath: readonly string[] | null;
  onIsolateRegion: (path: readonly string[]) => void;
  onRestoreRegion: () => void;
  onSetRegionVisibility: (ids: number[], visible: boolean) => void;
  selectedNodeId: number | null;
  fadedNodeIds?: Set<number>;
  onSelect?: (id: number) => void;
  onClearSelection?: () => void;
  toggleVisibility?: (id: number, visible: boolean) => void;
  onToggleFade?: (id: number) => void;
  isIsolated?: boolean;
  isFocusing?: boolean;
  focusError?: string | null;
  onIsolateSelected?: () => void;
  onRestoreSelected?: () => void;
  onIsolateSelectedWithContext?: () => void;
}

const noop = () => {};
const noFaded = new Set<number>();
const pathFor = (node: SceneNode) => cranialNervePathForGroup(node, ['advanced-neuroanatomy', 'cranial-nerves']);
const rootPath = (id: string) => id.split('/');
const menuGroups = [
  ...CRANIAL_NERVE_GROUPS.filter(group => group.id.endsWith('/overview')),
  ...CRANIAL_NERVE_GROUPS.filter(group => !group.id.endsWith('/overview')),
];

/** Primary I-XII categories with role subgroups; reuses the shared collection tree. */
export function CranialNerveMenu(props: Props) {
  const {
    variant, nodes, activeNerveId, onActivateNerve, mixCategories = false, disabled, isLoading,
    isolatedRegionPath, onIsolateRegion, onRestoreRegion, onSetRegionVisibility, selectedNodeId,
    fadedNodeIds = noFaded, onSelect = noop, onClearSelection = noop, toggleVisibility = noop, onToggleFade = noop,
    isIsolated, isFocusing, focusError, onIsolateSelected = noop, onRestoreSelected = noop,
    onIsolateSelectedWithContext = noop,
  } = props;
  const [search, setSearch] = useState('');
  const [browse, setBrowse] = useState<CollectionBrowseState>({ expanded: new Set(), showUnassigned: false });
  const selected = nodes.find((node) => node.instanceID === selectedNodeId);
  const selectedSystem = ANATOMICAL_SYSTEMS.find((s) => s.id === (selected?.systemId ?? 'nervous'));
  const counts = useMemo(() => {
    const map = new Map<string, { total: number; visible: number; ids: number[] }>();
    for (const group of CRANIAL_NERVE_GROUPS) {
      const path = rootPath(group.id);
      const members = nodes.filter((node) => {
        const p = cranialNervePathForGroup(node, path);
        return p !== null && path.every((part, i) => p[i] === part);
      });
      map.set(group.id, { total: members.length, visible: members.filter((n) => n.visible).length, ids: members.map((n) => n.instanceID) });
    }
    return map;
  }, [nodes]);
  const query = search.trim().toLowerCase();
  const activePath = activeNerveId ? rootPath(activeNerveId) : ['advanced-neuroanatomy', 'cranial-nerves'];
  const matches = useMemo(() => query ? nodes.filter((node) => {
    const p = cranialNervePathForGroup(node, activePath);
    return p !== null && activePath.every((part, i) => p[i] === part)
      && (node.name.toLowerCase().includes(query) || node.rawName.toLowerCase().includes(query));
  }) : [], [nodes, query, activeNerveId]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeGroups = variant === 'sidebar' && activeNerveId
    ? menuGroups.filter((g) => g.id === activeNerveId)
    : menuGroups;

  if (variant === 'strip') {
    return (
      <nav aria-label="Cranial nerves" className="flex-shrink-0 border-b border-border bg-card/95 px-3 py-2 sm:px-4 z-10">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {menuGroups.map((group) => {
            const c = counts.get(group.id);
            const active = group.id === activeNerveId;
            const [roman, ...rest] = group.label === 'Overview'
              ? ['Overview', 'Cranial pathways'] : group.label.split(' ');
            return (
              <button key={group.id} type="button" disabled={disabled || !c?.total}
                aria-pressed={active}
                data-testid={`button-cranial-nerve-${group.id.split('/').at(-1)}`}
                onClick={() => onActivateNerve(rootPath(group.id))}
                className={`shrink-0 min-h-11 min-w-[5.5rem] rounded-md border px-2.5 py-1.5 text-left transition-colors disabled:opacity-40 focus-visible:outline focus-visible:outline-primary ${active ? 'border-primary/60 bg-primary/15 text-foreground' : 'border-border bg-background text-muted-foreground hover:text-foreground'}`}>
                <span className="block font-mono text-[11px] tracking-widest">{roman}</span>
                <span className="block text-[11px] leading-tight whitespace-nowrap">{rest.join(' ')}</span>
                <span className="block text-[10px] text-muted-foreground">{c?.visible ?? 0}/{c?.total ?? 0}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  const fullscreen = variant === 'fullscreen';
  const selectedCard = (
    <div className={fullscreen ? 'shrink-0 border-b border-white/10 p-3' : 'rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3'}
      role="status" aria-live="polite" aria-atomic="true">
      <p className={`text-[10px] uppercase tracking-widest ${fullscreen ? 'text-white/50' : 'text-primary/75'}`}>Selected structure</p>
      <p data-testid={fullscreen ? 'fullscreen-selected-system' : undefined} className="mt-1 text-xs text-primary">{selected ? selectedSystem?.label : 'Cranial nerves'}</p>
      <p data-testid={fullscreen ? 'fullscreen-selected-name' : undefined} className="mt-1 text-sm font-medium leading-snug break-words">
        {selected?.name ?? 'Click a structure in the model to see its name.'}
      </p>
      {selected && !fullscreen && (
        <div className="space-y-2 pt-1">
          <button type="button" disabled={isFocusing} onClick={!mixCategories && isIsolated ? onRestoreSelected : onIsolateSelected}
            className="w-full min-h-10 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold px-3 py-2 disabled:opacity-50">
            <Focus className="w-3.5 h-3.5" />
            {mixCategories ? 'Add to mixed view' : isIsolated ? 'Restore previous view' : 'Show only selected'}
          </button>
          {!mixCategories && <button type="button" disabled={isFocusing} onClick={onIsolateSelectedWithContext}
            data-testid="button-cranial-isolate-with-context"
            className="w-full min-h-10 flex items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium px-3 py-2 disabled:opacity-50">
            <Focus className="w-3.5 h-3.5" /> Isolate with context
          </button>}
          <div className="flex gap-2">
            {!isAlwaysOpaqueStructure(selected) && <button type="button" onClick={() => onToggleFade(selected.instanceID)} className="flex-1 min-h-10 flex items-center justify-center gap-1.5 rounded border border-border text-muted-foreground hover:text-foreground text-xs py-1.5">
              <Blend className="w-3 h-3" /> {fadedNodeIds.has(selected.instanceID) ? 'Unfade' : 'Fade'}
            </button>}
            <button type="button" onClick={() => toggleVisibility(selected.instanceID, !selected.visible)} className="flex-1 min-h-10 flex items-center justify-center gap-1.5 rounded border border-border text-muted-foreground hover:text-foreground text-xs py-1.5">
              {selected.visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {selected.visible ? 'Hide' : 'Show'}
            </button>
          </div>
          <button type="button" onClick={onClearSelection} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">Back to structures</button>
        </div>
      )}
      {focusError && <p role="alert" className="text-xs text-destructive">{focusError}</p>}
    </div>
  );

  const tree = (
    <NervousSystemMenu
      key={`${variant}-${activeNerveId ?? 'all'}`}
      mixCategories={mixCategories}
      browseState={fullscreen ? undefined : browse}
      onBrowseStateChange={fullscreen ? undefined : setBrowse}
      groups={activeGroups}
      layout="stacked"
      heading="CRANIAL NERVES"
      description=""
      namespace={fullscreen ? 'fullscreen-cranial-nerves' : 'cranial-nerves'}
      collectionsOnly={fullscreen}
      disabled={disabled}
      showUnassigned={false}
      nodes={nodes}
      pathForNode={pathFor}
      pathForGroup={cranialNervePathForGroup}
      onSetVisibility={onSetRegionVisibility}
      onIsolate={(path) => path[1] === 'cranial-nerves' ? onActivateNerve(path) : onIsolateRegion(path)}
      isolatedPath={isolatedRegionPath}
      onRestore={onRestoreRegion}
      onSelect={fullscreen ? noop : onSelect}
      toggleVisibility={fullscreen ? noop : toggleVisibility}
      onToggleFade={fullscreen ? noop : onToggleFade}
      fadedNodeIds={fullscreen ? noFaded : fadedNodeIds}
    />
  );

  if (fullscreen) {
    return (
      <aside aria-label="Fullscreen anatomy names" data-testid="fullscreen-anatomy-menu"
        className="absolute right-3 top-16 z-20 w-64 sm:w-72 max-w-[calc(100%_-_1.5rem)] max-h-[calc(100%_-_5rem)] flex flex-col rounded-xl border border-white/15 bg-black/80 text-white shadow-xl backdrop-blur-md">
        {selectedCard}
        <div className="shrink-0 px-3 py-2">
          <button type="button" disabled={!selected || disabled || isFocusing}
            onClick={!mixCategories && isIsolated ? onRestoreSelected : onIsolateSelected}
            data-testid="fullscreen-isolate-selected"
            className="w-full min-h-10 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-40">
            {isFocusing ? 'Preparing selected structure…' : mixCategories ? 'Add selected to mixed view (I)' : isIsolated ? 'Restore previous view (R)' : 'Show only selected (I)'}
          </button>
          {!mixCategories && <button type="button" disabled={!selected || disabled || isFocusing} onClick={onIsolateSelectedWithContext}
            data-testid="fullscreen-isolate-with-context"
            className="mt-2 w-full min-h-10 rounded-md border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40">
            Isolate with context
          </button>}
        </div>
        <details open className="min-h-0 overflow-auto" data-testid="fullscreen-collections">
          <summary className="cursor-pointer px-3 py-2 text-xs text-white/70">Browse cranial nerves I-XII and Overview</summary>
          <div className="border-t border-white/10 p-2">{tree}</div>
        </details>
      </aside>
    );
  }

  return (
    <div className="flex flex-col h-full bg-sidebar w-full overflow-auto">
      <div className="p-3 border-b border-sidebar-border space-y-1">
        <h2 className="text-xs font-semibold tracking-wide text-sidebar-foreground">
          {CRANIAL_NERVE_GROUPS.find((g) => g.id === activeNerveId)?.label ?? 'Cranial nerves'}
        </h2>
        <p className="text-[11px] text-muted-foreground">{activePath[2] === 'overview'
          ? 'Shared cranial pathways with semitransparent brainstem and skull landmarks.'
          : activeNerveId
          ? 'Structures of the selected nerve. Choose another nerve above.'
          : 'The whole model is shown. Choose a nerve above to open its custom view.'}</p>
      </div>
      <div className="p-3 flex flex-col gap-3">
        {selected && selectedCard}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={activePath[2] === 'overview' ? 'Search overview…' : 'Search this nerve…'}
            aria-label={activePath[2] === 'overview' ? 'Search cranial overview structures' : 'Search structures in the active cranial nerve'} data-testid="input-cranial-search"
            className="w-full h-10 lg:h-8 rounded-md border border-sidebar-border bg-background/40 pl-8 pr-8 text-xs focus:border-primary outline-none" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
        </div>
        {isLoading ? <p className="text-xs text-muted-foreground text-center py-10 animate-pulse">Loading structures…</p>
          : query ? (
            <div className="flex flex-col gap-1" data-testid="cranial-search-results">
              <p className="text-[11px] text-muted-foreground px-1">{matches.length} result{matches.length === 1 ? '' : 's'} in {activePath[2] === 'overview' ? 'Overview' : 'this nerve'}</p>
              {matches.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No structures match your search.</p>}
              {matches.slice(0, 80).map((node) => (
                <div key={node.instanceID} className={`flex items-center gap-1 rounded px-2 py-1.5 text-xs ${node.instanceID === selectedNodeId ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-background/60'}`}>
                  <button type="button" onClick={() => onSelect(node.instanceID)} className={`flex-1 min-w-0 text-left truncate ${node.visible ? '' : 'opacity-50'}`} title={node.rawName}>{node.name}</button>
                  <button type="button" onClick={() => toggleVisibility(node.instanceID, !node.visible)} aria-label={node.visible ? `Hide ${node.name}` : `Show ${node.name}`} className="h-7 w-7 flex items-center justify-center hover:text-foreground">
                    {node.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </div>
          ) : tree}
      </div>
    </div>
  );
}
