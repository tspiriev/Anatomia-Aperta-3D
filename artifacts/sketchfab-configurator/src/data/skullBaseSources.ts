import nervousCsv from '@assets/Nervous_system_CLean_1792051238150.csv?raw';
import vascularCsv from '@assets/Cardiovascular_system_1792359799661.csv?raw';
import { normalizeAdvancedObjectName } from './advancedCollection';

// Keep these exports local to this atlas: the supplied vascular file must not
// silently replace the reviewed cardiovascular hierarchy in the full atlas.
function readSource(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (quoted && csv[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted;
    } else if (ch === ',' && !quoted) { row.push(field); field = ''; }
    else if (ch === '\n' && !quoted) { rows.push([...row, field.replace(/\r$/, '')]); row = []; field = ''; }
    else field += ch;
  }
  if (row.length || field) rows.push([...row, field]);
  const objects = new Map<string, Set<string>>();
  const parents = new Map<string, string>();
  for (const r of rows) if (r[0] === 'COLLECTION') parents.set(r[1], r[2]);
  for (const r of rows) {
    if (r[0] !== 'OBJECT' || !['MESH', 'CURVE'].includes(r[5]) || !r[4]) continue;
    const key = skullBaseName(r[4]);
    const memberships = objects.get(key) ?? new Set<string>();
    let collection: string | undefined = r[1];
    const visited = new Set<string>();
    while (collection && !visited.has(collection)) {
      visited.add(collection); memberships.add(collection); collection = parents.get(collection);
    }
    objects.set(key, memberships);
  }
  return objects;
}

export function skullBaseName(name: string): string {
  return normalizeAdvancedObjectName(name).replace(/^(left|right) /, '').replace(/ (left|right)$/, '')
    .replace(/ ([lr])$/, '').replace(/\s+/g, ' ');
}
export const skullBaseNervousSource = readSource(nervousCsv);
export const skullBaseVascularSource = readSource(vascularCsv);

// Explicit arterial branches whose exported names do not contain "artery".
const arterialBranches = new Set([
  'Branch to angular gyrus', 'Posterior temporal branch', 'Temporo-occipital branch',
  'Anterior temporal branch', 'Distal lateral striate branches', 'Proximal lateral striate branches',
  'FJ5024_BP29706_FMA49489_Anterior glandular branch of right supe',
].map(skullBaseName));

/** Classify source-backed vessels, not every object exported in the cardiovascular file. */
export function skullBaseVesselKind(rawName: string): 'arterial' | 'venous' | null {
  const name = skullBaseName(rawName);
  // The creator identified the six/eight-question-mark object as the small cardiac
  // vein. The separate ?x pair is still unidentified and must not be guessed.
  if (/^\?{6}$|^\?{8}$/.test(name) && skullBaseVascularSource.has('????????')) return 'venous';
  if (!skullBaseVascularSource.has(name) || /(?:^hcs |valve|leaflet|septum)/.test(name)) return null;
  if (/vein|venous|venosu|sinus|vena cava/.test(name)) return 'venous';
  if (/arter|aorta/.test(name) || arterialBranches.has(name)
    || /^(?:brachiocephalic|costocervical|thyrocervical|coeliac) trunk$/.test(name)
    || /^(?:superficial palmar|deep palmar|plantar) arch$/.test(name)
    || /^(?:dorsal carpal|patellar) anastomosis$/.test(name)) return 'arterial';
  return null;
}
