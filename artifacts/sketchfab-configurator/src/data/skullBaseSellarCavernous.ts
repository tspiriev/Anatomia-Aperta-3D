import type { SceneNode } from '../types/sketchfab';
import type { SystemGroupId } from './anatomicalSystems';
import type { SkullBaseEntry } from './skullBaseTaxonomy';
import { skullBaseName } from './skullBaseSources';

export const SELLAR_CAVERNOUS_ID = 'sella-cavernous-sinus';
const named = (...names: string[]) => {
  const keys = new Set(names.map(skullBaseName));
  return (name: string) => keys.has(name);
};

// Explicit identities admit newly named live meshes without treating a whole
// trigeminal export (including V3 branches and central tracts) as regional nerves.
const neuralRules = {
  sellarHypothalamus: named('Hypothalamus', 'Hypothalamic capsule', 'Hypothalamus capsule', 'Capsule of hypothalamus'),
  sellarOpticNerves: named('Optic nerve', 'Optic nerves', 'Optic nerve (II)'),
  sellarOpticChiasm: named('Optic chiasm', 'Optic chiasma'),
  sellarOpticTracts: named('Optic tract', 'Optic tracts'),
  sellarPeduncles: named('Superior cerebellar peduncle', 'Middle cerebellar peduncle',
    'Inferior cerebellar peduncle', 'Brachium conjunctivum', 'Brachium pontis',
    'Restiform body', 'Juxtarestiform body'),
  sellarIII: named('Oculomotor nerve', 'Oculomotor nerve (III)',
    'Oculomotor nerve (cisternal and cavernous part)'),
  sellarIV: named('Trochlear nerve', 'Trochlear nerve (IV)'),
  sellarVI: named('Abducens nerve', 'Abducens nerve (VI)'),
  sellarV1: named('Ophthalmic nerve', 'Ophthalmic nerve (V1)', 'Ophthalmic nerve (V)',
    'Frontal nerve', 'Lacrimal nerve', 'Supraorbital nerve', 'Supratrochlear nerve',
    'Nasociliary nerve', 'Infratrochlear nerve', 'Anterior ethmoidal nerve', 'Posterior ethmoidal nerve',
    'Long ciliary nerve', 'Long ciliary nerves', 'Long cilliary nerve',
    'Communicating branch of nasociliary nerve to ciliary ganglion',
    'Communicating branch of nasociliary nerve to cilliary ganglion',
    'Communicating branch of right nasociliary nerve to cilliary ganglion',
    'Communicating branch of right nasociliary nerve to ciliary ganglion',
    'Communicating branch of left nasociliary nerve to cilliary ganglion',
    'Communicating branch of left nasociliary nerve to ciliary ganglion',
    'Internal nasal branch of anterior ethmoidal nerve', 'Internal nasal branches of anterior ethmoidal nerve',
    'Medial internal nasal branches of anterior ethmoidal nerve', 'Lateral internal nasal branches of anterior ethmoidal nerve',
    'External nasal branch of anterior ethmoidal nerve', 'External nasal nerve',
    'Terminal branches of anterior ethmoidal nerve', 'Branches of posterior ethmoidal nerve',
    'Terminal branches of posterior ethmoidal nerve', 'Recurrent meningeal branch of ophthalmic nerve',
    'Tentorial branch of ophthalmic nerve'),
  sellarV2Trunk: named('Maxillary nerve', 'Maxillary nerve (V2)', 'Trigeminal nerve maxillary n (V)'),
  sellarV2Zygomatic: named('Zygomatic nerve'),
  sellarV2Infraorbital: named('Infraorbital nerve', 'Infra-orbital nerve'),
  sellarV2Ganglionic: named('Ganglionic branch of maxillary nerve'),
  // Do not substitute anterior/posterior divisions if the trunk is not modeled.
  sellarV3Trunk: named('Mandibular nerve', 'Mandibular nerve (V3)', 'Trigeminal nerve mandibular n (V)'),
};
const pituitary = named('Pituitary gland', 'Pituitary', 'Hypophysis', 'Adenohypophysis', 'Neurohypophysis',
  'Anterior lobe of pituitary gland', 'Posterior lobe of pituitary gland', 'Pituitary stalk', 'Infundibular stalk');
export const SELLAR_CAVERNOUS_RULES = {
  ...neuralRules,
  sellarPituitary: pituitary,
  sellarCavernousSinuses: named('Cavernous sinus', 'Cavernous sinuses'),
  sellarAnteriorIntercavernous: named('Anterior intercavernous sinus'),
  sellarPosteriorIntercavernous: named('Posterior intercavernous sinus'),
  sellarOphthalmicArtery: named('Ophthalmic artery'),
};
export const SELLAR_CAVERNOUS_LABELS: Record<keyof typeof SELLAR_CAVERNOUS_RULES, string> = {
  sellarHypothalamus: 'Hypothalamus — outer surface (semitransparent)',
  sellarPituitary: 'Pituitary gland and available lobes / stalk',
  sellarOpticNerves: 'Optic nerves (II)',
  sellarOpticChiasm: 'Optic chiasm',
  sellarOpticTracts: 'Optic tracts',
  sellarPeduncles: 'Cerebellar peduncles — available meshes (semitransparent)',
  sellarIII: 'Oculomotor nerve (III) — cisternal / cavernous trunk',
  sellarIV: 'Trochlear nerve (IV)',
  sellarVI: 'Abducens nerve (VI)',
  sellarV1: 'V1 — ophthalmic nerve and all available branches',
  sellarV2Trunk: 'Maxillary nerve (V2) — main trunk',
  sellarV2Zygomatic: 'Zygomatic nerve — main branch only',
  sellarV2Infraorbital: 'Infraorbital nerve — main branch only',
  sellarV2Ganglionic: 'Ganglionic branch of maxillary nerve',
  sellarV3Trunk: 'V3 — mandibular trunk only (where separately modeled)',
  sellarCavernousSinuses: 'Cavernous sinuses',
  sellarAnteriorIntercavernous: 'Anterior intercavernous sinus',
  sellarPosteriorIntercavernous: 'Posterior intercavernous sinus',
  sellarOphthalmicArtery: 'Ophthalmic artery',
};

export function sellarCavernousSystem(node: SceneNode): SystemGroupId | null {
  const name = skullBaseName(node.rawName);
  if (pituitary(name)) return 'organs';
  if (Object.values(neuralRules).some(matches => matches(name))) return 'nervous';
  if ([SELLAR_CAVERNOUS_RULES.sellarCavernousSinuses, SELLAR_CAVERNOUS_RULES.sellarAnteriorIntercavernous,
    SELLAR_CAVERNOUS_RULES.sellarPosteriorIntercavernous,
    SELLAR_CAVERNOUS_RULES.sellarOphthalmicArtery].some(matches => matches(name))) return 'vascular';
  return null;
}

/** Fade peduncles only in the requested sellar category, not in other atlases. */
export function isSellarPeduncleContext(node: SceneNode, path: readonly string[]): boolean {
  return path[0] === 'advanced-neuroanatomy' && path[1] === 'skull-base'
    && path[2] === SELLAR_CAVERNOUS_ID && neuralRules.sellarPeduncles(skullBaseName(node.rawName));
}

/** Only the gross hypothalamic envelope fades; its individual nuclei do not. */
export function isSellarHypothalamusContext(node: SceneNode, path: readonly string[]): boolean {
  return path[0] === 'advanced-neuroanatomy' && path[1] === 'skull-base'
    && path[2] === SELLAR_CAVERNOUS_ID && neuralRules.sellarHypothalamus(skullBaseName(node.rawName));
}

export function isSellarTransparentContext(node: SceneNode, path: readonly string[]): boolean {
  return isSellarPeduncleContext(node, path) || isSellarHypothalamusContext(node, path);
}

type Component = NonNullable<SkullBaseEntry['components']>[number];
export function buildSellarCavernousEntry(
  leaf: (id: Component) => SkullBaseEntry, nuclei: () => SkullBaseEntry,
): SkullBaseEntry {
  const section = (id: string, label: string, ids: readonly Component[]): SkullBaseEntry =>
    ({ id, label, children: ids.map(leaf) });
  return { id: SELLAR_CAVERNOUS_ID, label: 'Sella and cavernous sinus', children: [
    { id: 'orientation', label: 'Sellar bone and brainstem orientation (semitransparent)', children: [
      { ...leaf('sphenoid'), label: 'Sphenoid bone — sellar context (whole available mesh)' },
      leaf('brainstem'), leaf('sellarPeduncles'),
    ] },
    section('sellar-structures', 'Pituitary gland and hypothalamus', ['sellarPituitary', 'sellarHypothalamus']),
    section('optic-pathway', 'Optic nerves → chiasm → optic tracts', [
      'sellarOpticNerves', 'sellarOpticChiasm', 'sellarOpticTracts',
    ]),
    section('venous', 'Cavernous and intercavernous sinuses', [
      'sellarCavernousSinuses', 'sellarAnteriorIntercavernous', 'sellarPosteriorIntercavernous',
    ]),
    section('carotid-sympathetic', 'Internal carotid artery and sympathetic connections', [
      'carotid', 'sellarOphthalmicArtery', 'carotidSympathetic', 'deepPetrosal',
    ]),
    { id: 'nerves', label: 'Cavernous nerves and selected trigeminal branches', children: [
      leaf('sellarIII'), leaf('sellarIV'), leaf('sellarVI'), leaf('trigeminalRootGanglion'), leaf('sellarV1'),
      section('v2', 'V2 — trunk and main branches only', [
        'sellarV2Trunk', 'sellarV2Zygomatic', 'sellarV2Infraorbital', 'sellarV2Ganglionic',
      ]),
      leaf('sellarV3Trunk'),
    ] },
    nuclei(),
  ] };
}
