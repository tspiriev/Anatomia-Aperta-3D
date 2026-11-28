import { normalizeAdvancedObjectName } from './advancedCollection';
import type { SceneNode } from '../types/sketchfab';

export const BRACHIAL_TRUNK_LIGHT_PURPLE = Object.freeze([195 / 255, 164 / 255, 235 / 255]);
export function isBrachialTrunkName(rawName: string): boolean {
  return /^(?:superior|middle|inferior) trunk of brachial plexus$/.test(normalizeAdvancedObjectName(rawName));
}

/** Only the named plexus segments and shoulder bones, not their distal branches. */
export function brachialTrunkContextPart(rawName: string): 'roots' | 'divisions' | 'cords' | 'bones' | null {
  const key = normalizeAdvancedObjectName(rawName);
  if (/^(?:roots of (?:the )?brachial plexus|brachial plexus roots)$/.test(key)) return 'roots';
  if (/^(?:anterior|posterior) division of (?:superior|middle|inferior) trunk of brachial plexus$/.test(key)) return 'divisions';
  if (/^(?:lateral|medial|posterior) cord (?:of )?brachial plexus$/.test(key)) return 'cords';
  if (/^(?:(?:left|right) )?(?:scapula|clavicle)(?: (?:left|right))?$/.test(key)) return 'bones';
  return null;
}
export function isBrachialTrunkContext(node: SceneNode): boolean {
  const part = brachialTrunkContextPart(node.rawName);
  return part !== null && (!node.systemId || node.systemId === (part === 'bones' ? 'skeletal' : 'nervous'));
}
