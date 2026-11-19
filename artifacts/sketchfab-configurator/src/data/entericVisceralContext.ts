import visceralCsv from '@assets/Internal_organs_1790925899980.csv?raw';
import { csvRows } from './anatomicalSystems';
import { classifyVisceraObject } from './visceraTaxonomy';
import { normalizeAdvancedObjectName } from './advancedCollection';
import type { SceneNode } from '../types/sketchfab';

// Keep the supplied, assigned viscera as context. Unknown review objects are
// not guessed into an organ; organ landmarks do not become enteric neurons.
const visceralObjects = [...csvRows(visceralCsv)]
  .filter(row => row[0] === 'OBJECT' && row[5] === 'MESH' && classifyVisceraObject(row[4]));
const visceralNames = new Set(visceralObjects.map(row => normalizeAdvancedObjectName(row[4])));
const headNeckGlandNames = new Set(visceralObjects.filter(row => {
  const path = classifyVisceraObject(row[4])!;
  return ['pituitary-pineal', 'thyroid-parathyroids'].includes(path[1])
    || /\b(?:parotid|submandibular|sublingual|lacrimal) gland\b/i.test(row[4]);
}).map(row => normalizeAdvancedObjectName(row[4])));

// Ownership is independent of a teaching view's exclusions.
export function isAssignedVisceralName(rawName: string): boolean {
  return visceralNames.has(normalizeAdvancedObjectName(rawName));
}

export function isEntericVisceralName(rawName: string): boolean {
  const key = normalizeAdvancedObjectName(rawName);
  return visceralNames.has(key) && !headNeckGlandNames.has(key);
}

export function isEntericVisceralContextNode(node: SceneNode): boolean {
  return (!node.systemId || node.systemId === 'organs') && isEntericVisceralName(node.rawName);
}

export function entericVisceralPath(node: SceneNode, scope: readonly string[]): readonly string[] | null {
  if (!isEntericVisceralContextNode(node)) return null;
  const path = ['advanced-neuroanatomy', 'autonomic-nervous-system', 'enteric', 'organs'];
  return scope.every((part, i) => path[i] === part) ? path : null;
}
