import { normalizeAdvancedObjectName } from './advancedCollection';
import type { SceneNode } from '../types/sketchfab';

export const vagalMuscleNames = new Set([
  'Inferior pharyngeal constrictor', 'Middle pharyngeal constrictor', 'Superior pharyngeal constrictor',
  'Palatopharyngeus muscle', 'Ary-epiglottic part of oblique arytenoid muscle',
  'External part of thyro-arytenoid muscle', 'Lateral crico-arytenoid muscle',
  'Oblique part of cricothyroid muscle', 'Posterior crico-arytenoid muscle',
  'Straight part of cricothyroid muscle', 'Thyro-epiglottic part of thyro-arytenoid muscle',
  'Transverse arytenoid muscle',
].map(normalizeAdvancedObjectName));

// Only source-exported thoracic great vessels and their root branches.
// In particular, the abdominal aorta/IVC are not thoracic context.
const vessels = new Set([
  'Ascending aorta', 'Aortic arch', 'Thoracic aorta', 'Brachiocephalic trunk',
  'Left subclavian artery', 'Right subclavian artery',
  'Pulmonary trunk', 'Bifurcation of pulmonary trunk', 'Left pulmonary artery', 'Right pulmonary artery',
  'Right inferior pulmonary vein', 'Left inferior pulmonary vein',
  'Left superior pulmonary vein', 'Right superior pulmonary vein',
  'Superior vena cava', 'Inferior vena cava (thoracic part)',
  'Left brachiocephalic vein', 'Right brachiocephalic vein',
  'Left subclavian vein', 'Right subclavian vein',
  'Pulmonary arteries.j', 'Pulmonary veins.j',
].map(normalizeAdvancedObjectName));
const organs = new Set(['Trachea', 'Oesophagus', 'Oesophagus-profile', 'Stomach', 'Mucosa of stomach'].map(normalizeAdvancedObjectName));
export const esophagealPlexusNames = new Set([
  'Oesophagus Nerve Plexus', 'Oesophagus_Enteric_Plexus_Fine',
].map(normalizeAdvancedObjectName));

export function vagusContextSystem(rawName: string): 'vascular' | 'organs' | null {
  const key = normalizeAdvancedObjectName(rawName);
  return vessels.has(key) ? 'vascular' : organs.has(key) ? 'organs' : null;
}

export function vagusBackdropRole(node: SceneNode): 'vagus-vessels' | 'vagus-viscera' | null {
  const system = vagusContextSystem(node.rawName);
  if (!system || (node.systemId && node.systemId !== system)) return null;
  return system === 'vascular' ? 'vagus-vessels' : 'vagus-viscera';
}
