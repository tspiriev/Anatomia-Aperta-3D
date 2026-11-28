import { useMemo } from 'react';
import { FocusedNerveMenu, type FocusedMenuConfig, type FocusedNerveMenuProps } from './FocusedNerveMenu';
import {
  MUSCULOSKELETAL_GROUPS, MUSCULOSKELETAL_ROOT_PATH,
  cleanMusculoskeletalPath, musculoskeletalPathForGroup,
} from '../data/musculoskeletalTaxonomy';
import type { BrachialSide } from './BrachialPlexusMenu';

/** The dedicated skeleton menu owns tissue-only browsing. Back exposes muscle
 * layers and fasciae directly, retaining the optional attachment controls. */
export const MUSCULOSKELETAL_MENU_GROUPS = MUSCULOSKELETAL_GROUPS.map(group =>
  group.id === [...MUSCULOSKELETAL_ROOT_PATH, 'back'].join('/') ? {
    ...group,
    children: [
      ...(group.children?.find(child => child.id.endsWith('/muscles'))?.children ?? []),
      ...(group.children?.filter(child => child.id.endsWith('/fasciae')) ?? []),
      ...(group.children?.filter(child => child.id.endsWith('/attachments')) ?? []),
    ],
  } : group);

/** Back opens the approved combined reference, not fascia-covered regional
 * anatomy; other regions and explicit attachment requests are unchanged. */
export function musculoskeletalMenuRequest(path: readonly string[], side: BrachialSide = 'both'): string[] {
  const clean = cleanMusculoskeletalPath(path);
  const target = clean.length === 3 && clean[2] === 'back' ? [...clean, 'muscles'] : clean;
  return [...target, ...(side === 'both' ? [] : [`@side-${side}`])];
}

export function MusculoskeletalMenu(props: FocusedNerveMenuProps & {
  musculoskeletalSide?: BrachialSide;
  onMusculoskeletalSideChange?: (side: BrachialSide) => void;
  musculoskeletalAttachments?: boolean;
  onMusculoskeletalAttachmentsChange?: (enabled: boolean) => void;
}) {
  const side = props.musculoskeletalSide ?? 'both';
  const request = (path: readonly string[], nextSide = side) =>
    musculoskeletalMenuRequest(path, nextSide);
  const config = useMemo<FocusedMenuConfig>(() => ({
    groups: MUSCULOSKELETAL_MENU_GROUPS,
    rootPath: MUSCULOSKELETAL_ROOT_PATH,
    sidebarStartsCollapsed: true,
    initialExpanded: [
      ...[[], ['arm'], ['forearm'], ['hand']]
        .map(parts => [...MUSCULOSKELETAL_ROOT_PATH, 'upper-limb', 'topography', ...parts].join('/')),
      [...MUSCULOSKELETAL_ROOT_PATH, 'neck', 'bones'].join('/'),
      ...[[], ['anterior'], ['anterior', 'visceral'], ['lateral'], ['posterior']]
        .map(parts => [...MUSCULOSKELETAL_ROOT_PATH, 'neck', 'muscles', ...parts].join('/')),
      [...MUSCULOSKELETAL_ROOT_PATH, 'upper-limb', 'bones'].join('/'),
      ...[[], ['hip'], ['thigh'], ['leg'], ['leg', 'posterior'], ['foot'], ['foot', 'plantar']]
        .map(parts => [...MUSCULOSKELETAL_ROOT_PATH, 'lower-limb', 'muscles', ...parts].join('/')),
      ...[['superficial'], ['intermediate'], ['deep'], ['deep', 'erector-spinae'], ['deep', 'transversospinal'], ['deep', 'segmental']]
        .map(parts => [...MUSCULOSKELETAL_ROOT_PATH, 'back', 'muscles', ...parts].join('/')),
    ],
    pathForGroup: (node, path) => musculoskeletalPathForGroup(node, request(path)),
    testPrefix: 'musculoskeletal',
    stripLabel: 'Musculoskeletal regions',
    defaultSystemLabel: 'Musculoskeletal system',
    heading: 'MUSCULOSKELETAL SYSTEM',
    browseLabel: 'Browse musculoskeletal collections',
    searchAllPlaceholder: 'Search anatomical structures…',
    searchAllScope: 'musculoskeletal regions',
    description: () => '',
    toolbar: (
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <div className="flex gap-1" role="group" aria-label="Side">
          {(['both', 'left', 'right'] as const).map(value => <button key={value} type="button"
            disabled={props.disabled} aria-pressed={side === value} data-testid={`button-musculoskeletal-side-${value}`}
            className={`rounded border px-2 py-1 text-xs ${side === value ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
            onClick={() => {
              props.onMusculoskeletalSideChange?.(value);
              const current = props.isolatedRegionPath ?? props.activeNerveId?.split('/');
              if (current) props.onIsolateRegion(request(current, value));
            }}>{value === 'both' ? 'Bilateral' : value === 'left' ? 'Left' : 'Right'}</button>)}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" disabled={props.disabled} checked={props.musculoskeletalAttachments ?? false}
            data-testid="checkbox-musculoskeletal-selected-attachments"
            onChange={event => props.onMusculoskeletalAttachmentsChange?.(event.target.checked)} />
          Selected muscle attachments
        </label>
      </div>
    ),
  }), [side, props.disabled, props.musculoskeletalAttachments, props.isolatedRegionPath?.join('/'), props.activeNerveId,
    props.onMusculoskeletalSideChange, props.onMusculoskeletalAttachmentsChange, props.onIsolateRegion]);
  return <FocusedNerveMenu {...props} config={config}
    isolatedRegionPath={props.isolatedRegionPath ? cleanMusculoskeletalPath(props.isolatedRegionPath) : null}
    onActivateNerve={path => props.onActivateNerve(request(path))}
    onIsolateRegion={path => props.onIsolateRegion(request(path))} />;
}
