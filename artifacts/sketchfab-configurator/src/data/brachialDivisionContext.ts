import { normalizeAdvancedObjectName } from './advancedCollection';
import { brachialTrunkContextPart } from './brachialTrunkContext';
import { brachialOverviewPart } from './brachialOverview';
import type { SceneNode } from '../types/sketchfab';

export function brachialDivisionContextPart(rawName: string): 'roots' | 'trunks' | 'cords' | 'bones' | 'vertebrae' | null {
  const shared = brachialTrunkContextPart(rawName);
  if (shared && shared !== 'divisions') return shared;
  if (/^(?:superior|middle|inferior) trunk of brachial plexus$/.test(normalizeAdvancedObjectName(rawName))) return 'trunks';
  if (brachialOverviewPart(rawName) === 'vertebrae') return 'vertebrae';
  return null;
}
export function isBrachialDivisionContext(node: SceneNode): boolean {
  const part = brachialDivisionContextPart(node.rawName);
  return part !== null && (!node.systemId || node.systemId === (['bones', 'vertebrae'].includes(part) ? 'skeletal' : 'nervous'));
}
