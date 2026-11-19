import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';
import type { HeadNeckTissue } from './headNeckTopographyRegions';
import { skullBaseName } from './skullBaseSources';
import { SKULL_BASE_GROUPS, skullBasePathForGroup, skullBaseSystemForNode,
  skullBaseContextIds } from './skullBaseTaxonomy';
import { anteriorNeckSuperficialLayer, anteriorTriangleCervicalBone,
  isAnteriorTriangleBrainstem } from './headNeckAnteriorTriangle';
import { cervicalNerveName, headNeckCervicalNerveFamily, isCervicalAutonomicNerve } from './headNeckCervicalNerves';

export const LATERAL_NECK_ROOT = ['advanced-neuroanatomy', 'head-neck-topography', 'lateral-neck'];
export const FORAMEN_MAGNUM_SOURCE_PATH = ['advanced-neuroanatomy', 'skull-base', 'posterior-fossa', 'foramen-magnum'];
export const LATERAL_FORAMEN_MAGNUM_PATH = [...LATERAL_NECK_ROOT, 'occipital-triangle', 'foramen-magnum-reference'];
const reference = SKULL_BASE_GROUPS.find(g => g.id.endsWith('/posterior-fossa'))!
  .children!.find(g => g.id.endsWith('/foramen-magnum'))!;
function copyReference(group: NervousGroup): NervousGroup {
  return { ...group, id: group.id.replace(FORAMEN_MAGNUM_SOURCE_PATH.join('/'), LATERAL_FORAMEN_MAGNUM_PATH.join('/')),
    ...(group.children ? { children: group.children.map(copyReference) } : {}) };
}
export const LATERAL_FORAMEN_MAGNUM_GROUP = copyReference(reference);
const sceneNode = (rawName: string): SceneNode => ({
  rawName, name: rawName, instanceID: -1, visible: false, systemId: null, type: 'MatrixTransform',
});
const nameOf = (rawName: string) => cervicalNerveName(rawName).replace(/[()]/g, '').trim();

export function lateralForamenMagnumPath(
  node: Pick<SceneNode, 'rawName'>, requested: readonly string[] = LATERAL_FORAMEN_MAGNUM_PATH,
): readonly string[] | null {
  if (!LATERAL_FORAMEN_MAGNUM_PATH.every((part, i) => requested[i] === part)) return null;
  const source = skullBasePathForGroup(sceneNode(node.rawName),
    [...FORAMEN_MAGNUM_SOURCE_PATH, ...requested.slice(LATERAL_FORAMEN_MAGNUM_PATH.length)]);
  return source ? [...LATERAL_FORAMEN_MAGNUM_PATH, ...source.slice(FORAMEN_MAGNUM_SOURCE_PATH.length)] : null;
}
export function lateralForamenMagnumTissue(rawName: string): HeadNeckTissue | null {
  if (!lateralForamenMagnumPath({ rawName })) return null;
  if (isAnteriorTriangleBrainstem({ rawName })) return 'organs'; // Gross context, never peripheral nerves.
  const system = skullBaseSystemForNode(sceneNode(rawName));
  if (system === 'vascular') return /vein|venous|venosu|pleus|sinus|bulb/.test(skullBaseName(rawName)) ? 'veins' : 'arteries';
  return system === 'skeletal' ? 'bones' : system === 'muscular' ? 'muscles'
    : system === 'nervous' ? 'nerves' : null;
}

/** Keep the reference's anatomy, but these four muscles are foreground anatomy
 * in Lateral neck, not transparent Skull base orientation context. */
export function isLateralSuboccipitalMuscle(node: Pick<SceneNode, 'rawName'>): boolean {
  return lateralForamenMagnumPath(node)?.some(part =>
    ['suboccipitalSuperiorOblique', 'suboccipitalInferiorOblique', 'rectusCapitisMajor', 'rectusCapitisMinor'].includes(part)) ?? false;
}

/** Complete subclavian branches, not an indiscriminate "cervical artery" match. */
export function lateralSubclavianArtery(rawName: string): boolean {
  const name = nameOf(rawName);
  return /^(?:(?:subclavian|vertebral|internal thoracic|internal mammary|inferior thyroid|inferior laryngeal|ascending cervical|transverse cervical|superficial cervical|suprascapular|dorsal scapular|deep cervical|supreme intercostal|highest intercostal) arter(?:y|ies)|(?:thyrocervical|costocervical) trunk)$/.test(name)
    || /^(?:[\w -]+ )?branches? of (?:the )?(?:subclavian|vertebral|internal thoracic|inferior thyroid|ascending cervical|transverse cervical|suprascapular|dorsal scapular|deep cervical|supreme intercostal) artery$/.test(name);
}
export function lateralSubclavianVein(rawName: string): boolean {
  return /^(?:(?:subclavian|brachiocephalic|cephalic|axillary|external jugular|internal jugular|anterior jugular|transverse cervical|suprascapular|dorsal scapular|deep cervical|vertebral|inferior thyroid|internal thoracic|superior intercostal) veins?|jugular venous arch|(?:anterior|posterior) external jugular vein)$/.test(nameOf(rawName));
}

export function lateralNeckMemberships(rawName: string): { region: string; tissue: HeadNeckTissue }[] {
  if (anteriorNeckSuperficialLayer({ rawName }) === 'platysma') return [];
  const name = nameOf(rawName);
  const result: { region: string; tissue: HeadNeckTissue }[] = [];
  const add = (region: string, tissue: HeadNeckTissue) => result.push({ region: `lateral-neck/${region}`, tissue });
  if (anteriorTriangleCervicalBone(cervicalNerveName(rawName))) {
    for (const region of ['sternocleidomastoid', 'occipital-triangle', 'omoclavicular']) add(region, 'bones');
  }
  if (/auriculotemporal|great auricular|transverse cervical nerve|supraclavicular.*nerve|accessory nerve|lesser occipital/.test(name))
    add('sternocleidomastoid', 'nerves');
  if (/^(?:(?:common|internal|external) )?carotid arter(?:y|ies)$/.test(name)) add('sternocleidomastoid', 'arteries');
  if (/^(?:internal|external|anterior|posterior external) jugular veins?$|^jugular venous arch$/.test(name))
    add('sternocleidomastoid', 'veins');
  const family = headNeckCervicalNerveFamily(rawName);
  if (family === 'brachial-plexus' || /supraclavicular.*nerve|phrenic nerve/.test(name)) add('omoclavicular', 'nerves');
  if (lateralSubclavianArtery(rawName)) add('omoclavicular', 'arteries');
  if (lateralSubclavianVein(rawName)) add('omoclavicular', 'veins');
  const referenceTissue = lateralForamenMagnumTissue(rawName);
  if (referenceTissue) add('occipital-triangle', referenceTissue);
  return result;
}

export function isLateralNeckNerve(rawName: string): boolean {
  if (isCervicalAutonomicNerve(rawName)) return true;
  const family = headNeckCervicalNerveFamily(rawName);
  if (family) return true;
  const name = nameOf(rawName);
  return /auriculotemporal|accessory nerve|suboccipital nerve|greater occipital|third occipital|cervical.*(?:sympathetic|gangli)|cervicothoracic|ansa subclavia/.test(name)
    || lateralForamenMagnumTissue(rawName) === 'nerves';
}

export function lateralNeckHiddenLayerIds(nodes: readonly SceneNode[], path: readonly string[]): number[] {
  return LATERAL_NECK_ROOT.every((part, i) => path[i] === part)
    ? nodes.filter(node => {
      const layer = anteriorNeckSuperficialLayer(node);
      return layer === 'platysma' || (layer === 'investing-fascia' && path[3] !== 'fasciae');
    }).map(node => node.instanceID) : [];
}

export function lateralNeckSettings(nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[]) {
  const selected = new Set(ids);
  const bones = nodes.filter(node => selected.has(node.instanceID)
    && anteriorTriangleCervicalBone(cervicalNerveName(node.rawName))).map(node => node.instanceID);
  const isOccipital = LATERAL_NECK_ROOT.every((part, i) => path[i] === part)
    && (path.length === 3 || path[3] === 'occipital-triangle');
  if (!isOccipital) return { supportIds: [], contextIds: bones };
  const sourcePath = path[4] === 'foramen-magnum-reference'
    ? [...FORAMEN_MAGNUM_SOURCE_PATH, ...path.slice(5)] : FORAMEN_MAGNUM_SOURCE_PATH;
  const opaqueMuscles = new Set(nodes.filter(isLateralSuboccipitalMuscle).map(node => node.instanceID));
  return { supportIds: [], contextIds: [...new Set([
    ...skullBaseContextIds(nodes, sourcePath).filter(id => selected.has(id) && !opaqueMuscles.has(id)), ...bones,
  ])],
    skullBaseStyle: true };
}
