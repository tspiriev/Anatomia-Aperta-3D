import { useState, useMemo, useRef, useEffect } from 'react';
import { isAlwaysOpaqueStructure } from '../lib/materialTransparency';
import type { SceneNode } from '../types/sketchfab';
import { Search, X, Focus, ArrowLeft, Blend, Eye, EyeOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { ANATOMICAL_SYSTEMS, type SystemGroupId } from '../data/anatomicalSystems';
import { MeshRow } from './MeshRow';
import { NervousSystemMenu, type CollectionBrowseState } from './NervousSystemMenu';
import { regionMenuForSystem } from '../data/regionMenus';
import { filterAtlasGroups } from '../data/atlasViews';
import { brainGrossAnatomyPathForNode } from '../data/brainGrossAnatomy';
import { NeuroanatomyTabs } from './NeuroanatomyTabs';
import type { AdvancedCollectionRequest } from '../data/advancedAtlasCollections';
import { getAdvancedNeuroanatomyGroups, advancedNeuroanatomyPathForNode, advancedNeuroanatomyPathForGroup, type NeuroanatomyMode } from '../data/advancedNeuroanatomy';

interface MeshPanelProps {
  mixCategories?: boolean;
  excludedNeuroanatomyGroupIds?: readonly string[];
  brainGrossAnatomy?: boolean;
  nodes: SceneNode[];
  selectedSystemId: SystemGroupId;
  neuroanatomyMode: NeuroanatomyMode;
  advancedCollectionRequest?: AdvancedCollectionRequest | null;
  onNeuroanatomyModeChange: (mode: NeuroanatomyMode) => void;
  toggleVisibility: (id: number, visible: boolean) => void;
  onSetRegionVisibility: (ids: number[], visible: boolean, path?: readonly string[]) => void;
  onIsolateRegion: (path: readonly string[]) => void;
  isolatedRegionPath: readonly string[] | null;
  onRestoreRegion: () => void;
  regionPathForNode: (node: SceneNode) => readonly string[] | null;
  isLoading?: boolean;
  selectedNodeId: number | null;
  fadedNodeIds: Set<number>;
  onSelect: (instanceID: number) => void;
  onClearSelection: () => void;
  onToggleFade: (instanceID: number) => void;
  isolatedNodeId: number | null;
  isFocusing: boolean;
  focusError: string | null;
  onFocusWithContext: (instanceID: number) => void;
  onExitIsolation: () => void;
}

const EMPTY_BROWSE_STATE: CollectionBrowseState = {
  expanded: new Set(),
  showUnassigned: false,
};

export function MeshPanel({
  mixCategories = false,
  excludedNeuroanatomyGroupIds,
  brainGrossAnatomy = false,
  nodes,
  selectedSystemId,
  neuroanatomyMode,
  advancedCollectionRequest,
  onNeuroanatomyModeChange,
  toggleVisibility,
  onSetRegionVisibility,
  onIsolateRegion,
  isolatedRegionPath,
  onRestoreRegion,
  regionPathForNode,
  isLoading,
  selectedNodeId,
  fadedNodeIds,
  onSelect,
  onClearSelection,
  onToggleFade,
  isolatedNodeId,
  isFocusing,
  focusError,
  onFocusWithContext,
  onExitIsolation,
}: MeshPanelProps) {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'system' | 'all'>('system');
  const [browseAll, setBrowseAll] = useState(false);
  // In-memory only: the tree can unmount for details/search without losing its
  // open branches. A new page session starts with every collection collapsed.
  const [collectionBrowseStates, setCollectionBrowseStates] = useState<
    Record<string, CollectionBrowseState>
  >((): Record<string, CollectionBrowseState> => advancedCollectionRequest ? {
    'nervous-advanced': {
      expanded: new Set(),
      showUnassigned: false,
    },
  } : {});
  const collectionBrowseKey = selectedSystemId === 'nervous'
    ? `${selectedSystemId}-${neuroanatomyMode}`
    : selectedSystemId;
  useEffect(() => {
    if (!advancedCollectionRequest) return;
    setSearch('');
    setScope('system');
    setBrowseAll(false);
    setCollectionBrowseStates((current) => ({
      ...current,
      'nervous-advanced': {
        expanded: new Set(),
        showUnassigned: false,
      },
    }));
  }, [advancedCollectionRequest]);
  const selectedRowRef = useRef<HTMLDivElement>(null);
  const previousSelection = useRef<number | null>(null);
  const gross = brainGrossAnatomy && selectedSystemId === 'nervous' && neuroanatomyMode === 'standard';
  const groupLabel = brainGrossAnatomy && selectedSystemId === 'nervous'
    ? gross ? 'Brain gross anatomy' : 'Brain anatomy'
    : ANATOMICAL_SYSTEMS.find((system) => system.id === selectedSystemId)?.label ?? 'Nervous system';
  const selectedNode = nodes.find((node) => node.instanceID === selectedNodeId);
  const systemNodes = useMemo(
    () => nodes.filter((node) => (node.systemId ?? 'nervous') === selectedSystemId
      && (!gross || brainGrossAnatomyPathForNode(node) !== null)),
    [nodes, selectedSystemId, gross],
  );
  const query = search.trim().toLowerCase();
  const matchingNodes = useMemo(() => {
    if (scope === 'all' && !query) return [];
    const source = scope === 'all' ? nodes : systemNodes;
    return query ? source.filter((node) => node.name.toLowerCase().includes(query)) : source;
  }, [scope, query, nodes, systemNodes]);
  const showingDetails = Boolean(selectedNode) && !query;
  const displayNodes = query ? matchingNodes.slice(0, 50) : browseAll ? matchingNodes : matchingNodes.slice(0, 10);
  const hiddenCount = systemNodes.filter((node) => !node.visible).length;
  const regionMenu = regionMenuForSystem(selectedSystemId, brainGrossAnatomy);
  const advanced = selectedSystemId === 'nervous' && neuroanatomyMode === 'advanced';
  const showRegionMenu = regionMenu !== null
    && scope === 'system' && !query && !showingDetails;

  useEffect(() => {
    setSearch('');
    setBrowseAll(false);
  }, [selectedSystemId]);

  // A click in the 3D viewer reveals the matching row, even if a search was active.
  useEffect(() => {
    if (selectedNodeId === null) {
      previousSelection.current = null;
      return;
    }
    if (previousSelection.current !== selectedNodeId) {
      previousSelection.current = selectedNodeId;
      setSearch('');
    }
  }, [selectedNodeId]);

  return (
    <div className="flex flex-col h-full bg-sidebar w-full">
      <div className="p-3 border-b border-sidebar-border flex-shrink-0 space-y-2.5">
        <div className="flex items-center justify-between gap-2 min-h-[20px]">
          <h2 className="min-w-0 text-[13px] lg:text-xs font-semibold tracking-wide leading-snug text-sidebar-foreground lg:truncate" title={groupLabel}>
            {groupLabel} <span className="text-muted-foreground font-normal">({systemNodes.length})</span>
          </h2>
          {selectedNode && (
            <button
              type="button"
              onClick={onClearSelection}
              className="flex min-h-10 lg:min-h-0 items-center gap-1 text-xs lg:text-[10px] text-primary px-3 lg:px-1.5 lg:py-0.5 rounded bg-primary/10 hover:bg-primary/20 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Back to structures"
            >
              <ArrowLeft className="w-3 h-3" /> List
            </button>
          )}
        </div>
        <div className="flex gap-1 rounded-md bg-background/60 border border-sidebar-border p-0.5" role="group" aria-label="Search scope">
          <button type="button" aria-pressed={scope === 'system'} onClick={() => { setScope('system'); setBrowseAll(false); }}
            className={`flex-1 min-h-10 lg:min-h-0 px-2 lg:py-1 rounded text-xs lg:text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${scope === 'system' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            This system
          </button>
          <button type="button" aria-pressed={scope === 'all'} onClick={() => { setScope('all'); setBrowseAll(false); }}
            className={`flex-1 min-h-10 lg:min-h-0 px-2 lg:py-1 rounded text-xs lg:text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${scope === 'all' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            All structures
          </button>
        </div>
        {selectedSystemId === 'nervous' && scope === 'system' && (
          <NeuroanatomyTabs mode={neuroanatomyMode} prefix="mesh-neuroanatomy" onChange={(mode) => {
            onNeuroanatomyModeChange(mode);
            setSearch('');
            setBrowseAll(false);
            onClearSelection();
          }} />
        )}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={scope === 'all' ? 'Search all structures…' : `Search ${groupLabel.toLowerCase()}…`}
            aria-label={scope === 'all' ? 'Search all structures' : `Search ${groupLabel} structures`}
            data-testid="input-structure-search"
            className={`pl-9 lg:pl-8 ${search ? 'pr-12 lg:pr-8' : 'pr-3'} bg-background/40 h-11 lg:h-8 text-sm lg:text-xs border-sidebar-border focus:border-primary`}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear search" data-testid="button-clear-structure-search" className="absolute right-0 lg:right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 lg:h-6 lg:w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 flex flex-col gap-1"
          role={selectedSystemId === 'nervous' && scope === 'system' ? 'tabpanel' : undefined}
          id="mesh-neuroanatomy-panel"
          aria-labelledby={selectedSystemId === 'nervous' && scope === 'system' ? `mesh-neuroanatomy-${neuroanatomyMode}` : undefined}>
          {!selectedNode && isFocusing && <p role="status" className="text-xs text-muted-foreground animate-pulse pb-2">Focusing isolated anatomy…</p>}
          {!selectedNode && focusError && <p role="alert" className="text-xs text-destructive pb-2">{focusError}</p>}
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-10 animate-pulse">Loading structures…</p>
          ) : showingDetails && selectedNode ? (
            <section aria-label={`Selected structure: ${selectedNode.name}`} className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-primary/75 font-medium mb-2">Selected structure</p>
                <h3 className="text-sm font-semibold text-foreground leading-snug break-words">{selectedNode.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {ANATOMICAL_SYSTEMS.find((system) => system.id === (selectedNode.systemId ?? 'nervous'))?.label}
                </p>
              </div>
              {isolatedNodeId === selectedNode.instanceID ? (
                <>
                  <p className={`text-xs text-muted-foreground leading-relaxed ${isFocusing ? 'animate-pulse' : ''}`}>
                    {isFocusing ? 'Preparing focused view…' : 'Focused on this structure. Restore to return to your previous view.'}
                  </p>
                  <button type="button" onClick={onExitIsolation} className="w-full min-h-10 lg:min-h-0 rounded-md border border-primary/40 bg-primary/15 hover:bg-primary/25 text-primary text-xs font-medium px-3 py-2">
                    Restore previous view
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => onFocusWithContext(selectedNode.instanceID)}
                    className="w-full min-h-11 lg:min-h-0 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold px-3 py-2">
                    <Focus className="w-3.5 h-3.5" /> {mixCategories ? 'Add to mixed view' : 'Isolate with context'}
                  </button>
                </>
              )}
              <div className="flex gap-2">
                {!isAlwaysOpaqueStructure(selectedNode) && <button type="button" onClick={() => onToggleFade(selectedNode.instanceID)} className="flex-1 min-h-10 lg:min-h-0 flex items-center justify-center gap-1.5 rounded border border-border text-muted-foreground hover:text-foreground text-xs py-1.5">
                  <Blend className="w-3 h-3" /> {fadedNodeIds.has(selectedNode.instanceID) ? 'Unfade' : 'Fade'}
                </button>}
                <button type="button" onClick={() => toggleVisibility(selectedNode.instanceID, !selectedNode.visible)} className="flex-1 min-h-10 lg:min-h-0 flex items-center justify-center gap-1.5 rounded border border-border text-muted-foreground hover:text-foreground text-xs py-1.5">
                  {selectedNode.visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {selectedNode.visible ? 'Hide' : 'Show'}
                </button>
              </div>
              {focusError && <p role="alert" className="text-xs text-destructive">{focusError}</p>}
              <button type="button" onClick={onClearSelection} className="min-h-10 lg:min-h-0 text-left text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">Back to structures</button>
            </section>
          ) : showRegionMenu && regionMenu ? (
            <NervousSystemMenu
              mixCategories={mixCategories}
              key={`${selectedSystemId}-${neuroanatomyMode}`}
              browseState={collectionBrowseStates[collectionBrowseKey] ?? EMPTY_BROWSE_STATE}
              onBrowseStateChange={(state) => setCollectionBrowseStates((current) => ({
                ...current,
                [collectionBrowseKey]: state,
              }))}
              groups={filterAtlasGroups(advanced ? getAdvancedNeuroanatomyGroups(brainGrossAnatomy).filter((group) =>
                !advancedCollectionRequest || group.id === advancedCollectionRequest.id) : regionMenu.groups, excludedNeuroanatomyGroupIds)}
              layout={advanced && !advancedCollectionRequest ? 'columns' : 'stacked'}
              heading={advanced ? 'ADVANCED NEUROANATOMY' : regionMenu.heading}
              description={selectedSystemId === 'nervous' ? '' : selectedSystemId === 'attachments'
                ? 'Expand a collection for regional controls and attachment sites. Muscle regions keep the named muscle’s origin and insertion sites together.'
                : undefined}
              namespace={advanced ? 'advanced-neuroanatomy' : regionMenu.namespace}
              showUnassigned={!advanced}
              preserveUnassigned={!['vascular', 'attachments'].includes(selectedSystemId)}
              nodes={systemNodes}
              pathForNode={gross ? brainGrossAnatomyPathForNode : advanced ? advancedNeuroanatomyPathForNode : regionPathForNode}
              pathForGroup={advanced || gross ? advancedNeuroanatomyPathForGroup : undefined}
              onSetVisibility={onSetRegionVisibility}
              onIsolate={onIsolateRegion}
              isolatedPath={isolatedRegionPath}
              onRestore={onRestoreRegion}
              onSelect={onSelect}
              toggleVisibility={toggleVisibility}
              onToggleFade={onToggleFade}
              fadedNodeIds={fadedNodeIds}
            />
          ) : scope === 'all' && !query ? (
            <p className="text-xs text-muted-foreground text-center py-10 px-3">Type a name to search across all anatomical systems.</p>
          ) : displayNodes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">
              {query ? 'No structures match your search.' : `No structures in ${groupLabel.toLowerCase()}.`}
            </p>
          ) : (
            <>
              {query && <p className="text-[11px] text-muted-foreground px-2 pb-1">{matchingNodes.length} result{matchingNodes.length === 1 ? '' : 's'} {scope === 'all' ? 'across all systems' : `in ${groupLabel.toLowerCase()}`}</p>}
              {displayNodes.map((node) => (
                <MeshRow
                  key={node.instanceID}
                  node={node}
                  isSelected={selectedNodeId === node.instanceID}
                  isFaded={fadedNodeIds.has(node.instanceID)}
                  systemLabel={scope === 'all' ? ANATOMICAL_SYSTEMS.find((system) => system.id === (node.systemId ?? 'nervous'))?.label : undefined}
                  selectedRowRef={selectedRowRef}
                  onSelect={onSelect}
                  onToggleFade={onToggleFade}
                  toggleVisibility={toggleVisibility}
                />
              ))}
              {!query && !browseAll && matchingNodes.length > displayNodes.length && (
                 <button type="button" onClick={() => setBrowseAll(true)} className="min-h-10 text-xs text-primary hover:underline py-3">
                  Browse all {matchingNodes.length} structures
                </button>
              )}
              {query && matchingNodes.length > displayNodes.length && (
                <p className="text-[11px] text-muted-foreground px-2 py-2">Showing the first {displayNodes.length} results. Refine your search to find a specific structure.</p>
              )}
            </>
          )}
        </div>
      </ScrollArea>
      {hiddenCount > 0 && (
        <div className="px-3 py-2 border-t border-sidebar-border shrink-0">
          <p className="text-[10px] text-muted-foreground">{hiddenCount} structure{hiddenCount === 1 ? '' : 's'} hidden in this system</p>
        </div>
      )}
    </div>
  );
}