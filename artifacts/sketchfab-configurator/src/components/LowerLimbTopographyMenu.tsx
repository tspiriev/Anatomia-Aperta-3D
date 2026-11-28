import { useMemo } from 'react';
import { FocusedNerveMenu, type FocusedNerveMenuProps, type FocusedMenuConfig } from './FocusedNerveMenu';
import { LOWER_LIMB_TOPOGRAPHY_GROUPS, LOWER_LIMB_TOPOGRAPHY_ROOT, lowerLimbPathForGroup,
  type LowerLimbSide } from '../data/lowerLimbTopography';

export interface LowerLimbTopographyMenuProps extends FocusedNerveMenuProps {
  lowerLimbSide?: LowerLimbSide;
  onLowerLimbSideChange?: (side: LowerLimbSide) => void;
}

export function LowerLimbTopographyMenu({
  lowerLimbSide = 'both', onLowerLimbSideChange, ...props
}: LowerLimbTopographyMenuProps) {
  const config = useMemo<FocusedMenuConfig>(() => ({
    groups: LOWER_LIMB_TOPOGRAPHY_GROUPS, rootPath: LOWER_LIMB_TOPOGRAPHY_ROOT,
    pathForGroup: (node, path) => lowerLimbPathForGroup(node, path, lowerLimbSide),
    testPrefix: 'lower-limb', stripLabel: 'Lower limb regions',
    defaultSystemLabel: 'Lower limb', heading: 'LOWER LIMB',
    browseLabel: 'Browse lower limb regions',
    searchAllPlaceholder: 'Search bones, muscles, ligaments, vessels and nerves…',
    searchAllScope: 'lower limb',
    description: () => '',
    toolbar: (
      <div className="space-y-2" data-testid="lower-limb-controls">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Lower limb side">
          {([['both', 'Bilateral'], ['left', 'Left'], ['right', 'Right']] as const).map(([side, label]) => (
            <button key={side} type="button" aria-pressed={lowerLimbSide === side}
              disabled={props.disabled || !onLowerLimbSideChange}
              onClick={() => onLowerLimbSideChange?.(side)}
              data-testid={`lower-limb-side-${side}`}
              className={`min-h-10 lg:min-h-8 rounded border px-3 text-xs disabled:opacity-50 ${lowerLimbSide === side ? 'border-primary/50 bg-primary/15 text-primary' : 'border-sidebar-border text-muted-foreground hover:bg-sidebar-accent'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    ),
  }), [lowerLimbSide, onLowerLimbSideChange, props.disabled]);
  return <FocusedNerveMenu {...props} config={config} />;
}
