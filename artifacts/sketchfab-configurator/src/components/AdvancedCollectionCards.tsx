import { Eye, EyeOff } from 'lucide-react';
import { ADVANCED_ATLAS_COLLECTIONS } from '../data/advancedAtlasCollections';
import { isNodeInRegion } from '../lib/regionIsolation';
import type { SceneNode } from '../types/sketchfab';
import { filterAtlasGroups } from '../data/atlasViews';

export interface AdvancedCollectionCardsProps {
  nodes: SceneNode[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onSetVisibility: (ids: number[], visible: boolean) => void;
  excludedNeuroanatomyGroupIds?: readonly string[];
  collections?: readonly (typeof ADVANCED_ATLAS_COLLECTIONS[number])[];
}

export function AdvancedCollectionCards({ nodes, selectedId, onSelect, onSetVisibility, excludedNeuroanatomyGroupIds, collections = ADVANCED_ATLAS_COLLECTIONS }: AdvancedCollectionCardsProps) {
  return filterAtlasGroups(collections, excludedNeuroanatomyGroupIds).map(({ id, label, image, path }) => {
    const members = nodes.filter((node) => isNodeInRegion(node, path, () => null));
    const visibleCount = members.filter((node) => node.visible).length;
    const allVisible = members.length > 0 && visibleCount === members.length;
    const selected = id === selectedId;
    const key = path.at(-1);
    return (
      <div key={id} className={`relative shrink-0 w-[166px] lg:w-auto lg:min-w-0 h-16 rounded-lg border overflow-hidden transition-colors ${
        selected ? 'border-primary/60 bg-primary/10' : 'border-border bg-background/50 hover:border-primary/30'
      }`}>
        <button type="button" onClick={() => onSelect(id)} aria-pressed={selected}
          data-testid={`button-select-collection-${key}`}
          title={`Open ${label} in Advanced anatomy`}
          className="flex items-center w-full h-full text-left hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]">
          <img src={image} alt="" className="w-[52px] h-full object-contain bg-black border-r border-border/70 shrink-0" />
          <span className="min-w-0 flex-1 px-2">
            <span className={`block text-[11px] leading-tight font-medium ${selected ? 'text-primary' : 'text-foreground'}`}>{label}</span>
            <span className="block mt-1 pr-5 text-[9px] text-muted-foreground">
              {members.length ? `${visibleCount}/${members.length} visible` : 'Advanced anatomy'}
            </span>
          </span>
        </button>
        <button type="button" disabled={!members.length}
          onClick={() => onSetVisibility(members.map((node) => node.instanceID), !allVisible)}
          aria-label={`${allVisible ? 'Hide' : 'Show'} ${label}`} aria-pressed={allVisible}
          data-testid={`button-visibility-collection-${key}`}
          className="absolute right-1 bottom-1 flex items-center justify-center w-6 h-6 rounded bg-black/75 text-white border border-white/25 hover:bg-primary/30 disabled:opacity-30 focus-visible:outline focus-visible:outline-primary">
          {allVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
      </div>
    );
  });
}
