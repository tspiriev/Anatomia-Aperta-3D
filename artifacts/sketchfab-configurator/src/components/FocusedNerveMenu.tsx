import { useMemo, useState, type ReactNode } from 'react';
import { Blend, Eye, EyeOff, Focus, Search, X } from 'lucide-react';
import type { SceneNode } from '../types/sketchfab';
import { ANATOMICAL_SYSTEMS } from '../data/anatomicalSystems';
import type { NervousGroup } from '../data/nervousTaxonomy';
import { NervousSystemMenu, type CollectionBrowseState } from './NervousSystemMenu';
import { isAlwaysOpaqueStructure } from '../lib/materialTransparency';

export type Variant = 'strip' | 'sidebar' | 'fullscreen';

export interface FocusedNerveMenuProps {
  /** Skull base only; other focused menus ignore these controls. */
  boneTransparency?: boolean;
  onBoneTransparencyChange?: (enabled: boolean) => void;
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
  onSetRegionVisibility: (ids: number[], visible: boolean, path?: readonly string[]) => void;
  selectedNodeId: number | null;
  /** Selection-card presentation only; never changes the advanced collection rows. */
  selectedDisplayNode?: SceneNode;
  onSetSelectedVisibility?: (id: number, visible: boolean) => void;
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
  /** Vertical full-width rows for the mobile Collections sheet (strip variant). */
  compact?: boolean;
  onIsolateSelectedWithContext?: () => void;
}

export interface FocusedMenuConfig {
  groups: readonly NervousGroup[];
  rootPath: readonly string[];
  pathForGroup: (node: SceneNode, path: readonly string[]) => readonly string[] | null;
  /** Prefix for data-testids, e.g. "autonomic". */
  testPrefix: string;
  stripLabel: string;
  /** Opt-in two-row collection strip; other atlases retain one row. */
  stripRows?: 1 | 2;
  defaultSystemLabel: string;
  heading: string;
  browseLabel: string;
  searchAllPlaceholder: string;
  searchAllScope: string;
  description: (fullscreen: boolean, activeId: string | null) => string;
  /** Extra controls rendered above the tree (sidebar and fullscreen). */
  toolbar?: ReactNode;
  /** Preserve original materials: suppress Fade/Unfade and Isolate-with-context controls. */
  preserveMaterials?: boolean;
  /** Model-switch cards remain usable before an external viewer has loaded. */
  navigationGroup?: (id: string) => boolean;
  /** Extra collection branches to expose initially; user toggles remain session-only. */
  initialExpanded?: readonly string[];
  /** Start the right-hand tree closed without changing fullscreen navigation. */
  sidebarStartsCollapsed?: boolean;
  /** Start every branch closed in sidebar, mobile and fullscreen navigation. */
  startsCollapsed?: boolean;
}

type GroupLike = { id: string; label: string; children?: readonly GroupLike[]; subgroups?: readonly GroupLike[] };

const noop = () => {};
const noFaded = new Set<number>();
const rootPath = (id: string) => id.split('/');
const within = (p: readonly string[] | null, path: readonly string[]) => p !== null && path.every((part, i) => p[i] === part);
const childrenOf = (g: GroupLike) => g.children ?? g.subgroups ?? [];
const childPath = (child: GroupLike, parent: string[]) => {
  const parts = child.id.split('/').filter(Boolean);
  return parts.length > 1 ? parts : [...parent, ...parts];
};

/** Shared focused teaching menu: category strip, scoped search, collection tree. */
export function FocusedNerveMenu({ config, ...props }: FocusedNerveMenuProps & { config: FocusedMenuConfig }) {
  const { groups: GROUPS, rootPath: ROOT, pathForGroup: pfg, testPrefix: tp } = config;
  const pathFor = useMemo(() => (node: SceneNode) => pfg(node, ROOT), [pfg, ROOT]);
  const {
    variant, nodes, activeNerveId, onActivateNerve, mixCategories = false, disabled, isLoading,
    isolatedRegionPath, onIsolateRegion, onRestoreRegion, onSetRegionVisibility, selectedNodeId,
    fadedNodeIds = noFaded, onSelect = noop, onClearSelection = noop, toggleVisibility = noop, onToggleFade = noop,
    isIsolated, isFocusing, focusError, onIsolateSelected = noop, onRestoreSelected = noop,
    onIsolateSelectedWithContext = noop,
  } = props;
  const [search, setSearch] = useState('');
  const [browse, setBrowse] = useState<CollectionBrowseState>({
    expanded: new Set(config.startsCollapsed || config.sidebarStartsCollapsed ? []
      : [...GROUPS.filter(group => group.children?.length).map(group => group.id), ...(config.initialExpanded ?? [])]),
    showUnassigned: false,
  });
  const selected = props.selectedDisplayNode ?? nodes.find((node) => node.instanceID === selectedNodeId);
  const selectedSystem = ANATOMICAL_SYSTEMS.find((s) => s.id === (selected?.systemId ?? 'nervous'));
  const rootSegments = ROOT;
  const preserve = config.preserveMaterials ?? false;

  const counts = useMemo(() => {
    const map = new Map<string, { total: number; visible: number }>();
    for (const group of GROUPS) {
      const path = rootPath(group.id);
      const members = nodes.filter((node) => within(pfg(node, path), path));
      map.set(group.id, { total: members.length, visible: members.filter((n) => n.visible).length });
    }
    return map;
  }, [nodes, pfg, GROUPS]);

  // Subgroups with no mapped meshes (only meaningful once the model has loaded).
  const unavailable = useMemo(() => {
    const out: { category: string; label: string }[] = [];
    if (!nodes.length) return out;
    for (const group of GROUPS as readonly GroupLike[]) {
      const parent = rootPath(group.id);
      for (const child of childrenOf(group)) {
        const path = childPath(child, parent);
        if (!nodes.some((node) => within(pfg(node, path), path))) out.push({ category: group.id, label: child.label });
      }
    }
    return out;
  }, [nodes, pfg, GROUPS]);

  const query = search.trim().toLowerCase();
  const activePath = activeNerveId ? rootPath(activeNerveId) : [...rootSegments];
  const matches = useMemo(() => query ? nodes.filter((node) =>
    within(pfg(node, activePath), activePath)
    && (node.name.toLowerCase().includes(query) || node.rawName.toLowerCase().includes(query)),
  ) : [], [nodes, query, activeNerveId, pfg]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeGroups = variant === 'sidebar' && activeNerveId
    ? GROUPS.filter((g) => g.id === activeNerveId)
    : GROUPS;
  const activeLabel = GROUPS.find((g) => g.id === activeNerveId)?.label;

  const compact = Boolean(props.compact);
  if (variant === 'strip') {
    return (
      <nav aria-label={config.stripLabel} className="flex-shrink-0 border-b border-border bg-card/95 px-3 py-2 sm:px-4 z-10">
        <div data-testid={`collection-strip-${tp}`}
          className={compact ? 'flex flex-col gap-1.5' : config.stripRows === 2 ? 'grid grid-rows-2 gap-1.5 overflow-x-auto pb-0.5' : 'flex gap-1.5 overflow-x-auto pb-0.5'}
          style={!compact && config.stripRows === 2
            ? { gridTemplateColumns: `repeat(${Math.max(1, Math.ceil(GROUPS.length / 2))}, minmax(7rem, 1fr))` }
            : undefined}>
          {GROUPS.map((group) => {
            const c = counts.get(group.id);
            const active = group.id === activeNerveId;
            const loaded = nodes.length > 0;
            return (
              <button key={group.id} type="button" disabled={!config.navigationGroup?.(group.id) && (disabled || (loaded && !c?.total))}
                aria-pressed={active}
                title={!config.navigationGroup?.(group.id) && loaded && !c?.total ? `${group.label}: no mapped structures in this model` : group.label}
                data-testid={`button-${tp}-${group.id.split('/').at(-1)}`}
                onClick={() => onActivateNerve(rootPath(group.id))}
                className={`${compact ? 'w-full' : config.stripRows === 2 ? 'min-w-0' : 'shrink-0 min-w-[7rem] max-w-[14rem]'} min-h-11 rounded-md border px-2.5 py-1.5 text-left transition-colors disabled:opacity-40 focus-visible:outline focus-visible:outline-primary ${active ? 'border-primary/60 bg-primary/15 text-foreground' : 'border-border bg-background text-muted-foreground hover:text-foreground'}`}>
                <span className="block text-[11px] font-medium leading-tight">{group.label}</span>
                <span className="block text-[10px] text-muted-foreground tabular-nums">
                  {config.navigationGroup?.(group.id) ? '3D model' : `${c?.visible ?? 0}/${c?.total ?? 0}`}
                </span>
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
      <p data-testid={fullscreen ? 'fullscreen-selected-system' : undefined} className="mt-1 text-xs text-primary">{selected ? selectedSystem?.label : config.defaultSystemLabel}</p>
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
          {!mixCategories && !preserve && <button type="button" disabled={isFocusing} onClick={onIsolateSelectedWithContext}
            data-testid={`button-${tp}-isolate-with-context`}
            className="w-full min-h-10 flex items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium px-3 py-2 disabled:opacity-50">
            <Focus className="w-3.5 h-3.5" /> Isolate with context
          </button>}
          <div className="flex gap-2">
            {!preserve && !isAlwaysOpaqueStructure(selected) && <button type="button" onClick={() => onToggleFade(selected.instanceID)} className="flex-1 min-h-10 flex items-center justify-center gap-1.5 rounded border border-border text-muted-foreground hover:text-foreground text-xs py-1.5">
              <Blend className="w-3 h-3" /> {fadedNodeIds.has(selected.instanceID) ? 'Unfade' : 'Fade'}
            </button>}
            <button type="button" onClick={() => (props.onSetSelectedVisibility ?? toggleVisibility)(selected.instanceID, !selected.visible)} className="flex-1 min-h-10 flex items-center justify-center gap-1.5 rounded border border-border text-muted-foreground hover:text-foreground text-xs py-1.5">
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
      heading={config.heading}
      description={config.description(fullscreen, activeNerveId)}
      namespace={fullscreen ? `fullscreen-${tp}` : tp}
      collectionsOnly={fullscreen}
      initialExpanded={new Set(config.startsCollapsed ? [] : [...GROUPS.filter(group => group.children?.length).map(group => group.id), ...(config.initialExpanded ?? [])])}
      disabled={disabled}
      showUnassigned={false}
      nodes={nodes}
      pathForNode={pathFor}
      pathForGroup={pfg}
      onSetVisibility={onSetRegionVisibility}
      onIsolate={onActivateNerve}
      isolatedPath={isolatedRegionPath}
      onRestore={onRestoreRegion}
      onSelect={fullscreen ? noop : onSelect}
      toggleVisibility={fullscreen ? noop : toggleVisibility}
      onToggleFade={fullscreen ? noop : onToggleFade}
      disableFade={preserve}
      fadedNodeIds={fullscreen ? noFaded : fadedNodeIds}
    />
  );

  const scopedUnavailable = unavailable.filter((u) => !activeNerveId || u.category === activeNerveId);
  const unavailableNote = scopedUnavailable.length > 0 && (
    <div data-testid={`${tp}-unavailable`} className={`rounded-md border px-3 py-2 text-[11px] leading-relaxed ${fullscreen ? 'border-white/10 text-white/60' : 'border-sidebar-border text-muted-foreground'}`}>
      <p className="font-medium">Not represented in this model</p>
      <p className="mt-0.5">These subgroups are listed for completeness; the source model contains no mapped meshes for them, so their controls stay disabled.</p>
      <ul className="mt-1 list-disc pl-4">
        {scopedUnavailable.map((u) => <li key={`${u.category}-${u.label}`}>{u.label}</li>)}
      </ul>
    </div>
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
          {!mixCategories && !preserve && <button type="button" disabled={!selected || disabled || isFocusing} onClick={onIsolateSelectedWithContext}
            data-testid="fullscreen-isolate-with-context"
            className="mt-2 w-full min-h-10 rounded-md border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40">
            Isolate with context
          </button>}
        </div>
        <details open className="min-h-0 overflow-auto" data-testid="fullscreen-collections">
          <summary className="cursor-pointer px-3 py-2 text-xs text-white/70">{config.browseLabel}</summary>
          <div className="border-t border-white/10 p-2 space-y-2">{config.toolbar}{tree}{unavailableNote}</div>
        </details>
      </aside>
    );
  }

  return (
    <div className="flex flex-col h-full bg-sidebar w-full overflow-auto">
      <div className="p-3 border-b border-sidebar-border space-y-1">
        <h2 className="text-xs font-semibold tracking-wide text-sidebar-foreground">{activeLabel ?? config.defaultSystemLabel}</h2>
        <p className="text-[11px] text-muted-foreground">{activeNerveId
          ? 'Structures of the selected category. Choose another category above.'
          : 'The whole model is shown. Choose a category above to open its custom view.'}</p>
      </div>
      <div className="p-3 flex flex-col gap-3">
        {selected && selectedCard}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={activeNerveId ? 'Search this category…' : config.searchAllPlaceholder}
            aria-label="Search structures in the active category" data-testid={`input-${tp}-search`}
            className="w-full h-10 lg:h-8 rounded-md border border-sidebar-border bg-background/40 pl-8 pr-8 text-xs focus:border-primary outline-none" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
        </div>
        {isLoading ? <p className="text-xs text-muted-foreground text-center py-10 animate-pulse">Loading structures…</p>
          : query ? (
            <div className="flex flex-col gap-1" data-testid={`${tp}-search-results`}>
              <p className="text-[11px] text-muted-foreground px-1">{matches.length} result{matches.length === 1 ? '' : 's'} in {activeNerveId ? 'this category' : config.searchAllScope}</p>
              {matches.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No structures match your search.</p>}
              {matches.slice(0, 80).map((node) => (
                <div key={node.instanceID} className={`flex items-center gap-1 rounded px-2 py-1.5 text-xs ${node.instanceID === selectedNodeId ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-background/60'}`}>
                  <button type="button" onClick={() => onSelect(node.instanceID)} className={`flex-1 min-w-0 text-left truncate ${node.visible ? '' : 'opacity-50'}`} title={node.name === node.rawName ? node.rawName : `${node.name}\n${node.rawName}`}>{node.name}</button>
                  <button type="button" onClick={() => toggleVisibility(node.instanceID, !node.visible)} aria-label={node.visible ? `Hide ${node.name}` : `Show ${node.name}`} className="h-7 w-7 flex items-center justify-center hover:text-foreground">
                    {node.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </div>
          ) : <>{config.toolbar}{tree}{unavailableNote}</>}
      </div>
    </div>
  );
}
