import { normalizeAdvancedObjectName } from './advancedCollection';
import { basalForebrainContextPath } from './basalForebrainTaxonomy';
import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';
import { classifyDiencephalonObject, DIENCEPHALON_GROUP } from './diencephalonTaxonomy';
import { classifyVentricularObject, VENTRICULAR_GROUP } from './ventricularTaxonomy';
import { brachialUpperLimbBonePath } from './brachialTerminalAnatomy';

export const BRACHIAL_WHOLE_BRAIN_NAME = 'Whole brain — supratentorial, infratentorial and brainstem (semitransparent)';
const wholeBrainAliases = new Set([
  BRACHIAL_WHOLE_BRAIN_NAME, 'Whole brain', 'Brain', 'Supratentorial brain', 'Infratentorial brain',
  'Cerebrum', 'Cerebral hemisphere', 'Cerebral hemispheres', 'Cerebellum', 'Brainstem',
  'Frontal lobe', 'Parietal lobe', 'Occipital lobe', 'Temporal lobe', 'Insular lobe',
  'Midbrain', 'Pons', 'Medulla oblongata', 'Cerebellar hemisphere', 'Vermis',
].map(normalizeAdvancedObjectName));
const cordNames = new Set([
  'Spinal cord', 'White matter of spinal cord', 'Gray matter of spinal cord', 'Grey matter of spinal cord',
  'Anterior horn of spinal cord', 'Posterior horn of spinal cord', 'Lateral horn of spinal cord',
  'Lateral intermediate substance', 'Intermediolateral nucleus', 'Intermediomedial nucleus',
].map(normalizeAdvancedObjectName));
const tractNames = new Set([
  'Anterior corticospinal tract', 'Lateral corticospinal tract', 'Corticospinal tract arm',
].map(normalizeAdvancedObjectName));

export function brachialOverviewDetailPath(rawName: string): readonly string[] | null {
  const bones = brachialUpperLimbBonePath(rawName);
  if (bones) return bones;
  const key = normalizeAdvancedObjectName(rawName);
  if (['precentral gyrus', 'gyrus precentralis'].includes(key)) return ['precentral'];
  const deep = classifyDiencephalonObject(rawName);
  if (deep?.[2] === 'basal-ganglia') return ['basal-ganglia', ...deep.slice(3)];
  if (deep?.[2] === 'subthalamic') return ['basal-ganglia', 'subthalamic'];
  if (key === 'nucleus accumbens') return ['basal-ganglia', 'accumbens'];
  const ventricular = classifyVentricularObject(rawName);
  if (ventricular) return ['ventricular-system', ...ventricular.slice(2)];
  return null;
}
function rebase(group: NervousGroup, from: string, to: string): NervousGroup {
  return { ...group, id: group.id.replace(from, to),
    ...(group.children ? { children: group.children.map(child => rebase(child, from, to)) } : {}) };
}
const overviewPrefix = 'advanced-neuroanatomy/brachial-plexus/overview';
const basalGroup = DIENCEPHALON_GROUP.children!.find(group => group.id.endsWith('/basal-ganglia'))!;
export const BRACHIAL_OVERVIEW_BASAL_GROUPS: NervousGroup[] = [
  ...basalGroup.children!.map(group => rebase(group, basalGroup.id, `${overviewPrefix}/basal-ganglia`)),
  { id: `${overviewPrefix}/basal-ganglia/subthalamic`, label: 'Subthalamic nuclei' },
  { id: `${overviewPrefix}/basal-ganglia/accumbens`, label: 'Nuclei accumbens' },
];
export const BRACHIAL_OVERVIEW_VENTRICULAR_GROUPS = VENTRICULAR_GROUP.children
  .filter(group => !group.id.endsWith('/context'))
  .map(group => rebase(group, VENTRICULAR_GROUP.id, `${overviewPrefix}/ventricular-system`));

const ribNumber = '(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|[1-9]|1[0-2])';
const rib = new RegExp(`^(?:${ribNumber} rib|rib (?:[1-9]|1[0-2]))$`);
const cartilage = new RegExp(`^(?:costal cartilage(?: of ${ribNumber} rib| (?:[1-9]|1[0-2]))?)$`);
export function brachialThoracicCagePath(rawName: string): readonly string[] | null {
  const key = normalizeAdvancedObjectName(rawName);
  if (rib.test(key) || ['ribs', 'thoracic cage', 'rib cage'].includes(key)) return ['thoracic-cage', 'ribs'];
  if (cartilage.test(key)) return ['thoracic-cage', 'cartilages'];
  if (['sternum', 'body of sternum', 'manubrium of sternum', 'manubrium', 'xiphoid process'].includes(key)) return ['thoracic-cage', 'sternum'];
  if (/^vertebra (?:t|th)(?:[1-9]|1[0-2])$/.test(key)) return ['thoracic-cage', 'thoracic-spine'];
  return null;
}
export function isBrachialWholeBrainName(rawName: string): boolean {
  const key = normalizeAdvancedObjectName(rawName);
  if (brachialOverviewDetailPath(rawName)) return false;
  // Reuse the reviewed gross surfaces, not internal nuclei, capsules or fibers.
  return wholeBrainAliases.has(key)
    || (!['thalamus', 'hypothalamus'].includes(key) && basalForebrainContextPath(rawName) !== null);
}
export function isBrachialWholeBrainNode(node: SceneNode): boolean {
  return (!node.systemId || node.systemId === 'nervous') && isBrachialWholeBrainName(node.rawName);
}
export function brachialOverviewPart(rawName: string): 'brain' | 'vertebrae' | 'spinal-cord' | 'tracts' | 'precentral' | 'basal-ganglia' | 'ventricular-system' | 'upper-limb-bones' | 'shoulder' | 'thoracic-cage' | null {
  const key = normalizeAdvancedObjectName(rawName);
  if (/^(?:vertebra c[1-7]|atlas(?: \(c1\))?|axis(?: \(c2\))?|vertebra (?:t|th)[12])$/.test(key)) return 'vertebrae';
  const detail = brachialOverviewDetailPath(rawName);
  if (detail) return detail[0] as 'precentral' | 'basal-ganglia' | 'ventricular-system' | 'upper-limb-bones';
  if (/^(?:(?:left|right) )?(?:scapula|clavicle)(?: (?:left|right))?$/.test(key)) return 'shoulder';
  if (brachialThoracicCagePath(rawName)) return 'thoracic-cage';
  if (cordNames.has(key)) return 'spinal-cord';
  if (tractNames.has(key)) return 'tracts';
  if (isBrachialWholeBrainName(rawName)) return 'brain';
  return null;
}
export function isBrachialOverviewContext(node: SceneNode): boolean {
  return ['brain', 'vertebrae', 'spinal-cord', 'shoulder', 'thoracic-cage', 'upper-limb-bones'].includes(brachialOverviewPart(node.rawName) ?? '');
}
export function isBrachialOverviewRetainedContext(node: SceneNode, path: readonly string[]): boolean {
  const side = path.find(part => part === 'left' || part === 'right');
  const part = brachialOverviewPart(node.rawName);
  if (side && ['shoulder', 'thoracic-cage', 'upper-limb-bones'].includes(part ?? '')) {
    const raw = node.rawName.toLowerCase();
    const suffix = raw.match(/\.([lr])(?=[._]|$)/)?.[1];
    const ownSide = suffix === 'l' ? 'left' : suffix === 'r' ? 'right'
      : raw.match(/^(left|right)\b|\b(left|right)$/)?.filter(Boolean).at(-1);
    if (ownSide && ownSide !== side) return false;
  }
  return path[0] === 'advanced-neuroanatomy' && path[1] === 'brachial-plexus'
    && path[2] === 'overview' && ['plexus', 'tracts', 'precentral', 'basal-ganglia', 'ventricular-system'].includes(path[3])
    && isBrachialOverviewContext(node);
}
export function isBrachialRootsRetainedContext(node: SceneNode, path: readonly string[]): boolean {
  return path[0] === 'advanced-neuroanatomy' && path[1] === 'brachial-plexus'
    && path[2] === 'roots' && path.length > 3 && path[3] !== 'vertebrae'
    && (!node.systemId || node.systemId === 'skeletal')
    && brachialOverviewPart(node.rawName) === 'vertebrae';
}
