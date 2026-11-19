import {
  THALAMUS_CAPSULE_GROUPS, isThalamusCapsuleCortexNode,
} from '../data/thalamusCapsuleTaxonomy';
import type { SceneNode } from '../types/sketchfab';
import { basalWholeBrainDisplay } from './basalWholeBrain';

/** Only the three overview selections; all advanced subdivisions stay segmented. */
export const isThalamusBrainOverviewPath = (path: readonly string[]) =>
  THALAMUS_CAPSULE_GROUPS.some(group => group.id === path.join('/'));

export const thalamusWholeBrainDisplay = (nodes: readonly SceneNode[], path: readonly string[]) =>
  basalWholeBrainDisplay(nodes, isThalamusBrainOverviewPath(path), isThalamusCapsuleCortexNode);
