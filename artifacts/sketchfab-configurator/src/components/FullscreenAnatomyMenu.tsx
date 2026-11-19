import { useMemo } from 'react';
import { ANATOMICAL_SYSTEMS, type SystemGroupId } from '../data/anatomicalSystems';
import { regionMenuForSystem } from '../data/regionMenus';
import { NervousSystemMenu } from './NervousSystemMenu';
import type { SceneNode } from '../types/sketchfab';
import { NeuroanatomyTabs } from './NeuroanatomyTabs';
import type { AdvancedCollectionRequest } from '../data/advancedAtlasCollections';
import { getAdvancedNeuroanatomyGroups, advancedNeuroanatomyPathForNode, advancedNeuroanatomyPathForGroup, type NeuroanatomyMode } from '../data/advancedNeuroanatomy';

import { filterAtlasGroups } from '../data/atlasViews';
import { brainGrossAnatomyPathForNode } from '../data/brainGrossAnatomy';

interface Props {
  excludedNeuroanatomyGroupIds?: readonly string[];
  brainGrossAnatomy?: boolean;
  mixCategories?: boolean;
  nodes: SceneNode[];
  selectedSystemId: SystemGroupId;
  neuroanatomyMode: NeuroanatomyMode;
  advancedCollectionRequest?: AdvancedCollectionRequest | null;
  onNeuroanatomyModeChange: (mode: NeuroanatomyMode) => void;
  selectedNodeId: number | null;
  regionPathForNode: (node: SceneNode) => readonly string[] | null;
  onSetRegionVisibility: (ids: number[], visible: boolean) => void;
  onIsolateRegion: (path: readonly string[]) => void;
  isolatedRegionPath: readonly string[] | null;
  onRestoreRegion: () => void;
  isIsolated: boolean;
  isFocusing: boolean;
  focusError: string | null;
  controlsAvailable: boolean;
  onIsolate: () => void;
  onRestore: () => void;
}

/** Keep selected anatomy prominent; browsing the rest is optional. */
const ignoreMeshAction = () => {};
const noFadedNodes = new Set<number>();

export function FullscreenAnatomyMenu({
  mixCategories = false, excludedNeuroanatomyGroupIds, brainGrossAnatomy = false,
  nodes, selectedSystemId, selectedNodeId,
  neuroanatomyMode, onNeuroanatomyModeChange,
  advancedCollectionRequest,
  regionPathForNode, onSetRegionVisibility, onIsolateRegion, isolatedRegionPath, onRestoreRegion,
  isIsolated, isFocusing, focusError, controlsAvailable, onIsolate, onRestore,
}: Props) {
  const selected = nodes.find((node) => node.instanceID === selectedNodeId);
  const systemNodes = useMemo(() => nodes
    .filter((node) => (node.systemId ?? 'nervous') === selectedSystemId), [nodes, selectedSystemId]);
  const regionMenu = regionMenuForSystem(selectedSystemId, brainGrossAnatomy);
  const gross = brainGrossAnatomy && selectedSystemId === 'nervous' && neuroanatomyMode === 'standard';
  const advanced = selectedSystemId === 'nervous' && neuroanatomyMode === 'advanced';
  const selectedSystem = ANATOMICAL_SYSTEMS.find((system) =>
    system.id === (selected?.systemId ?? selectedSystemId));

  return (
    <aside
      aria-label="Fullscreen anatomy names"
      data-testid="fullscreen-anatomy-menu"
      className="absolute right-3 top-3 z-20 w-64 sm:w-72 max-w-[calc(100%_-_1.5rem)] max-h-[calc(100%_-_1.5rem)] flex flex-col rounded-xl border border-white/15 bg-black/80 text-white shadow-xl backdrop-blur-md"
    >
      <div className="shrink-0 border-b border-white/10 p-3" role="status" aria-live="polite" aria-atomic="true">
        <p className="text-[10px] uppercase tracking-widest text-white/50">Selected structure</p>
        <p data-testid="fullscreen-selected-system" className="mt-1 text-xs text-primary">{brainGrossAnatomy && selectedSystem?.id === 'nervous' ? gross ? 'Brain gross anatomy' : 'Brain anatomy' : selectedSystem?.label}</p>
        <p data-testid="fullscreen-selected-name" className="mt-1 text-sm font-medium leading-snug break-words">
          {selected?.name ?? 'Click a structure in the model to see its name.'}
        </p>
      </div>
      <div className="shrink-0 px-3 py-2">
        <button
          type="button"
          disabled={!selected || !controlsAvailable || isFocusing}
          onClick={!mixCategories && isIsolated ? onRestore : onIsolate}
          data-testid="fullscreen-isolate-selected"
          className="w-full min-h-10 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-40 focus-visible:outline focus-visible:outline-primary"
        >
          {isFocusing ? 'Preparing selected structure…' : mixCategories ? 'Add selected to mixed view (I)' : isIsolated ? 'Restore previous view (R)' : 'Show only selected (I)'}
        </button>
        {focusError && <p role="alert" className="mt-2 text-xs text-red-300">{focusError}</p>}
      </div>
      <details open className="min-h-0 overflow-auto" data-testid="fullscreen-collections">
        <summary className="cursor-pointer px-3 py-2 text-xs text-white/70 focus-visible:outline focus-visible:outline-primary">
          Browse collections
        </summary>
        {selectedSystemId === 'nervous' && <div className="px-2 py-1"><NeuroanatomyTabs mode={neuroanatomyMode} onChange={onNeuroanatomyModeChange} prefix="fullscreen-neuroanatomy" /></div>}
        <div className="border-t border-white/10 p-2"
          role={selectedSystemId === 'nervous' ? 'tabpanel' : undefined}
          id="fullscreen-neuroanatomy-panel"
          aria-labelledby={selectedSystemId === 'nervous' ? `fullscreen-neuroanatomy-${neuroanatomyMode}` : undefined}>
          {regionMenu ? (
            <NervousSystemMenu
              mixCategories={mixCategories}
              key={advancedCollectionRequest ? `${advancedCollectionRequest.id}:${advancedCollectionRequest.revision}` : `${selectedSystemId}-${neuroanatomyMode}`}
              groups={filterAtlasGroups(advanced ? getAdvancedNeuroanatomyGroups(brainGrossAnatomy).filter((group) =>
                !advancedCollectionRequest || group.id === advancedCollectionRequest.id) : regionMenu.groups, excludedNeuroanatomyGroupIds)}
              layout={advanced && !advancedCollectionRequest ? 'columns' : 'stacked'}
              heading={advanced ? 'ADVANCED NEUROANATOMY' : regionMenu.heading}
              description={selectedSystemId === 'nervous' ? '' : 'Expand collections to browse subdivisions. Show, hide, or isolate a collection.'}
              namespace={advanced ? 'fullscreen-advanced-neuroanatomy' : `fullscreen-${regionMenu.namespace}`}
              collectionsOnly
              disabled={!controlsAvailable || isFocusing}
              nodes={systemNodes}
              pathForNode={gross ? brainGrossAnatomyPathForNode : advanced ? advancedNeuroanatomyPathForNode : regionPathForNode}
              pathForGroup={advanced || gross ? advancedNeuroanatomyPathForGroup : undefined}
              onSetVisibility={onSetRegionVisibility}
              onIsolate={onIsolateRegion}
              isolatedPath={isolatedRegionPath}
              onRestore={onRestoreRegion}
              onSelect={ignoreMeshAction}
              toggleVisibility={ignoreMeshAction}
              onToggleFade={ignoreMeshAction}
              fadedNodeIds={noFadedNodes}
            />
          ) : <p className="px-2 py-3 text-xs text-white/50">No collections defined for this system.</p>}
        </div>
      </details>
    </aside>
  );
}
