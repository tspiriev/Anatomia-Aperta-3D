import { lowerLimbName } from './lowerLimbNames';
import { isLowerLimbSpinalCord } from './lowerLimbLumbarPelvic';
import type { SceneNode } from '../types/sketchfab';

export const isLowerLimbCaudaEquina = (raw: string): boolean =>
  lowerLimbName(raw) === 'cauda equina';

/** Cauda equina is represented by the actual exported spinal roots, not
 * by renaming a plexus, ganglion, dorsal ramus or cord as a whole cauda mesh.
 */
export const isLowerLimbCaudaComponent = (raw: string): boolean =>
  /^(?:l[1-5]|s[1-4]) (?:anterior|posterior) root$|^filum terminale$/.test(lowerLimbName(raw));

export const isLowerLimbLumbarSacralBone = (raw: string): boolean =>
  /^(?:vertebra l[1-5]|sacrum)$/.test(lowerLimbName(raw));

export function hipGlutealVesselRegions(name: string): string[] {
  // Epigastric vessels remain in the lumbar/pelvic and femoral-triangle
  // collections, but must not enter anterior hip/iliopsoas.
  if (/epigastric/.test(name)) return [];
  if (/^abdominal aorta$|^inferior vena cava(?: abdominal part)?$|(?:common|external|internal) iliac|^(?:superficial |deep )?femoral (?:arter|vein)|circumflex femoral|iliolumbar|^lumbar (?:arter|vein)|ascending lumbar|lumbar vertebral venous plexus|(?:median|lateral) sacral|(?:deep|superficial) circumflex iliac|obturator (?:arter|vein)/.test(name))
    return ['hip-gluteal/iliopsoas', 'hip-gluteal/gluteal'];
  return [];
}

/** In the gluteal nerve view keep the available spinal origins and transparent
 * vertebral landmarks. Other tissue-only views stay tissue-only, and Hide all
 * must never reintroduce support geometry.
 */
export function hipGlutealSupportIds(
  nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[],
  belongs: (node: SceneNode) => boolean,
): number[] {
  if (!ids.length || path[1] !== 'lower-limb-topography' || path[2] !== 'hip-gluteal'
    || (path.length > 3 && !['iliopsoas', 'gluteal', 'nerves'].includes(path[3]))
    || path.some(part => ['bones', 'muscles', 'arteries', 'veins', 'joints', 'fasciae', 'bursae'].includes(part))) return [];
  return nodes.filter(node => belongs(node)
    && (isLowerLimbSpinalCord(node.rawName) || isLowerLimbCaudaEquina(node.rawName)
      || isLowerLimbCaudaComponent(node.rawName) || isLowerLimbLumbarSacralBone(node.rawName)))
    .map(node => node.instanceID);
}
