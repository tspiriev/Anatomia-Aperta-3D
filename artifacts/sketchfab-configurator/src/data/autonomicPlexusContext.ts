import { normalizeAdvancedObjectName } from './advancedCollection';
import cardiovascularCsv from '@assets/Cardiovascular_system_final_1790945714118.csv?raw';
import { csvRows } from './anatomicalSystems';
import { reviewedCardiovascularPath } from './cardiovascularCorrections';
import type { SceneNode } from '../types/sketchfab';

export const PLEXUS_HEART_CONTEXT_NAME = 'Heart and coronary vessels (semitransparent)';

// Follow reviewed abdominal membership, not the export's misplaced pelvic
// vessels. Include reviewed abdominal objects exported in other collections.
const abdominalVessels = new Set([...csvRows(cardiovascularCsv)]
  .filter(row => row[0] === 'OBJECT' && ['MESH', 'CURVE'].includes(row[5])
    && reviewedCardiovascularPath(row[4], row[1] === '06 Abdominal Vessels' ? ['cardiovascular-06'] : null)?.[0] === 'cardiovascular-06')
  .map(row => normalizeAdvancedObjectName(row[4])));
for (const name of ['Abdominal aorta', 'Aorta (abdominal part)', 'Descending abdominal aorta',
  'Inferior vena cava (abdominal part)']) abdominalVessels.add(normalizeAdvancedObjectName(name));

function isThoracicAortaName(rawName: string): boolean {
  return ['thoracic aorta', 'descending thoracic aorta', 'descending aorta (thoracic part)', 'aorta (thoracic part)']
    .includes(normalizeAdvancedObjectName(rawName));
}

/** Reviewed abdominal arterial tree, including the aortic terminal branches.
 * A vessel-associated nerve plexus is a separate neural object, not an artery.
 */
const namedAbdominalArteries = new Set([
  'superior mesenteric', 'inferior mesenteric', 'renal',
  'common iliac', 'external iliac', 'internal iliac', 'median sacral',
  'superior epigastric', 'inferior epigastric', 'superficial epigastric',
  'deep circumflex iliac', 'superficial circumflex iliac', 'inferior phrenic',
  'lumbar', 'superior suprarenal', 'middle suprarenal', 'inferior suprarenal',
  'gonadal', 'testicular', 'ovarian',
].flatMap(name => [`${name} artery`, `${name} arteries`]));
const vesselKeyWithoutSide = (rawName: string) => normalizeAdvancedObjectName(rawName)
  .replace(/^(?:left|right)\s+/, '').replace(/\s+(?:left|right)$/, '');

export function isPlexusIliacVesselName(rawName: string): boolean {
  return /^(?:common iliac (?:artery|arteries|vein|veins)|(?:internal|external) iliac arter(?:y|ies))$/
    .test(vesselKeyWithoutSide(rawName));
}

export function isAbdominalSympatheticArteryName(rawName: string): boolean {
  const key = normalizeAdvancedObjectName(rawName);
  // Superior epigastric vessels are internal thoracic branches, but belong here
  // as explicitly requested abdominal-wall context, not as aortic branches.
  const unsided = vesselKeyWithoutSide(rawName);
  return (abdominalVessels.has(key) && /\b(?:artery|arteries|aorta|coeliac trunk)\b/.test(key))
    || namedAbdominalArteries.has(unsided)
    || /^c(?:oe|e)liac trunk$/.test(unsided);
}

/** The first Sympathetic menu includes all available reviewed abdominal vessels,
 * plus named wall vessels in updated models. Exact vessel names deliberately
 * exclude the separately drawn nerve plexuses covering those same vessels.
 */
export function isAbdominalSympatheticVesselName(rawName: string): boolean {
  return isAbdominalSympatheticArteryName(rawName)
    || abdominalVessels.has(normalizeAdvancedObjectName(rawName))
    || /^(?:(?:superior|inferior|superficial) epigastric|(?:deep|superficial) circumflex iliac) veins?$/
      .test(vesselKeyWithoutSide(rawName));
}

const heartStructures = new Set([
  PLEXUS_HEART_CONTEXT_NAME, 'Heart', 'Right atrium', 'Left atrium', 'Right ventricle', 'Left ventricle',
  'Right coronary leaflet', 'Left coronary leaflet', 'Non-coronary leaflet',
  'Interatrial septum.j', 'Interventricular septum', 'Myocardium', 'Epicardium', 'Endocardium',
  'Right coronary artery', 'Left coronary artery', 'Right inferolateral branch of right coronary artery',
  'Circumflex artery of heart', 'Anterior interventricular artery', 'Posterior interventricular artery',
  'Septal branches of anterior interventricular artery', 'Coronary sinus', 'Great cardiac vein',
  'Middle cardiac vein', 'Small cardiac vein', 'Inferior vein of left ventricle',
  "Inferior vein of left ventricle (//Posterior '')", '????????',
].map(normalizeAdvancedObjectName));

export function isPlexusHeartName(rawName: string): boolean {
  const key = normalizeAdvancedObjectName(rawName);
  if (/\b(?:nerve|plexus)\b/.test(key)) return false;
  return heartStructures.has(key)
    || /papillary muscle of (?:left|right) ventricle|leaflet of (?:left|right) atrioventricular valve|semilunar leaflet of (?:aortic|pulmonary) valve/.test(key);
}

export function isPlexusVertebralName(rawName: string): boolean {
  return /^(?:vertebra c[1-7]|atlas(?: \(c1\))?|axis(?: \(c2\))?|vertebra (?:t|th)(?:[1-9]|1[0-2])|vertebra l[1-5]|sacrum)$/.test(normalizeAdvancedObjectName(rawName));
}

function isPulmonaryArteryName(rawName: string): boolean {
  const key = normalizeAdvancedObjectName(rawName);
  if (/\b(?:nerve|plexus)\b/.test(key)) return false;
  return /^(?:(?:left |right )?pulmonary arter(?:y|ies)(?:\.j)?|pulmonary trunk|bifurcation of pulmonary trunk)$/.test(key)
    || /\barter(?:y|ies) of (?:left|right) lung$/.test(key);
}

/** True anatomical vessels remain vascular, not confused with nerve plexuses. */
export function plexusContextSystem(rawName: string): 'skeletal' | 'vascular' | null {
  if (isPlexusVertebralName(rawName)) return 'skeletal';
  if (isPlexusHeartName(rawName) || isPulmonaryArteryName(rawName) || isThoracicAortaName(rawName)
    || isPlexusIliacVesselName(rawName)
    || abdominalVessels.has(normalizeAdvancedObjectName(rawName))
    || ['aortic arch', 'arch of aorta'].includes(normalizeAdvancedObjectName(rawName))) return 'vascular';
  return null;
}

export function isPlexusContextNode(node: SceneNode): boolean {
  const system = plexusContextSystem(node.rawName);
  return system !== null && (!node.systemId || node.systemId === system);
}

export function isPlexusHeartNode(node: SceneNode): boolean {
  return isPlexusHeartName(node.rawName) && isPlexusContextNode(node);
}

export function plexusContextPath(node: SceneNode, scope: readonly string[]): readonly string[] | null {
  if (!isPlexusContextNode(node)) return null;
  const root = ['advanced-neuroanatomy', 'autonomic-nervous-system', 'plexuses'];
  if (scope.length > 2 && scope[2] !== 'plexuses') return null;
  if (isPlexusVertebralName(node.rawName)) return root;
  const subgroup = isPlexusIliacVesselName(node.rawName) ? 'pelvic'
    : abdominalVessels.has(normalizeAdvancedObjectName(node.rawName)) ? 'abdominal'
    : isThoracicAortaName(node.rawName) || (isPulmonaryArteryName(node.rawName) && scope[3] !== 'cardiac')
      ? 'pulmonary-esophageal' : 'cardiac';
  const path = [...root, subgroup];
  return scope.every((part, i) => path[i] === part) ? path : null;
}
