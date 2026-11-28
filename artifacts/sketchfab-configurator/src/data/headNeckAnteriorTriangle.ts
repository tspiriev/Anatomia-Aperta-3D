import type { SceneNode } from '../types/sketchfab';
import { skullBaseName } from './skullBaseSources';
import { headNeckCervicalNerveFamily, cervicalNerveName } from './headNeckCervicalNerves';

export const ANTERIOR_NECK_SUPERFICIAL_ID = 'superficial-layers';
export function anteriorNeckSuperficialLayer(node: Pick<SceneNode, 'rawName'>): 'platysma' | 'investing-fascia' | null {
  const name = skullBaseName(node.rawName);
  if (['platysma', 'platysma muscle', 'platisma'].includes(name)) return 'platysma';
  if (['superficial investing cervical fascia', 'superficial investing layer of cervical fascia',
    'superficial investing layer of deep cervical fascia'].includes(name)) return 'investing-fascia';
  return null;
}

/** Superficial coverings are opt-in. The muscular/visceral compartment also
 * excludes gross brainstem context, including after mixed or additive Show. */
export function anteriorNeckHiddenLayerIds(nodes: readonly SceneNode[], path: readonly string[]): number[] {
  if (path[0] !== 'advanced-neuroanatomy' || path[1] !== 'head-neck-topography'
    || path[2] !== 'anterior-triangle' || path[3] === ANTERIOR_NECK_SUPERFICIAL_ID) return [];
  return nodes.filter(node => anteriorNeckSuperficialLayer(node) !== null
    || (path[3] === 'muscular' && isAnteriorTriangleBrainstem(node))).map(node => node.instanceID);
}

export function anteriorTriangleNerve(name: string): boolean {
  if (/\bnucle|\bneucle|\bnuclei|\btract\b|\bfascicl|\bfiber|\bgyrus|\bsulcus/.test(name)) return false;
  if (headNeckCervicalNerveFamily(name)) return true;
  if (name === 'pterygoid plexus') return false; // Venous plexus, not neural.
  // Combined C1/C2 root meshes in the creator's source omit the word "root".
  if (/^c[12] anterior posterior$/.test(name)) return true;
  // Named carriers can contain "artery", but the sympathetic plexus is neural.
  if (/sympathetic/.test(name)) return !/muscle|ligament/.test(name);
  if (/arter|vein|venous|sinus|muscle/.test(name) && !/\bnerve\b/.test(name)) return false;
  return /\bnerve\b|\bnerves\b|gangli|\bplexus\b|\bansa cervical|\bansa subclavia|\bramus\b|\brami\b/.test(name)
    || /\b(?:anterior|posterior|dorsal|ventral|spinal) root(?:s|lets)?\b|\brootlets\b/.test(name);
}

export function anteriorTriangleCervicalBone(name: string): boolean {
  return /^(?:vertebra c[1-7]|c[1-7](?: vertebra)?|cervical vertebra(?:e)?(?: [1-7])?|cervical spine|atlas(?: \(c1\))?|axis(?: \(c2\))?|(?:first|second|third|fourth|fifth|sixth|seventh) cervical vertebra)$/.test(name);
}

export function isAnteriorTriangleBrainstem(node: Pick<SceneNode, 'rawName'>): boolean {
  return ['midbrain', 'pons', 'medulla oblongata', 'brainstem', 'brain stem'].includes(skullBaseName(node.rawName));
}

export function anteriorTriangleSettings(nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[]) {
  if (path[0] !== 'advanced-neuroanatomy' || path[1] !== 'head-neck-topography'
    || path[2] !== 'anterior-triangle' || !ids.length) return { supportIds: [], contextIds: [] };
  const supportIds = path[3] === 'muscular' ? [] : nodes.filter(isAnteriorTriangleBrainstem).map(node => node.instanceID);
  const selected = new Set(ids);
  const bones = nodes.filter(node => selected.has(node.instanceID)
    && anteriorTriangleCervicalBone(cervicalNerveName(node.rawName))).map(node => node.instanceID);
  return { supportIds, contextIds: [...new Set([...supportIds, ...bones])] };
}
