import { normalizeAdvancedObjectName } from './advancedCollection';
import nervousCsv from '@assets/Nervous_system_CLean_1791612986964.csv?raw';
import type { SceneNode } from '../types/sketchfab';

export const OPTIC_OCCIPITAL_CONTEXT_NAME = 'Occipital lobes (semitransparent)';

// Names in this source collection contain no quoted commas.
const occipitalNames = new Set(nervousCsv.split(/\r?\n/)
  .filter(line => line.startsWith('OBJECT,NS_04_OCCIPITAL_LOBE,'))
  .map(line => line.split(',')[4].trim().toLowerCase().replace(/\s+/g, ' ')));

export function opticAnatomyAliasRole(rawName: string): 'tracts' | 'visual-cortex' | null {
  const key = normalizeAdvancedObjectName(rawName)
    .replace(/^(left|right) /, '').replace(/(?:[ .](left|right)| \((left|right)\))$/, '');
  if (key === 'optic tract') return 'tracts';
  if (['occipital lobe', 'occipital lobes', OPTIC_OCCIPITAL_CONTEXT_NAME.toLowerCase()].includes(key)) return 'visual-cortex';
  return null;
}

export const isOpticOccipitalContext = (node: SceneNode): boolean =>
  node.systemId === 'nervous' && (opticAnatomyAliasRole(node.rawName) === 'visual-cortex'
    // Preserve laterality: some boundary sulci belong to different lobe
    // collections on the two sides. Strip only duplicate/export suffixes.
    || occipitalNames.has(node.rawName.trim().toLowerCase().replace(/(?:\.\d+|_\d+)+$/, '').replace(/\s+/g, ' ')));
