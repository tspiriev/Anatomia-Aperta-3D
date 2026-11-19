import { normalizeAdvancedObjectName } from './advancedCollection';
import { sacralLimbBonePath } from './sacralLimbBones';

const spinalCordNames = new Set([
  'Spinal cord', 'White matter of spinal cord', 'Gray matter of spinal cord', 'Grey matter of spinal cord',
  'Anterior horn of spinal cord', 'Posterior horn of spinal cord', 'Lateral horn of spinal cord',
].map(normalizeAdvancedObjectName));

export const CAUDA_DISC_LEVELS = ['T12-L1', 'L1-L2', 'L2-L3', 'L3-L4', 'L4-L5', 'L5-S1'] as const;

/** Exact exported anatomy, not spinal roots, vessels, attachments or other vertebrae. */
export function lumbarPlexusAnatomyPath(rawName: string): readonly string[] | null {
  const key = normalizeAdvancedObjectName(rawName);
  const vertebra = /^vertebra l([1-5])$/.exec(key);
  if (vertebra) return ['vertebrae', `l${vertebra[1]}`];
  // The supplied skeleton contains fused hip bones, not separately named ilia.
  if (['hip bone', 'iliac bone', 'ilium'].includes(key)) return ['iliac-bones'];
  if (key === 'sacrum') return ['sacrum'];
  if (spinalCordNames.has(key)) return ['spinal-cord'];
  if (key === 'spinal dura' || key === 'dura mater of spinal cord') return ['spinal-dura'];
  if (key === 'filum terminale') return ['filum-terminale'];
  if (key === 'inguinal ligament') return ['inguinal-ligament'];
  const disc = /^intervertebral disc (.+)$/.exec(key.replace(/[–—]/g, '-'));
  if (disc && CAUDA_DISC_LEVELS.some(level => level.toLowerCase() === disc[1]))
    return ['intervertebral-discs', disc[1]];
  return sacralLimbBonePath(rawName);
}
export function lumbarPlexusAnatomySystem(rawName: string): 'skeletal' | 'nervous' | undefined {
  const part = lumbarPlexusAnatomyPath(rawName);
  return part ? ['spinal-cord', 'spinal-dura', 'filum-terminale'].includes(part[0]) ? 'nervous' : 'skeletal' : undefined;
}
