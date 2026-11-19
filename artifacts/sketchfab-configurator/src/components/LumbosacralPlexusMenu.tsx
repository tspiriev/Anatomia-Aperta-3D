import { useMemo, useState } from 'react';
import type { SceneNode } from '../types/sketchfab';
import {
  LUMBOSACRAL_ROOT_PATH, lumbosacralGroupsForNodes,
  lumbosacralPathForGroup, withLumbosacralRootContributions,
} from '../data/lumbosacralPlexusTaxonomy';
import { FocusedNerveMenu, type FocusedMenuConfig, type FocusedNerveMenuProps } from './FocusedNerveMenu';

export type LumbosacralSide = 'both' | 'left' | 'right';
const NO_MUSCLES = 'without-muscles';

/** Remove side / muscle modifiers so the shared tree compares plain taxonomy paths. */
function stripModifiers(path: readonly string[] | null): readonly string[] | null {
  if (!path) return path;
  return path.filter(part => !['left', 'right', NO_MUSCLES].includes(part));
}

/** Lumbosacral plexus and cauda equina view with side filter and optional muscle context. */
export function LumbosacralPlexusMenu(props: FocusedNerveMenuProps & {
  lumbosacralSide?: LumbosacralSide;
  onLumbosacralSideChange?: (side: LumbosacralSide) => void;
  lumbosacralMuscles?: boolean;
  onLumbosacralMusclesChange?: (enabled: boolean) => void;
}) {
  const { onActivateNerve, activeNerveId, isolatedRegionPath, onIsolateRegion, disabled, variant } = props;
  const labeledNodes = useMemo(() => withLumbosacralRootContributions(props.nodes), [props.nodes]);
  const groups = useMemo(() => lumbosacralGroupsForNodes(props.nodes), [props.nodes]);
  const [localSide, setLocalSide] = useState<LumbosacralSide>('both');
  const [localMuscles, setLocalMuscles] = useState(true);
  const side = props.lumbosacralSide ?? localSide;
  const muscles = props.lumbosacralMuscles ?? localMuscles;
  const setSide = props.onLumbosacralSideChange ?? setLocalSide;
  const setMuscles = props.onLumbosacralMusclesChange ?? setLocalMuscles;

  const request = (path: readonly string[], s: LumbosacralSide, m: boolean) => {
    const base = [...(stripModifiers(path) ?? path)];
    if (s !== 'both') base.push(s);
    if (!m || base[2] === 'cauda-equina') base.push(NO_MUSCLES);
    return base;
  };

  const pathForGroup = useMemo(() => (node: SceneNode, path: readonly string[]) =>
    stripModifiers(lumbosacralPathForGroup(node, request(path, side, muscles))), [side, muscles]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentPath = (): readonly string[] | null =>
    stripModifiers(isolatedRegionPath) ?? (activeNerveId ? activeNerveId.split('/') : null);
  const isCaudaEquina = currentPath()?.[2] === 'cauda-equina';

  const changeSide = (s: LumbosacralSide) => {
    setSide(s);
    const cur = currentPath();
    if (cur) onActivateNerve(request(cur, s, muscles));
  };
  const toggleMuscles = () => {
    const next = !muscles;
    setMuscles(next);
    const cur = currentPath();
    if (cur) onActivateNerve(request(cur, side, next));
  };

  const fullscreen = variant === 'fullscreen';
  const btn = (active: boolean) => `flex-1 min-h-9 rounded border px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-40 focus-visible:outline focus-visible:outline-primary ${active
    ? 'border-primary/60 bg-primary/15 text-primary'
    : fullscreen ? 'border-white/20 text-white/70 hover:bg-white/10' : 'border-sidebar-border text-muted-foreground hover:text-foreground'}`;
  const note = `text-[10px] leading-relaxed ${fullscreen ? 'text-white/55' : 'text-muted-foreground'}`;

  const toolbar = (
    <div className={`space-y-2 rounded-md border p-2 ${fullscreen ? 'border-white/10' : 'border-sidebar-border'}`} data-testid="lumbosacral-filters">
      <div role="group" aria-label="Body side" className="flex gap-1">
        {(['both', 'left', 'right'] as const).map((s) => (
          <button key={s} type="button" disabled={disabled} aria-pressed={side === s} onClick={() => changeSide(s)}
            data-testid={`button-lumbosacral-side-${s}`} className={btn(side === s)}>
            {s === 'both' ? 'Both' : s === 'left' ? 'Left' : 'Right'}
          </button>
        ))}
      </div>
      <p className={note}>Left and Right show explicitly side-labeled meshes. Unpaired or ambiguous anatomy is available only in Both.</p>
      {!isCaudaEquina && (
        <>
          <button type="button" disabled={disabled} aria-pressed={muscles} onClick={toggleMuscles}
            data-testid="button-lumbosacral-muscles" className={`w-full ${btn(muscles)}`}>
            Muscle context {muscles ? 'on' : 'off'}
          </button>
          <p className={note}>Muscles are semitransparent context; nerves remain opaque. Muscles not exported separately cannot be shown on their own.</p>
        </>
      )}
    </div>
  );

  const config: FocusedMenuConfig = {
    groups,
    rootPath: LUMBOSACRAL_ROOT_PATH,
    pathForGroup,
    testPrefix: 'lumbosacral',
    stripLabel: 'Lumbosacral plexus sections',
    defaultSystemLabel: 'Lumbosacral plexus',
    heading: 'LUMBOSACRAL PLEXUS',
    browseLabel: 'Browse lumbosacral plexus sections',
    searchAllPlaceholder: 'Search lumbosacral plexus structures…',
    searchAllScope: 'the lumbosacral plexus',
    description: () => '',
    toolbar,
  };

  return (
    <FocusedNerveMenu {...props}
      nodes={labeledNodes}
      config={config}
      isolatedRegionPath={stripModifiers(isolatedRegionPath)}
      onActivateNerve={(path) => onActivateNerve(request(path, side, muscles))}
      onIsolateRegion={(path) => onIsolateRegion(request(path, side, muscles))}
    />
  );
}
