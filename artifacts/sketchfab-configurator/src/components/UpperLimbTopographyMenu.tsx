import { useMemo } from 'react';
import { FocusedNerveMenu, type FocusedNerveMenuProps, type FocusedMenuConfig } from './FocusedNerveMenu';
import { upperLimbGroupsForNodes, UPPER_LIMB_TOPOGRAPHY_ROOT, upperLimbPathForGroup,
  type UpperLimbSide } from '../data/upperLimbRegionalAtlas';

export interface UpperLimbTopographyMenuProps extends FocusedNerveMenuProps {
  upperLimbSide?: UpperLimbSide;
  onUpperLimbSideChange?: (side: UpperLimbSide) => void;
  upperLimbMuscles?: boolean;
  onUpperLimbMusclesChange?: (show: boolean) => void;
}

export function UpperLimbTopographyMenu({
  upperLimbSide = 'both', onUpperLimbSideChange,
  upperLimbMuscles = false, onUpperLimbMusclesChange, ...props
}: UpperLimbTopographyMenuProps) {
  const groups = useMemo(() => upperLimbGroupsForNodes(props.nodes), [props.nodes]);
  const config = useMemo<FocusedMenuConfig>(() => ({
    groups, rootPath: UPPER_LIMB_TOPOGRAPHY_ROOT,
    pathForGroup: (node, path) => upperLimbPathForGroup(node, path, upperLimbSide),
    testPrefix: 'upper-limb', stripLabel: 'Upper limb regions',
    defaultSystemLabel: 'Upper limb', heading: 'UPPER LIMB',
    browseLabel: 'Browse upper limb regions',
    searchAllPlaceholder: 'Search bones, muscles, capsules, ligaments, sheaths and nerves…',
    searchAllScope: 'upper limb',
    description: () => 'The musculoskeletal upper-limb topography, with the existing brachial-plexus nerve organisation and regional arteries and veins. Combined regions show all available tissues, not nerves alone. Crossing structures remain whole meshes. The ambiguously named Subclavian nerve.l.r is available in Bilateral only. Shoulder source limitations: omohyoid is absent from the supplied export; levator scapulae is supplied on the left only.',
    toolbar: (
      <div className="space-y-2" data-testid="upper-limb-controls">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Upper limb side">
          {([['both', 'Bilateral'], ['left', 'Left'], ['right', 'Right']] as const).map(([side, label]) => (
            <button key={side} type="button" aria-pressed={upperLimbSide === side}
              disabled={props.disabled || !onUpperLimbSideChange}
              onClick={() => onUpperLimbSideChange?.(side)}
              data-testid={`upper-limb-side-${side}`}
              className={`min-h-10 lg:min-h-8 rounded border px-3 text-xs disabled:opacity-50 ${upperLimbSide === side ? 'border-primary/50 bg-primary/15 text-primary' : 'border-sidebar-border text-muted-foreground hover:bg-sidebar-accent'}`}>
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={upperLimbMuscles}
            disabled={props.disabled || !onUpperLimbMusclesChange}
            onChange={event => onUpperLimbMusclesChange?.(event.target.checked)}
            data-testid="upper-limb-transparent-muscles" />
          Transparent surrounding muscles
        </label>
      </div>
    ),
  }), [groups, upperLimbSide, upperLimbMuscles, onUpperLimbSideChange, onUpperLimbMusclesChange, props.disabled]);
  return <FocusedNerveMenu {...props} config={config} />;
}
