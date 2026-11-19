import { lowerLimbName } from './lowerLimbNames';
import type { SceneNode } from '../types/sketchfab';

export const isLowerLimbSpinalCord = (rawName: string): boolean =>
  /^(?:(?:lumbar|lumbosacral) )?spinal cord$|^anterior horn of spinal cord$/.test(lowerLimbName(rawName));
export const isLowerLimbSpinalDura = (rawName: string): boolean =>
  /^spinal dura$/.test(lowerLimbName(rawName));

/** Regional vessels and their whole source trunks, not unrelated foregut
 * branches or the distal leg circulation. No geometry is split or fabricated.
 */
export function lumbarPelvicVesselRegions(name: string): string[] {
  const regions = new Set<string>();
  const lumbar = () => regions.add('lumbar-pelvic/lumbar-plexus');
  const pelvic = () => regions.add('lumbar-pelvic/sacral-plexus');
  if (/^abdominal aorta$|^inferior vena cava(?: abdominal part)?$/.test(name)) {
    lumbar(); pelvic();
  }
  if (/renal|suprarenal|subcostal|ascending lumbar|^lumbar|(?:spinal|lumbar) branch of iliolumbar/.test(name))
    lumbar();
  if (/testicular|gonadal|iliolumbar|iliacus branch of iliolumbar|common iliac/.test(name)) {
    lumbar(); pelvic();
  }
  if (/coeliac trunk|superior mesenteric|ileocolic|ileal branch|appendicular|right colic|middle colic|^marginal artery$/.test(name))
    lumbar();
  if (/(?:external|internal) iliac|inferior mesenteric|sigmoid|left colic|anorectal|sacral|gluteal|obturator|pudendal|penis|(?:inferior|superficial) epigastric|deep circumflex iliac/.test(name))
    pelvic();
  return [...regions];
}

/** Retain cord/dura alongside isolated nerves, but not in arteries-only,
 * bone-only or other tissue views. An empty Hide never restores references.
 */
export function lowerLimbSpinalSupportIds(
  nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[],
  belongs: (node: SceneNode) => boolean,
): number[] {
  if (!ids.length || path[1] !== 'lower-limb-topography' || path[2] !== 'lumbar-pelvic'
    || path.some(part => ['bones', 'muscles', 'arteries', 'veins', 'joints', 'fasciae', 'bursae'].includes(part))) return [];
  return nodes.filter(node => belongs(node)
    && (isLowerLimbSpinalCord(node.rawName) || isLowerLimbSpinalDura(node.rawName)))
    .map(node => node.instanceID);
}
