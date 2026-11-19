import { useMemo } from 'react';
import {
  LONG_TRACT_ROOT_PATH, longTractPathForGroup, longTractSourceNote, longTractMenuGroups,
} from '../data/longTractTaxonomy';
import { FocusedNerveMenu, type FocusedMenuConfig, type FocusedNerveMenuProps } from './FocusedNerveMenu';

const pathOf = (isolated: readonly string[] | null, activeId: string | null): readonly string[] | null =>
  isolated && isolated.length ? isolated : activeId ? activeId.split('/') : null;

const baseDescription = (fullscreen: boolean, activeId: string | null) => fullscreen
  ? 'Choose a pathway, then show, hide, or isolate its components.'
  : !activeId ? 'The full model is shown. Choose a pathway system above to open its custom view.'
  : 'Selecting a pathway shows its available origin, fiber and target meshes together.';

/** Long tracts and brainstem–cerebellar pathways; reuses the shared focused menu. */
export function LongTractMenu(props: FocusedNerveMenuProps) {
  const { isolatedRegionPath, activeNerveId } = props;
  const active = pathOf(isolatedRegionPath, activeNerveId);
  const note = active ? longTractSourceNote(active) : '';
  const menuGroups = useMemo(() => longTractMenuGroups(props.nodes), [props.nodes]);

  const config = useMemo<FocusedMenuConfig>(() => ({
    groups: menuGroups,
    rootPath: LONG_TRACT_ROOT_PATH,
    pathForGroup: longTractPathForGroup,
    testPrefix: 'long-tracts',
    preserveMaterials: true,
    stripLabel: 'Long tract and brainstem–cerebellar pathway categories',
    defaultSystemLabel: 'Long tracts and brainstem–cerebellar pathways',
    heading: 'LONG TRACTS AND BRAINSTEM–CEREBELLAR PATHWAYS',
    browseLabel: 'Browse pathway systems',
    searchAllPlaceholder: 'Search pathway structures…',
    searchAllScope: 'long tracts and brainstem–cerebellar pathways',
    description: (fullscreen, activeId) => {
      const base = baseDescription(fullscreen, activeId);
      return note ? `${base} ${note}` : base;
    },
  }), [note, menuGroups]);

  return <FocusedNerveMenu {...props} config={config} />;
}
