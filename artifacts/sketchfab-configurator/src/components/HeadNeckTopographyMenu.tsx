import { FocusedNerveMenu, type FocusedMenuConfig, type FocusedNerveMenuProps } from './FocusedNerveMenu';
import { HEAD_NECK_TOPOGRAPHY_ROOT } from '../data/headNeckTopography';
import { HEAD_TOPOGRAPHY_GROUPS, headTopographyPathForGroup } from '../data/headTopography';

const config: FocusedMenuConfig = {
  groups: HEAD_TOPOGRAPHY_GROUPS,
  rootPath: HEAD_NECK_TOPOGRAPHY_ROOT,
  pathForGroup: headTopographyPathForGroup,
  testPrefix: 'head-neck',
  stripLabel: 'Head regions',
  defaultSystemLabel: 'Head',
  heading: 'HEAD',
  browseLabel: 'Browse head regions',
  searchAllPlaceholder: 'Search nerves, vessels, muscles, bones and glands…',
  searchAllScope: 'head',
  description: () => 'Explore the head by region, including its nerves, vessels, muscles, bones and glands. Only modeled structures are shown; whole meshes are not clipped at boundaries.',
  preserveMaterials: true,
};

export function HeadNeckTopographyMenu(props: FocusedNerveMenuProps) {
  return <FocusedNerveMenu {...props} config={config} />;
}
