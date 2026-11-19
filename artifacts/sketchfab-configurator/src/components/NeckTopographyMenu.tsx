import { FocusedNerveMenu, type FocusedMenuConfig, type FocusedNerveMenuProps } from './FocusedNerveMenu';
import { NECK_TOPOGRAPHY_GROUPS, NECK_TOPOGRAPHY_ROOT, neckTopographyPathForGroup } from '../data/neckTopography';

const config: FocusedMenuConfig = {
  groups: NECK_TOPOGRAPHY_GROUPS, rootPath: NECK_TOPOGRAPHY_ROOT,
  pathForGroup: neckTopographyPathForGroup, testPrefix: 'neck', stripLabel: 'Neck regions',
  defaultSystemLabel: 'Neck', heading: 'NECK', browseLabel: 'Browse neck regions',
  searchAllPlaceholder: 'Search neck muscles, nerves, vessels and landmarks…',
  searchAllScope: 'neck', description: () => '', preserveMaterials: true,
};
export function NeckTopographyMenu(props: FocusedNerveMenuProps) {
  return <FocusedNerveMenu {...props} config={config} />;
}
