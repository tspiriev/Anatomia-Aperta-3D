import {
  THALAMUS_CAPSULE_ROOT_PATH, THALAMUS_CAPSULE_GROUPS, thalamusCapsulePathForGroup,
} from '../data/thalamusCapsuleTaxonomy';
import { FocusedNerveMenu, type FocusedMenuConfig, type FocusedNerveMenuProps } from './FocusedNerveMenu';

const config: FocusedMenuConfig = {
  groups: THALAMUS_CAPSULE_GROUPS,
  rootPath: THALAMUS_CAPSULE_ROOT_PATH,
  pathForGroup: thalamusCapsulePathForGroup,
  testPrefix: 'thalamus-capsule',
  preserveMaterials: true,
  stripLabel: 'Thalamus, internal capsule and thalamocortical pathway categories',
  defaultSystemLabel: 'Thalamus and internal capsule',
  heading: 'THALAMUS, INTERNAL CAPSULE AND THALAMOCORTICAL PATHWAYS',
  browseLabel: 'Browse thalamic structures',
  searchAllPlaceholder: 'Search nuclei, capsule and pathways…',
  searchAllScope: 'thalamus, internal capsule and thalamocortical pathways',
  description: () => '',
};

/** Thalamus, internal capsule and thalamocortical pathways; reuses the shared focused menu. */
export function ThalamusCapsuleMenu(props: FocusedNerveMenuProps) {
  return <FocusedNerveMenu {...props} config={config} />;
}
