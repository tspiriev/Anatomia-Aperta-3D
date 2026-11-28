import { useMemo } from 'react';
import { FocusedNerveMenu, type FocusedMenuConfig, type FocusedNerveMenuProps } from './FocusedNerveMenu';
import { BRAINSTEM_CEREBELLUM_GROUPS, BRAINSTEM_CEREBELLUM_ROOT,
  brainstemCerebellumPathForGroup, brainstemCerebellumGroupsForNodes } from '../data/brainstemCerebellumAtlas';

const config: FocusedMenuConfig = {
  groups: BRAINSTEM_CEREBELLUM_GROUPS, rootPath: BRAINSTEM_CEREBELLUM_ROOT,
  pathForGroup: brainstemCerebellumPathForGroup, testPrefix: 'brainstem-cerebellum',
  preserveMaterials: true,
  startsCollapsed: true,
  stripLabel: 'Brainstem and cerebellum collections',
  defaultSystemLabel: 'Brainstem and cerebellum',
  heading: 'BRAINSTEM AND CEREBELLUM', browseLabel: 'Browse brainstem and cerebellar anatomy',
  searchAllPlaceholder: 'Search nuclei, tracts and gross anatomy…',
  searchAllScope: 'brainstem and cerebellum',
  description: (_fullscreen, active) => active?.endsWith('/cerebellum')
    ? 'The dentatorubral limb uses the complete modeled dentatorubrothalamic mesh. Connections and laterality remain as modeled; source fibers are not artificially split.'
    : '',
};
export function BrainstemCerebellumMenu(props: FocusedNerveMenuProps) {
  const liveConfig = useMemo(() => ({ ...config, groups: brainstemCerebellumGroupsForNodes(props.nodes) }), [props.nodes]);
  return <FocusedNerveMenu {...props} config={liveConfig} />;
}
