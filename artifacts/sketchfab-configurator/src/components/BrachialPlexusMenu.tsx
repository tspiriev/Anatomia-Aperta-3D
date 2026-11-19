import { useMemo, useState } from 'react';
import type { SceneNode } from '../types/sketchfab';
import { BRACHIAL_GROUPS, BRACHIAL_ROOT_PATH, brachialPathForGroup } from '../data/brachialPlexusTaxonomy';
import { BRACHIAL_ROOT_LEVELS, withBrachialRootContributions } from '../data/brachialRootContributions';
import { FocusedNerveMenu, type FocusedMenuConfig, type FocusedNerveMenuProps } from './FocusedNerveMenu';

export type BrachialSide = 'both' | 'left' | 'right';
const MUSCLE_SEGMENT = 'with-muscles';

/** Remove trailing side / muscle modifiers so the shared tree compares plain taxonomy paths. */
function stripModifiers(path: readonly string[] | null): readonly string[] | null {
  if (!path) return path;
  return path.filter(part => !['left', 'right', MUSCLE_SEGMENT].includes(part));
}
const isCordsPath = (path: readonly string[] | null) => !!path && path.some((p) => /cords?$/i.test(p));

/** Brachial plexus (C5–T1) teaching view with side filter and optional cord muscle context. */
export function BrachialPlexusMenu(props: FocusedNerveMenuProps & {
  brachialSide?: BrachialSide;
  onBrachialSideChange?: (side: BrachialSide) => void;
  brachialCordMuscles?: boolean;
  onBrachialCordMusclesChange?: (enabled: boolean) => void;
}) {
  const { onActivateNerve, activeNerveId, isolatedRegionPath, onIsolateRegion, disabled, variant } = props;
  const labeledNodes = useMemo(() => withBrachialRootContributions(props.nodes), [props.nodes]);
  const [localSide, setLocalSide] = useState<BrachialSide>('both');
  const [localCordMuscles, setLocalCordMuscles] = useState(true);
  const side = props.brachialSide ?? localSide;
  const cordMuscles = props.brachialCordMuscles ?? localCordMuscles;
  const setSide = props.onBrachialSideChange ?? setLocalSide;
  const setCordMuscles = props.onBrachialCordMusclesChange ?? setLocalCordMuscles;

  const withSide = (path: readonly string[], s: BrachialSide) => (s === 'both' ? [...path] : [...path, s]);
  const request = (path: readonly string[], s: BrachialSide, muscles: boolean) => {
    const base = withSide(stripModifiers(path) ?? path, s);
    return muscles && isCordsPath(path) ? [...base, MUSCLE_SEGMENT] : base;
  };

  const pathForGroup = useMemo(() => (node: SceneNode, path: readonly string[]) =>
    stripModifiers(brachialPathForGroup(node, request(path, side, cordMuscles))), [side, cordMuscles]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentPath = (): readonly string[] | null =>
    stripModifiers(isolatedRegionPath) ?? (activeNerveId ? activeNerveId.split('/') : null);

  const changeSide = (s: BrachialSide) => {
    setSide(s);
    const cur = currentPath();
    if (cur) onActivateNerve(request(cur, s, cordMuscles));
  };
  const toggleMuscles = () => {
    const next = !cordMuscles;
    setCordMuscles(next);
    const cur = currentPath();
    if (cur && isCordsPath(cur)) onActivateNerve(request(cur, side, next));
  };

  const fullscreen = variant === 'fullscreen';
  const btn = (active: boolean) => `flex-1 min-h-9 rounded border px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-40 focus-visible:outline focus-visible:outline-primary ${active
    ? 'border-primary/60 bg-primary/15 text-primary'
    : fullscreen ? 'border-white/20 text-white/70 hover:bg-white/10' : 'border-sidebar-border text-muted-foreground hover:text-foreground'}`;

  const toolbar = (
    <div className={`space-y-2 rounded-md border p-2 ${fullscreen ? 'border-white/10' : 'border-sidebar-border'}`} data-testid="brachial-filters">
      <div role="group" aria-label="Body side" className="flex gap-1">
        {(['left', 'both', 'right'] as const).map((s) => (
          <button key={s} type="button" disabled={disabled} aria-pressed={side === s} onClick={() => changeSide(s)}
            data-testid={`button-brachial-side-${s}`} className={btn(side === s)}>
            {s === 'both' ? 'Both' : s === 'left' ? 'Left' : 'Right'}
          </button>
        ))}
      </div>
      {activeNerveId?.endsWith('/roots') && (
        <div className="space-y-1" data-testid="brachial-root-levels">
          <p className="text-[11px] font-medium">Plexus root levels</p>
          <div className="flex flex-wrap gap-1" aria-label="Plexus roots C5, C6, C7, C8, T1">
            {BRACHIAL_ROOT_LEVELS.map(root => (
              <span key={root} className="rounded border px-2 py-1 text-[11px]">{root}</span>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">One fused roots mesh per side—not five separate model selections.</p>
        </div>
      )}
      <button type="button" disabled={disabled} aria-pressed={cordMuscles} onClick={toggleMuscles}
        data-testid="button-brachial-cord-muscles" className={`w-full ${btn(cordMuscles)}`}>
        Cords: muscle context {cordMuscles ? 'on' : 'off'}
      </button>
    </div>
  );

  const config: FocusedMenuConfig = {
    groups: BRACHIAL_GROUPS,
    rootPath: BRACHIAL_ROOT_PATH,
    pathForGroup,
    testPrefix: 'brachial',
    stripLabel: 'Brachial plexus sections',
    defaultSystemLabel: 'Brachial plexus',
    heading: 'BRACHIAL PLEXUS',
    browseLabel: 'Browse brachial plexus sections',
    searchAllPlaceholder: 'Search brachial plexus structures…',
    searchAllScope: 'the brachial plexus',
    description: () => '',
    toolbar,
  };

  return (
    <FocusedNerveMenu {...props}
      nodes={labeledNodes}
      config={config}
      isolatedRegionPath={stripModifiers(isolatedRegionPath)}
      onActivateNerve={(path) => onActivateNerve(request(path, side, cordMuscles))}
      onIsolateRegion={(path) => onIsolateRegion(request(path, side, cordMuscles))}
    />
  );
}
