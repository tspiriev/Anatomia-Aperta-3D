import type { SystemGroupId } from './anatomicalSystems';
import type { NervousGroup } from './nervousTaxonomy';
import { NERVOUS_GROUPS } from './nervousTaxonomy';
import { VISCERA_GROUPS } from './visceraTaxonomy';
import { CARDIOVASCULAR_GROUPS } from './cardiovascularTaxonomy';
import { ATTACHMENT_GROUPS } from './attachmentTaxonomy';
import { MUSCULAR_GROUPS } from './muscularTaxonomy';
import { LYMPHATIC_GROUPS } from './lymphaticTaxonomy';
import { BRAIN_GROSS_ANATOMY_GROUP } from './brainGrossAnatomy';

type RegionMenu = {
  groups: readonly NervousGroup[];
  heading?: string;
  namespace: string;
};

// Normal and fullscreen navigation must use the same collection definitions.
const menus: Partial<Record<SystemGroupId, RegionMenu>> = {
  organs: { groups: VISCERA_GROUPS, heading: 'VISCERA', namespace: 'viscera' },
  vascular: { groups: CARDIOVASCULAR_GROUPS, heading: 'CARDIOVASCULAR SYSTEM', namespace: 'cardiovascular' },
  attachments: { groups: ATTACHMENT_GROUPS, heading: 'MUSCLE ATTACHMENTS', namespace: 'attachments' },
  muscular: { groups: MUSCULAR_GROUPS, heading: 'MUSCULAR SYSTEM', namespace: 'muscular' },
  nervous: { groups: NERVOUS_GROUPS, namespace: 'nervous' },
  lymphatic: { groups: LYMPHATIC_GROUPS, heading: 'LYMPHATIC SYSTEM', namespace: 'lymphatic' },
};

export function regionMenuForSystem(systemId: SystemGroupId, brainGrossAnatomy = false): RegionMenu | null {
  if (systemId === 'nervous' && brainGrossAnatomy) {
    return { groups: BRAIN_GROSS_ANATOMY_GROUP.children!, heading: 'BRAIN GROSS ANATOMY', namespace: 'brain-gross-anatomy' };
  }
  return menus[systemId] ?? null;
}
