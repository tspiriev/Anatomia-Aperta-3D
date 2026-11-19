import { Eye, EyeOff } from 'lucide-react';
import type { CSSProperties } from 'react';
import { filterAtlasGroups } from '../data/atlasViews';
import { ADVANCED_ATLAS_COLLECTIONS, MENINGES_ATLAS_COLLECTION, LIMBIC_ATLAS_COLLECTION, BASAL_FOREBRAIN_ATLAS_COLLECTION, VENTRICULAR_ATLAS_COLLECTION } from '../data/advancedAtlasCollections';
import type { SceneNode } from '../types/sketchfab';
import { ANATOMICAL_SYSTEMS, type SystemGroupId } from '../data/anatomicalSystems';
import skeletalImage from '../assets/skeletal.webp';
import muscularImage from '../assets/muscular.webp';
import jointsImage from '../assets/joints.webp';
import vascularImage from '../assets/vascular.webp';
import nervousImage from '../assets/nervous.webp';
import organsImage from '../assets/organs.webp';
import attachmentsImage from '../assets/attachments.webp';
import lymphaticImage from '../assets/lymphatic.webp';
import { AdvancedCollectionCards } from './AdvancedCollectionCards';
import { brainGrossAnatomyPathForNode } from '../data/brainGrossAnatomy';

const SYSTEM_IMAGES: Record<SystemGroupId, string> = {
  skeletal: skeletalImage,
  muscular: muscularImage,
  joints: jointsImage,
  vascular: vascularImage,
  nervous: nervousImage,
  organs: organsImage,
  attachments: attachmentsImage,
  lymphatic: lymphaticImage,
};

interface SystemToolbarProps {
  nodes: SceneNode[];
  selectedSystemId: SystemGroupId;
  onSelect: (id: SystemGroupId) => void;
  onSetVisibility: (ids: number[], visible: boolean) => void;
  systemIds?: readonly SystemGroupId[];
  showAdvancedCollections?: boolean;
  excludedNeuroanatomyGroupIds?: readonly string[];
  brainGrossAnatomy?: boolean;
  selectedCollectionId?: string;
  onSelectCollection?: (id: string) => void;
  /** Vertical full-width list for the mobile Collections sheet. */
  compact?: boolean;
}

export function SystemToolbar({
  nodes, selectedSystemId, onSelect, onSetVisibility, systemIds,
  showAdvancedCollections = false, selectedCollectionId, onSelectCollection, excludedNeuroanatomyGroupIds, brainGrossAnatomy = false, compact = false,
}: SystemToolbarProps) {
  const groups = ANATOMICAL_SYSTEMS
    .filter((system) => !systemIds || systemIds.includes(system.id))
    .map((system) => {
      const gross = brainGrossAnatomy && system.id === 'nervous';
      const members = nodes.filter((node) => (node.systemId ?? 'nervous') === system.id
        && (!gross || brainGrossAnatomyPathForNode(node) !== null));
      return { ...system, label: gross ? 'Brain gross anatomy' : system.label, members, visibleCount: members.filter((node) => node.visible).length };
    });
  const selectedGroup = groups.find((group) => group.id === selectedSystemId);
  const selectedAllVisible = Boolean(selectedGroup?.members.length) && selectedGroup?.visibleCount === selectedGroup?.members.length;
  const selectedAction = selectedAllVisible ? 'Hide' : 'Show';

  return (
    <nav
      aria-label="Anatomical systems"
      className="flex-shrink-0 border-b border-border bg-card/95 px-3 py-2 sm:px-4 z-10"
    >
      <div className={`flex items-center gap-2 ${compact ? '' : 'md:hidden'}`}>
        <label htmlFor="anatomical-system-select" className="sr-only">Anatomical system</label>
        {brainGrossAnatomy ? (
          <button type="button" onClick={() => onSelect('nervous')}
            aria-pressed={!selectedCollectionId}
            data-testid="button-select-system-mobile-nervous"
            className="min-w-0 flex-1 h-11 rounded-md border border-border bg-background px-3 text-left text-sm font-medium text-foreground focus-visible:outline focus-visible:outline-primary">
            Brain gross anatomy
          </button>
        ) : <select
          id="anatomical-system-select"
          value={selectedSystemId}
          onChange={(event) => onSelect(event.target.value as SystemGroupId)}
          data-testid="select-anatomical-system"
          className="min-w-0 flex-1 h-11 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {groups.map(({ id, label }) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>}
        <button
          type="button"
          disabled={!selectedGroup?.members.length}
          onClick={() => selectedGroup && onSetVisibility(selectedGroup.members.map((member) => member.instanceID), !selectedAllVisible)}
          data-testid={`button-visibility-system-mobile-${selectedSystemId}`}
          aria-label={`${selectedAction} ${selectedGroup?.label ?? 'selected system'}`}
          aria-pressed={selectedAllVisible}
          className="inline-flex h-11 min-w-[82px] shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"
        >
          {selectedAllVisible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
          {selectedAction}
        </button>
      </div>
      {showAdvancedCollections && onSelectCollection && (
        <div className={compact ? 'mt-2 flex flex-col gap-1.5 [&>*]:!w-full' : 'mt-2 flex gap-1.5 overflow-x-auto pb-1 md:hidden [scrollbar-width:thin]'} aria-label="Advanced anatomy cards">
          {brainGrossAnatomy && <AdvancedCollectionCards nodes={nodes} selectedId={selectedCollectionId} onSelect={onSelectCollection} onSetVisibility={onSetVisibility} collections={[MENINGES_ATLAS_COLLECTION, LIMBIC_ATLAS_COLLECTION, BASAL_FOREBRAIN_ATLAS_COLLECTION, VENTRICULAR_ATLAS_COLLECTION]} />}
          <AdvancedCollectionCards nodes={nodes} selectedId={selectedCollectionId} onSelect={onSelectCollection} onSetVisibility={onSetVisibility} excludedNeuroanatomyGroupIds={excludedNeuroanatomyGroupIds} />
        </div>
      )}
      {!compact && <div className="hidden md:flex lg:grid lg:grid-cols-[repeat(var(--atlas-card-count),minmax(0,1fr))] gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 [scrollbar-width:thin]" aria-label="System cards"
        style={{ '--atlas-card-count': groups.length + (showAdvancedCollections && onSelectCollection ? filterAtlasGroups(ADVANCED_ATLAS_COLLECTIONS, excludedNeuroanatomyGroupIds).length + (brainGrossAnatomy ? 3 : 0) : 0) } as CSSProperties}>
        {brainGrossAnatomy && showAdvancedCollections && onSelectCollection && <AdvancedCollectionCards nodes={nodes} selectedId={selectedCollectionId} onSelect={onSelectCollection} onSetVisibility={onSetVisibility} collections={[MENINGES_ATLAS_COLLECTION]} />}
        {groups.map(({ id, label, members, visibleCount }) => {
          const selected = selectedSystemId === id && !selectedCollectionId;
          const allVisible = members.length > 0 && visibleCount === members.length;
          const action = allVisible ? 'Hide' : 'Show';
          return (
            <div
              key={id}
              className={[
                'flex items-center shrink-0 w-[152px] lg:w-auto lg:min-w-0 h-[64px] rounded-lg border overflow-hidden transition-colors',
                selected
                  ? 'border-primary/60 bg-primary/10'
                  : 'border-border bg-background/50 hover:border-primary/30',
              ].join(' ')}
            >
              <button
                type="button"
                disabled={members.length === 0}
                onClick={() => onSetVisibility(members.map((member) => member.instanceID), !allVisible)}
                data-testid={`button-visibility-system-${id}`}
                aria-label={`${action} ${label}`}
                aria-pressed={allVisible}
                title={`${action} ${label}`}
                style={{ backgroundImage: `linear-gradient(to bottom, transparent 42%, rgba(0, 0, 0, .72)), url("${SYSTEM_IMAGES[id]}")` }}
                className="relative shrink-0 w-[44px] xl:w-[52px] h-full bg-cover bg-center border-r border-border/70 hover:brightness-125 transition-[filter] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px] disabled:cursor-not-allowed"
              >
                <span className="absolute bottom-1 right-1 flex items-center justify-center w-5 h-5 rounded-full bg-black/75 text-white border border-white/35 shadow-sm">
                  {allVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-pressed={selected}
                title={`${label} — ${members.length} structures`}
                data-testid={`button-select-system-${id}`}
                className="min-w-0 flex-1 h-full px-1.5 xl:px-2 text-left hover:bg-primary/5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]"
              >
                <span className="min-w-0 block">
                  <span className={`block text-[10px] xl:text-[11px] font-medium leading-tight ${selected ? 'text-primary' : 'text-foreground'}`}>
                    {label}
                  </span>
                  <span data-testid={`text-system-count-${id}`} className="block mt-1 text-[9px] xl:text-[10px] text-muted-foreground">
                    {members.length === 0 ? 'Not in viewer' : `${visibleCount}/${members.length} visible`}
                  </span>
                </span>
              </button>
            </div>
          );
        })}
        {brainGrossAnatomy && showAdvancedCollections && onSelectCollection && <AdvancedCollectionCards nodes={nodes} selectedId={selectedCollectionId} onSelect={onSelectCollection} onSetVisibility={onSetVisibility} collections={[LIMBIC_ATLAS_COLLECTION, BASAL_FOREBRAIN_ATLAS_COLLECTION, VENTRICULAR_ATLAS_COLLECTION]} />}
        {showAdvancedCollections && onSelectCollection && (
          <AdvancedCollectionCards nodes={nodes} selectedId={selectedCollectionId} onSelect={onSelectCollection} onSetVisibility={onSetVisibility} excludedNeuroanatomyGroupIds={excludedNeuroanatomyGroupIds} />
        )}
      </div>}
    </nav>
  );
}