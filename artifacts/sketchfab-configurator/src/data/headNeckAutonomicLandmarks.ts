import { normalizeAdvancedObjectName } from './advancedCollection';
import { classifyBrainGrossAnatomy } from './brainGrossAnatomy';
import type { SceneNode } from '../types/sketchfab';

const cervicalArteries = new Set([
  'Common carotid artery', 'Left common carotid artery', 'Right common carotid artery',
  'Internal carotid artery', 'External carotid artery',
  'Subclavian artery', 'Left subclavian artery', 'Right subclavian artery',
  'Aortic arch', 'Arch of aorta', 'Brachiocephalic trunk',
].map(normalizeAdvancedObjectName));

const salivaryGlands = new Set([
  'Parotid gland', '(Accessory parotid gland)', 'Accessory parotid gland',
  'Submandibular gland', 'Sublingual gland',
].map(normalizeAdvancedObjectName));

export function isHeadNeckAutonomicBone(rawName: string): boolean {
  const key = normalizeAdvancedObjectName(rawName);
  return /^(?:vertebra c[1-7]|atlas(?: \(c1\))?|axis(?: \(c2\))?|temporal bone|sphenoid bone)$/.test(key);
}

/** Translucent parent-level landmarks remain visible in each head/neck pathway. */
export function isHeadNeckRetainedContextNode(node: SceneNode): boolean {
  return ((!node.systemId || node.systemId === 'skeletal') && isHeadNeckAutonomicBone(node.rawName))
    || ((!node.systemId || node.systemId === 'nervous')
      && (classifyBrainGrossAnatomy(node.rawName)?.[2] === 'brainstem'
        || ['brainstem', 'brain stem'].includes(normalizeAdvancedObjectName(node.rawName))));
}

/** Keep vessels/glands/bones in their source systems, including export aliases. */
export function headNeckLandmarkSystem(rawName: string): 'skeletal' | 'vascular' | 'organs' | null {
  const key = normalizeAdvancedObjectName(rawName);
  if (isHeadNeckAutonomicBone(rawName)) return 'skeletal';
  if (cervicalArteries.has(key)) return 'vascular';
  if (salivaryGlands.has(key)) return 'organs';
  return null;
}

export function headNeckLandmarkSubgroup(rawName: string): 'carotid' | 'ganglia' | null {
  const key = normalizeAdvancedObjectName(rawName);
  return cervicalArteries.has(key) ? 'carotid' : salivaryGlands.has(key) ? 'ganglia' : null;
}
