import { normalizeAdvancedObjectName } from './advancedCollection';
import { isBrachialCordName } from './brachialCordContext';
import type { SceneNode } from '../types/sketchfab';

const carpals = new Set(['Scaphoid bone', 'Lunate bone', 'Triquetrum bone', 'Triquetral bone',
  'Pisiform bone', 'Trapezium bone', 'Trapezoid bone', 'Capitate bone', 'Hamate bone'].map(normalizeAdvancedObjectName));
const handLigaments = {
  wrist: [
    'Ulnotriquetral ligament', 'Ulnopisiform ligament', 'Ulnolunate ligament',
    'Ulnar collateral ligament of wrist joint', 'Radial collateral ligament of wrist joint',
    'Triquetrohamate ligament', 'Triquetrocapitate ligament', 'Scaphotrapeziotrapezoidal ligament',
    'Scapholunate interosseous ligament', 'Scaphocapitate ligament', 'Radioscaphocapitate ligament',
    'Radiocapitate ligament', 'Radiate carpal ligament', 'Pisotriquetral ligament', 'Pisohamate ligament',
    'Palmar scaphotriquetral ligament', 'Palmar lunotriquetral ligament', 'Palmar capitohamate ligament',
    'Lunotriquetral interosseous ligament', 'Dorsal ulnocarpal ligament', 'Dorsal scaphotriquetral ligament',
    'Dorsal radiocarpal ligament', 'Dorsal intercarpal ligaments', 'Capitohamate interosseous ligament',
    'Palmar radio-ulnar ligament', 'Dorsal radio-ulnar ligament',
  ],
  metacarpal: [
    'Pisometacarpal ligament', 'Palmar metacarpal ligaments', 'Palmar carpometacarpal ligaments',
    'Interosseous metacarpal ligaments', 'Dorsal metacarpal ligaments', 'Dorsal carpometacarpal ligaments',
    'Deep transverse metacarpal ligament', 'Collateral metacarpophalangeal ligaments',
  ],
  fingers: ['Palmar interphalangeal ligaments', 'Collateral interphalangeal ligaments of hand'],
};
const ligamentParts = new Map(Object.entries(handLigaments).flatMap(([part, names]) =>
  names.map(name => [normalizeAdvancedObjectName(name), part] as const)));

/** Reviewed upper-limb bones and hand/wrist ligaments; no foot structures or attachments. */
export function brachialTerminalAnatomyPath(rawName: string): readonly string[] | null {
  const key = normalizeAdvancedObjectName(rawName);
  if (isBrachialCordName(rawName)) return ['context', 'cords'];
  if (key === 'humerus') return ['context', 'arm-bones'];
  if (key === 'radius' || key === 'ulna') return ['context', 'forearm-bones'];
  if (carpals.has(key)) return ['hand-bones', 'carpals'];
  if (/^(?:first|second|third|fourth|fifth) metacarpal bone$/.test(key)) return ['hand-bones', 'metacarpals'];
  if (/^(?:proximal|middle|distal) phalanx of (?:first|second|third|fourth|fifth) finger of hand$/.test(key)) return ['hand-bones', 'phalanges'];
  const ligament = ligamentParts.get(key);
  return ligament ? ['hand-ligaments', ligament] : null;
}
export function brachialTerminalAnatomySystem(rawName: string): 'nervous' | 'skeletal' | 'joints' | undefined {
  const path = brachialTerminalAnatomyPath(rawName);
  const part = path?.[0];
  return part === 'context' ? path?.[1] === 'cords' ? 'nervous' : 'skeletal'
    : part === 'hand-bones' ? 'skeletal' : part === 'hand-ligaments' ? 'joints' : undefined;
}

/** The same reviewed bones can provide Overview context without admitting joints. */
export function brachialUpperLimbBonePath(rawName: string): readonly string[] | null {
  const path = brachialTerminalAnatomyPath(rawName);
  if (path?.[0] === 'hand-bones') return ['upper-limb-bones', 'hand', ...path.slice(1)];
  if (path?.[0] !== 'context') return null;
  return path[1] === 'arm-bones' ? ['upper-limb-bones', 'arm']
    : path[1] === 'forearm-bones' ? ['upper-limb-bones', 'forearm'] : null;
}
export const isBrachialTerminalContext = (node: SceneNode) =>
  ['context', 'hand-bones'].includes(brachialTerminalAnatomyPath(node.rawName)?.[0] ?? '')
  && (!node.systemId || node.systemId === brachialTerminalAnatomySystem(node.rawName));
