import type { NervousGroup } from './nervousTaxonomy';
import { skullBaseName, skullBaseNervousSource } from './skullBaseSources';
import { cervicalNerveName } from './headNeckCervicalNerves';

export const SUBMENTAL_PATH = ['advanced-neuroanatomy', 'head-neck-topography', 'anterior-triangle', 'submental'];
const branches = [
  ['mandibular', 'Mandibular nerve (V3)', [
    'mandibular nerve', 'trunk of mandibular nerve', 'mandibular nerve (v3)',
    'mandibular nerve (v)', 'trigeminal nerve mandibular n (v)', 'mandibular division of trigeminal nerve',
  ]],
  ['posterior-division', 'Posterior division of mandibular nerve', ['posterior division of mandibular nerve']],
  ['inferior-alveolar', 'Inferior alveolar nerve', ['inferior alveolar nerve', 'trunk of inferior alveolar nerve']],
  ['mylohyoid', 'Nerve to mylohyoid', ['mylohyoid nerve', 'nerve to mylohyoid', 'nerve to mylohyoid muscle']],
] as const;
const branchByName = new Map<string, string>(branches.flatMap(([id, , names]) => names.map(name => [name, id] as const)));
export function submentalMandibularPart(rawName: string): string | null {
  return branchByName.get(cervicalNerveName(rawName)) ?? null;
}
export const SUBMENTAL_MANDIBULAR_GROUP: NervousGroup = {
  id: [...SUBMENTAL_PATH, 'nerves', 'mandibular-pathway'].join('/'),
  label: 'Mandibular → inferior alveolar → mylohyoid pathway',
  children: branches.map(([id, label]) => ({
    id: [...SUBMENTAL_PATH, 'nerves', 'mandibular-pathway', id].join('/'), label,
  })),
};
export const SUBMENTAL_BRAINSTEM_GROUP: NervousGroup = {
  id: [...SUBMENTAL_PATH, 'brainstem-context'].join('/'), label: 'Brainstem (semitransparent)',
};

/** The anterior-neck cranial inventory is IX–XII. The requested V3 origin
 * chain is a separate, explicit submental teaching exception. Other atlases
 * and the standalone Head collections keep their original memberships. */
export function isCaudalCranialNerve(rawName: string): boolean {
  const name = cervicalNerveName(rawName);
  if (/nucle|neucle|tract|fascicl|fiber|gyrus|sulcus/.test(name)
    || (/muscle|arter|vein|bone|fascia/.test(name) && !/\bnerve\b/.test(name))) return false;
  return [...skullBaseNervousSource.get(skullBaseName(rawName)) ?? []]
    .some(c => /^NS_CN(?:09|10|11|12)_/.test(c))
    || /glossopharyngeal|vagus|accessory nerve|hypoglossal|laryngeal nerve/.test(name);
}
export function isUpperCranialNerve(rawName: string): boolean {
  if (submentalMandibularPart(rawName)) return true;
  if (isCaudalCranialNerve(rawName)) return false;
  const source = [...skullBaseNervousSource.get(skullBaseName(rawName)) ?? []];
  if (source.some(c => /^NS_CN(?:09|10|11|12)_/.test(c))) return false;
  if (source.some(c => /^NS_CN0[1-8]_/.test(c))) return true;
  const name = cervicalNerveName(rawName);
  if (/glossopharyngeal|vagus|accessory nerve|hypoglossal|ansa cervical|phrenic/.test(name)) return false;
  return /olfactory|optic nerve|oculomot|trochlear nerve|trigeminal|ophthalmic nerve|maxillary nerve|mandibular nerve|abducens|facial nerve|vestibulo|cochlear|auriculotemporal|lingual nerve|mental nerve|incisive nerve|alveolar nerve|buccal nerve|masseteric nerve|pterygoid nerve|tympani nerve|petrosal nerve|chorda tympani|ciliary gangli|cilliary gangli|otic gangli|geniculate gangli|pterygopalatine gangli|submandibular gangli|submadinular gangli/.test(name);
}
