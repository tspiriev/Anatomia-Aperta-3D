import { normalizeAdvancedObjectName } from './advancedCollection';
import type { SceneNode } from '../types/sketchfab';

export const BRACHIAL_ROOT_LEVELS = ['C5', 'C6', 'C7', 'C8', 'T1'] as const;
export const BRACHIAL_TRUNK_ROOTS = { superior: 'C5–C6', middle: 'C7', inferior: 'C8–T1' } as const;

// Teaching contributions supplied by the creator, keyed by source names rather
// than display labels. This must never change taxonomy membership or geometry.
const contributions = new Map<string, string>();
function assign(roots: string, ...names: string[]) {
  for (const name of names) contributions.set(normalizeAdvancedObjectName(name), roots);
}
assign('C5–T1', 'Roots of brachial plexus', 'Roots of the brachial plexus', 'Brachial plexus roots');
for (const [trunk, roots] of Object.entries(BRACHIAL_TRUNK_ROOTS)) {
  assign(roots, `${trunk} trunk of brachial plexus`,
    `Anterior division of ${trunk} trunk of brachial plexus`,
    `Posterior division of ${trunk} trunk of brachial plexus`);
}
assign('C5–C7', 'Lateral cord of brachial plexus', 'Lateral cord brachial plexus');
assign('C8–T1', 'Medial cord of brachial plexus', 'Medial cord brachial plexus');
assign('C5–T1', 'Posterior cord of brachial plexus', 'Posterior cord brachial plexus');
assign('C5', 'Dorsal scapular nerve');
assign('C5–C7', 'Long thoracic nerve', 'Lateral pectoral nerve', 'Musculocutaneous nerve');
assign('C5–C6', 'Suprascapular nerve', 'Subclavian nerve', 'Nerve to subclavius',
  'Superior subscapular nerve', 'Upper subscapular nerve', 'Inferior subscapular nerve', 'Lower subscapular nerve', 'Axillary nerve');
assign('C8–T1', 'Medial pectoral nerve', 'Medial brachial cutaneous nerve', 'Medial cutaneous nerve of arm',
  'Medial antebrachial cutaneous nerve', 'Medial cutaneous nerve of forearm', 'Ulnar nerve');
assign('C6–C8', 'Thoracodorsal nerve');
assign('C5–T1', 'Median nerve', 'Radial nerve');
assign('C5–C7', 'Lateral root of median nerve', 'Lateral root of the median nerve');
assign('C8–T1', 'Medial root of median nerve', 'Medial root of the median nerve');

export const brachialRootContribution = (rawName: string) =>
  contributions.get(normalizeAdvancedObjectName(rawName)) ?? null;

export function brachialRootLabel(label: string, rawName: string): string {
  const roots = brachialRootContribution(rawName);
  return roots && !label.includes(roots) ? `${label} (${roots})` : label;
}
export function withBrachialRootContributions(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.map(node => {
    if (node.systemId && node.systemId !== 'nervous') return node;
    const name = brachialRootLabel(node.name, node.rawName);
    return name === node.name ? node : { ...node, name };
  });
}
