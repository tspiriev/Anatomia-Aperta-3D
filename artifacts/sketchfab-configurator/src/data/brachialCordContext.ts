import { brachialTrunkContextPart } from './brachialTrunkContext';
import { brachialDivisionContextPart } from './brachialDivisionContext';
import type { SceneNode } from '../types/sketchfab';

export function brachialCordContextPart(rawName: string): 'roots' | 'trunks' | 'divisions' | 'bones' | 'vertebrae' | null {
  if (brachialTrunkContextPart(rawName) === 'divisions') return 'divisions';
  const part = brachialDivisionContextPart(rawName);
  return part === 'cords' ? null : part;
}
export function isBrachialCordContext(node: SceneNode): boolean {
  const part = brachialCordContextPart(node.rawName);
  return part !== null && (!node.systemId || node.systemId === (['bones', 'vertebrae'].includes(part) ? 'skeletal' : 'nervous'));
}
export const isBrachialCordName = (rawName: string) => brachialTrunkContextPart(rawName) === 'cords';
