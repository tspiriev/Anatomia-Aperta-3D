import { useMemo } from 'react';
import { FocusedNerveMenu, type FocusedMenuConfig, type FocusedNerveMenuProps } from './FocusedNerveMenu';
import {
  TEMPORAL_ASSOCIATION_GROUPS, TEMPORAL_ASSOCIATION_ROOT_PATH,
  temporalAssociationPathForGroup,
} from '../data/temporalAssociationTaxonomy';

export function TemporalAssociationMenu(props: FocusedNerveMenuProps) {
  const config = useMemo<FocusedMenuConfig>(() => ({
    groups: TEMPORAL_ASSOCIATION_GROUPS,
    rootPath: TEMPORAL_ASSOCIATION_ROOT_PATH,
    pathForGroup: temporalAssociationPathForGroup,
    testPrefix: 'temporal-association',
    preserveMaterials: true,
    stripLabel: 'Temporal stem, sagittal stratum, association fiber and temporal lobe categories',
    defaultSystemLabel: 'Temporal Stem, Sagittal Stratum and Association Fibers',
    heading: 'TEMPORAL STEM, SAGITTAL STRATUM AND ASSOCIATION FIBERS',
    browseLabel: 'Browse temporal anatomy and association fibers',
    searchAllPlaceholder: 'Search fibers, temporal structures and nuclei…',
    searchAllScope: 'temporal stem, sagittal stratum, association fibers and temporal lobe',
    description: () => '',
  }), []);
  return <FocusedNerveMenu {...props} config={config} />;
}
