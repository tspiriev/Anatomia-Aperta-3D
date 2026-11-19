import { AUTONOMIC_GROUPS, AUTONOMIC_ROOT_PATH, autonomicPathForGroup } from '../data/autonomicTaxonomy';
import { FocusedNerveMenu, type FocusedMenuConfig, type FocusedNerveMenuProps } from './FocusedNerveMenu';

const CONFIG: FocusedMenuConfig = {
  groups: AUTONOMIC_GROUPS,
  rootPath: AUTONOMIC_ROOT_PATH,
  pathForGroup: autonomicPathForGroup,
  testPrefix: 'autonomic',
  initialExpanded: [[...AUTONOMIC_ROOT_PATH, 'parasympathetic', 'vagus'].join('/')],
  stripLabel: 'Autonomic nervous system categories',
  defaultSystemLabel: 'Autonomic nervous system',
  heading: 'AUTONOMIC NERVOUS SYSTEM',
  browseLabel: 'Browse autonomic categories',
  searchAllPlaceholder: 'Search autonomic structures…',
  searchAllScope: 'the autonomic nervous system',
  description: () => '',
};

/** Five autonomic categories with subgroups; reuses the shared focused menu. */
export function AutonomicNerveMenu(props: FocusedNerveMenuProps) {
  return <FocusedNerveMenu {...props} config={CONFIG} />;
}
