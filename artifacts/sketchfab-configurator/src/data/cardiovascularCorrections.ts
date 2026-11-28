type RegionId = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09';

// Reviewed corrections to the Blender collection assignments. These match
// unchanged exported object names; no IDs, geometry, or source CSV are altered.
const corrections = new Map<string, readonly string[] | null>();
function assign(region: RegionId, names: readonly string[]) {
  for (const name of names) corrections.set(name.toLowerCase(), [`cardiovascular-${region}`]);
}
function paired(region: RegionId, bases: readonly string[]) {
  assign(region, bases.flatMap((base) => [`${base}.l`, `${base}.r`]));
}

assign('02', [
  'Anterior_Intercavernous_Sinus', 'Basilar venous plexus clivus',
  'Cavernous_Sinus_L', 'Cavernous_Sinus_R',
  'FJ5120_BP28747_FMA52210_Right marginal sinus',
  'Posterior_Intercavernous_Sinus', 'Sphenoid venous plexus',
]);
assign('04', ['Cervical vertebral venous pleus']);
assign('05', ['Thoracic vertebral venosu plexus']);
assign('06', ['Lumbar vertebral venous plexus']);

// Complete carotid meshes cannot be split into cervical/intracranial segments
// by this viewer. File the named main trunks under Cervical Vessels.
paired('04', ['Internal carotid artery', 'Anterior spinal artery', 'Ascending pharyngeal artery']);
assign('04', ['FJ5024_BP29706_FMA49489_Anterior glandular branch of right supe']);
paired('02', ['Parieto-occipital artery', 'Medial occipital artery', 'Lateral occipital artery']);

paired('03', [
  'Anterior ethmoidal artery', 'Anterior septal branches of anterior ethmoidal artery',
  'Central retinal artery', 'Infra-orbital artery', 'Posterior ethmoidal artery',
  'Septal branches of posterior ethmoidal artery', 'Supra-orbital artery',
  'Supratrochlear artery', 'Anterior deep temporal artery', 'Lacrimal artery',
  'Long posterior ciliary arteries', 'Short posterior ciliary arteries',
  'Maxillary artery', 'Maxillary veins',
]);
assign('03', ['Orbital veins.j']);

assign('01', [
  'Anterior semilunar leaflet of pulmonary valve',
  'Left semilunar leaflet of pulmonary valve',
  'Right semilunar leaflet of pulmonary valve',
  'Inferior leaflet of right atrioventricular valve',
  'Posterior leaflet of left atrioventricular valve',
  'Septal leaflet of right atrioventricular valve',
  'Interatrial septum.j', 'Brachiocephalic trunk',
  'Left brachiocephalic vein', 'Right brachiocephalic vein',
]);

paired('08', [
  'Circumflex scapular artery', 'Circumflex scapular vein', '(Ulnar recurrent artery)',
  'Inferior ulnar collateral artery', 'Superior ulnar collateral artery',
  'Middle collateral artery', 'Radial collateral artery',
  'Dorsal carpal anastomosis', 'Palmar metacarpal arteries',
]);
paired('09', [
  'Common plantar digital arteries', 'Proper plantar digital arteries',
  'Plantar digital veins', 'Dorsal digital veins of foot', 'Dorsal digital arteries of foot',
]);

assign('06', [
  'Anterior inferior pancreaticoduodenal artery', 'Appendicular artery',
  'Gastroduodenal artery', 'Inferior pancreaticoduodenal artery', 'Marginal artery',
  'Sigmoid arteries', 'Sigmoid veins', 'Intrarenal arteries of left kidney',
  'Intrarenal arteries of right kidney',
]);
paired('07', [
  'External iliac artery', 'External iliac vein', 'Iliolumbar artery', 'Iliolumbar vein',
  'Spinal branch of iliolumbar artery', 'Lumbar branch of iliolumbar artery',
  'Iliacus branch of iliolumbar artery',
]);
paired('05', ['Subcostal artery']);
assign('05', ['Left subcostal vein', 'Right subcostal vein']);

// Creator identified this question-mark-labelled mesh as vena cardiaca parva
// (small cardiac vein). Preserve its raw name while placing it with the heart.
assign('01', ['????????']);

// The ?x pair has not been identified; do not infer its anatomy.
for (const name of ['?x.l', '?x.r']) corrections.set(name, null);

export const CARDIOVASCULAR_CORRECTIONS: ReadonlyMap<string, readonly string[] | null> = corrections;

/** Clear anatomical names also correct misplaced pulmonary and cardiac objects. */
export function reviewedCardiovascularPath(
  rawName: string,
  csvPath: readonly string[] | null,
): readonly string[] | null {
  const key = rawName.trim().toLowerCase();
  if (corrections.has(key)) return corrections.get(key) ?? null;
  if (key.startsWith('hcs_')) return ['cardiovascular-01'];
  if (/\bof (?:left|right) lung\b/.test(key)) return ['cardiovascular-05'];
  return csvPath;
}