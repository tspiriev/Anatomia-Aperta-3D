import type { SceneNode } from '../types/sketchfab';
import type { NervousGroup } from './nervousTaxonomy';
import type { SystemGroupId } from './anatomicalSystems';
import { skullBaseName as nameOf, skullBaseNervousSource, skullBaseVascularSource, skullBaseVesselKind } from './skullBaseSources';
import { trigeminalEarRole } from './trigeminalEar';
import { BRAINSTEM_GROUP, classifyBrainstemObject } from './brainstemTaxonomy';
import { isSkullBaseCervicalBone, isSkullBaseVascularContext, isSkullBaseMeningealOrigin } from './skullBaseVascularContext';
import { isSkullBaseExternalCarotid } from './skullBaseExternalCarotid';
import {
  SELLAR_CAVERNOUS_RULES, SELLAR_CAVERNOUS_LABELS, buildSellarCavernousEntry,
  sellarCavernousSystem, isSellarTransparentContext,
} from './skullBaseSellarCavernous';
import {
  PETROSAL_AUTONOMIC_RULES, PETROSAL_AUTONOMIC_LABELS, buildPetrosalAutonomicEntry, petrosalAutonomicSystem,
  isPetrosalAutonomicContext, isLesserPetrosalName,
} from './skullBasePetrosalAutonomic';
import {
  SKULL_BASE_CEREBELLUM_ENTRY, skullBaseCerebellumPathForGroup,
  isSkullBaseCerebellarSurface, isSkullBaseCerebellarStructure,
} from './skullBaseCerebellum';

export const SKULL_BASE_MODEL_UID = 'ec502e9febdd4a4c91cb52a45ac2fa98';
export const SKULL_BASE_ROOT_PATH = ['advanced-neuroanatomy', 'skull-base'] as const;
type Rule = (name: string) => boolean;
const named = (...names: string[]): Rule => {
  const keys = new Set(names.map(nameOf));
  return name => keys.has(name);
};
const sourceNerve = (pattern: RegExp): Rule => name => skullBaseNervousSource.has(name) && pattern.test(name);
const vessel = (pattern: RegExp): Rule => name => skullBaseVascularSource.has(name) && pattern.test(name);
const cn = (number: string): Rule => name => [...skullBaseNervousSource.get(name) ?? []]
  .some(collection => collection.startsWith(`NS_CN${number}_`)) && !/nucleus|nuclei/.test(name);
const jugularBulb = named('Jugular bulb', 'Superior bulb of internal jugular vein',
  'Bulb of internal jugular vein', 'Jugular vein bulb');
// Reviewed live identity: do not depend on an older CSV's spelling/membership.
const superiorPetrosalSinus = named('Superior petrosal sinus');
const colliculi = named('Superior colliculus', 'Inferior colliculus');
const jawAndTeeth = (name: string) => name === 'mandible'
  || /^(?:(?:upper|lower) )?(?:(?:first|second|third|central|medial|lateral) )?(?:canine|incisor|premolar|molar)(?: tooth)?$/.test(name)
  || /^(?:upper |lower )?teeth$/.test(name);
const reticularFormation = named('Reticular formation brainstem', 'Brainstem reticular formation',
  'Reticular formation of the brainstem', 'Reticular formation of brainstem');
const trigeminalMainTrunks = named('Trigeminal nerve', 'Trigeminal nerve (V)', 'Trigeminal nerve root',
  'Motor root of trigeminal nerve', 'Sensory root of trigeminal nerve',
  'Trigeminal nerve (Gasserian) ganglion', 'Trigeminal ganglion',
  'Ophthalmic nerve', 'Maxillary nerve', 'Mandibular nerve', 'Trigeminal nerve maxillary n (V)');
const maxillaryTrunks = named('Maxillary nerve', 'Trigeminal nerve maxillary n (V)');
export function isExcludedFromSkullBase(rawName: string): boolean {
  return reticularFormation(nameOf(rawName))
    || classifyBrainstemObject(rawName)?.join('/') === 'advanced-neuroanatomy/brainstem/nuclei/other/reticular';
}
const rules = {
  ...PETROSAL_AUTONOMIC_RULES,
  ...SELLAR_CAVERNOUS_RULES,
  frontal: named('Frontal bone', 'Frontal'),
  ethmoid: named('Ethmoid bone', 'Ethmoid'),
  nasal: named('Nasal bone', 'Nasal'),
  mandible: named('Mandible'),
  maxilla: named('Maxilla', 'Maxillary bone'),
  vomer: named('Vomer', 'Vomer bone'),
  palatine: named('Palatine bone', 'Palatine'),
  sphenoid: named('Sphenoid bone', 'Sphenoid'),
  temporal: named('Temporal bone', 'Temporal', 'Petrous bone', 'Petrous temporal bone', 'Petrous apex'),
  occipital: named('Occipital bone', 'Occipital', 'Clivus'),
  orbitBones: named('Frontal bone', 'Ethmoid bone', 'Sphenoid bone', 'Lacrimal bone', 'Zygomatic bone',
    'Maxilla', 'Palatine bone', 'Frontal', 'Ethmoid', 'Sphenoid', 'Lacrimal', 'Zygomatic', 'Palatine'),
  extraocular: (name: string) => /^(superior|inferior|medial|lateral) rectus( muscle| m)?$|^(superior|inferior) oblique( muscle| m)?$|^levator palpebrae/.test(name),
  olfactory: sourceNerve(/olfactory/), optic: cn('02'),
  oculomotor: sourceNerve(/oculomotor|oculomotr/), trochlear: cn('04'), abducens: cn('06'),
  v1: sourceNerve(/ophthalmic|nasociliary|infratrochlear|supratrochlear|supraorbital|lacrimal nerve|frontal nerve|ethmoidal nerve|long cill?iary/),
  v2: sourceNerve(/maxillary|zygomatic.*nerve|infraorbital|pterygopalatine|palatine nerve|nasopalatine|superior alveolar/),
  v3: sourceNerve(/mandibular|inferior alveolar|lingual nerve|auriculotemporal|buccal nerve|masseteric|deep temporal nerve|mylohyoid nerve/),
  trigeminal: cn('05'),
  // The V export also contains III, central tracts, nuclei and non-neural
  // references. Include its peripheral nerves/ganglia, plus V3 branches filed
  // elsewhere in the source, without changing other regional collections.
  trigeminalAllBranches: (name: string) => skullBaseNervousSource.has(name)
    && !/oculomotor|oculomotr|nucle|neucle|tract/.test(name)
    && ((cn('05')(name) && /nerve|gangli/.test(name))
      || /^(?:(?:anterior|posterior) division of mandibular nerve|mandibular nerve|lingual nerve|buccal nerve|(?:anterior |posterior |middle )?deep temporal nerve|nerve to mylohyoid(?: muscle)?|mylohyoid nerve|infra-?orbital nerve|tensor tympani nerve|nerve to (?:the )?tensor tympani(?: muscle)?)$/.test(name)),
  trigeminalTrunks: trigeminalMainTrunks,
  temporalTrigeminalTrunks: (name: string) => trigeminalMainTrunks(name) && !maxillaryTrunks(name),
  trigeminalRootGanglion: named('Trigeminal nerve root', 'Trigeminal nerve (Gasserian) ganglion',
    'Trigeminal ganglion', 'Gasserian ganglion'),
  gasserianGanglion: named('Trigeminal nerve (Gasserian) ganglion', 'Trigeminal ganglion', 'Gasserian ganglion'),
  ciliary: sourceNerve(/cill?iary/),
  ethmoidalNerves: sourceNerve(/ethmoidal nerve/),
  // Exact identities allow separately named live terminal meshes, if present.
  // The supplied export lists only the parent nerves; V2 posterior nasal nerves
  // must not be substituted for absent V1 ethmoidal terminal geometry.
  anteriorEthmoidalNerves: named('Anterior ethmoidal nerve',
    'Internal nasal branch of anterior ethmoidal nerve', 'Internal nasal branches of anterior ethmoidal nerve',
    'Medial internal nasal branches of anterior ethmoidal nerve', 'Lateral internal nasal branches of anterior ethmoidal nerve',
    'External nasal branch of anterior ethmoidal nerve', 'External nasal nerve',
    'Terminal branches of anterior ethmoidal nerve'),
  posteriorEthmoidalNerves: named('Posterior ethmoidal nerve', 'Branches of posterior ethmoidal nerve',
    'Terminal branches of posterior ethmoidal nerve'),
  facial: sourceNerve(/^facial nerve/), vestibulocochlear: cn('08'),
  petrosal: sourceNerve(/petrosal|vidian|pterygoid canal/),
  lesserPetrosal: isLesserPetrosalName,
  deepPetrosal: sourceNerve(/^deep petrosal nerve$/),
  glossopharyngeal: sourceNerve(/^glossopharyngeal nerve/),
  vagus: sourceNerve(/^vagus nerve/), accessory: sourceNerve(/^accessory nerve/), hypoglossal: cn('12'),
  innerEar: (name: string) => /cochlea|^vestibule$|semicircular|labyrinth|membranous ampulla|utricle|saccule/.test(name)
    && !/nerve|nucleus|nuclei|tract|radiation/.test(name),
  tentorium: named('Tentorium cerebelli', 'Tentorium'),
  tensorTympani: (name: string) => trigeminalEarRole(name) === 'muscle',
  trigeminalMuscles: named('Temporalis muscle', 'Temporalis', 'Masseter', 'Masseter muscle',
    'Superficial part of masseter', 'Deep part of masseter', 'Medial pterygoid muscle',
    'Lateral pterygoid muscle', 'Superior head of lateral pterygoid muscle',
    'Inferior head of lateral pterygoid muscle', 'Mylohyoid muscle',
    'Anterior belly of digastric muscle', 'Tensor veli palatini muscle', 'Tensor veli palatini'),
  malleus: named('Malleus'), incus: named('Incus'), stapes: named('Stapes'),
  tympanicMembrane: named('Tympanic membrane'),
  tympanicPlexus: named('Tympanic plexus'),
  tympanicNerve: named('Tympanic nerve (Jacobson)', 'Tympanic nerve', 'Jacobson nerve'),
  tensorTympaniNerve: (name: string) => trigeminalEarRole(name) === 'nerve',
  petrousFacial: sourceNerve(/^(facial nerve|chorda tympani|greater petrosal nerve|nerve to stapedius|geniculate ganglion)/),
  petrousVagus: sourceNerve(/^vagus nerve|^(auricular|pharyngeal) branch.*vagus|^superior laryngeal nerve|arnold.*nerve/),
  auditoryTube: (name: string) => trigeminalEarRole(name) === 'auditory-tube',
  upperCervical: named('Atlas', 'Axis', 'C1', 'C2', 'Atlas (C1)', 'Axis (C2)',
    'First cervical vertebra', 'Second cervical vertebra', 'Cervical vertebra 1', 'Cervical vertebra 2'),
  cervicalVenousPlexus: named('Cervical vertebral venous pleus', 'Cervical vertebral venous plexus',
    'Cervical vertebral venosu plexus'),
  suboccipitalSuperiorOblique: named('Obliquus superior capitis muscle', 'Obliquus capitis superior muscle',
    'Obliquus capitis superior', 'Superior oblique capitis muscle'),
  suboccipitalInferiorOblique: named('Obliquus inferior capitis muscle', 'Obliquus capitis inferior muscle',
    'Obliquus capitis inferior', 'Inferior oblique capitis muscle'),
  rectusCapitisMajor: named('Rectus posterior major capitis muscle', 'Rectus capitis posterior major muscle',
    'Rectus capitis posterior major'),
  rectusCapitisMinor: named('Rectus posterior minor capitis muscle', 'Rectus capitis posterior minor muscle',
    'Rectus capitis posterior minor'),
  brainstem: named('Midbrain', 'Pons', 'Medulla oblongata', 'Brainstem', 'Brain stem'),
  olive: named('Olive', 'Inferior olive', 'Inferior olivary nucleus'),
  basalGanglia: named('Caudate nucleus', 'Head of caudate nucleus', 'Body of caudate nucleus', 'Tail of caudate nucleus',
    'Putamen', 'Globus pallidus', 'Globus pallidus externus', 'Globus pallidus internus',
    'Nucleus accumbens', 'Subthalamic nucleus', 'Substantia nigra',
    'Substantia nigra pars compacta', 'Substantia nigra pars reticulata', 'Substantia nigra pars reticularis'),
  thalamus: named('Thalamus', '00_Thalamic_background_core', 'Thalamic capsule', 'Thalamus capsule'),
  carotid: vessel(/^internal carotid artery/),
  carotidSympathetic: named('Carotid artery sympathetic', 'Internal carotid artery sympathetic',
    'Carotid artery sympathetic plexus', 'Internal carotid artery sympathetic plexus',
    'Carotid artery symapthetic', 'Internal carotid artery symapthetic',
    'Carotid artery symapthetic plexus', 'Internal carotid artery symapthetic plexus'),
  ophthalmic: vessel(/ophthalmic artery|ethmoidal artery|central artery of retina|central retinal artery|ciliary arter|lacrimal artery|supra-?orbital artery|supratrochlear artery|dorsal nasal artery|palpebral arter|muscular branches of ophthalmic|septal branches.*ethmoidal/),
  ethmoidalArteries: vessel(/ethmoidal artery/),
  anteriorCerebral: vessel(/anterior cerebral artery|anterior communicating artery/),
  externalCarotidBranches: isSkullBaseExternalCarotid,
  maxillary: vessel(/^maxillary artery$/),
  infraorbitalArteries: vessel(/^infra-?orbital artery$/),
  posteriorSuperiorAlveolar: vessel(/^posterior superior alveolar artery$/),
  sphenopalatineBranches: vessel(/^(?:sphenopalatine artery|posterior (?:lateral nasal|septal) branches of sphenopalatine artery)$/),
  orbitalVeins: vessel(/ophthalmic vein|orbital veins/),
  facialArteries: vessel(/facial arter|angular arter|labial arter|submental arter|lateral nasal arter/),
  facialVeins: vessel(/facial vein|angular vein|labial vein|submental vein/),
  anteriorDuralSinus: vessel(/^superior sagittal sinus$/),
  meningeal: vessel(/middle meningeal artery/),
  vertebral: vessel(/^vertebral artery/),
  basilarTrunk: vessel(/^basilar artery$/),
  pica: vessel(/^posterior inferior cerebellar artery$/),
  sca: vessel(/^superior cerebellar artery$/),
  basilar: vessel(/basilar artery|cerebellar artery|pontine branches|posterior cerebral artery|labyrinthine artery/),
  carotidBranches: vessel(/internal carotid artery|anterior cerebral artery|middle cerebral artery|posterior communicating artery|anterior choroidal artery|hypophyseal arter/),
  cavernous: vessel(/^(cavernous sinus|anterior intercavernous sinus|posterior intercavernous sinus)$/),
  petrosalVeins: (name: string) => superiorPetrosalSinus(name) || vessel(/petrosal sinus|sigmoid sinus/)(name),
  petrosalSinuses: (name: string) => superiorPetrosalSinus(name) || vessel(/petrosal sinus/)(name),
  superiorPetrosalSinuses: superiorPetrosalSinus,
  inferiorPetrosalSinuses: vessel(/^inferior petrosal sinus$/),
  transverseSinuses: vessel(/(?:^| )transverse sinus$/),
  middleFossaVeins: vessel(/sphenoid venous plexus|pterygoid venous plexus|sphenoparietal sinus|superficial middle cerebral vein|deep middle cerebral vein/),
  sigmoid: vessel(/^sigmoid sinus/), jugular: vessel(/^internal jugular vein/),
  jugularBulb,
  basilarPlexus: vessel(/basilar venous plexus/),
  skullArteries: (name: string) => skullBaseVesselKind(name) === 'arterial',
  skullVeins: (name: string) => skullBaseVesselKind(name) === 'venous' || jugularBulb(name) || superiorPetrosalSinus(name),
};
type Component = keyof typeof rules;
const labels: Record<Component, string> = {
  ...PETROSAL_AUTONOMIC_LABELS,
  ...SELLAR_CAVERNOUS_LABELS,
  frontal: 'Frontal bone', ethmoid: 'Ethmoid bone', sphenoid: 'Sphenoid bone',
  nasal: 'Nasal bones',
  maxilla: 'Maxillary bones (semitransparent)', vomer: 'Vomer (semitransparent)',
  palatine: 'Palatine bones (semitransparent)',
  temporal: 'Temporal bone and petrous region', occipital: 'Occipital bone and clival region',
  orbitBones: 'Orbital bones', extraocular: 'Extraocular muscles', olfactory: 'Olfactory structures',
  optic: 'Optic nerve (II)', oculomotor: 'Oculomotor nerve (III)', trochlear: 'Trochlear nerve (IV)',
  abducens: 'Abducens nerve (VI)', v1: 'Ophthalmic division (V1)', v2: 'Maxillary division (V2)',
  v3: 'Mandibular division (V3)', trigeminal: 'Trigeminal root, ganglion and branches',
  trigeminalTrunks: 'Trigeminal roots, ganglion and main trunks only',
  temporalTrigeminalTrunks: 'Trigeminal roots, ganglion, V1 and V3 trunks',
  trigeminalRootGanglion: 'Trigeminal nerve root and Gasserian ganglion',
  gasserianGanglion: 'Gasserian (trigeminal) ganglion',
  trigeminalAllBranches: 'Trigeminal nerve, ganglia and all available branches',
  ciliary: 'Ciliary ganglion and associated nerves', ethmoidalNerves: 'Ethmoidal nerves',
  anteriorEthmoidalNerves: 'Anterior ethmoidal nerve and available terminal branches',
  posteriorEthmoidalNerves: 'Posterior ethmoidal nerve and available terminal branches',
  facial: 'Facial nerve (VII)', vestibulocochlear: 'Vestibulocochlear, cochlear and vestibular nerves',
  petrosal: 'Facial and petrosal nerve branches', glossopharyngeal: 'Glossopharyngeal nerve (IX)',
  lesserPetrosal: 'Lesser petrosal nerve', deepPetrosal: 'Deep petrosal nerve',
  vagus: 'Vagus nerve (X)', accessory: 'Accessory nerve (XI)', hypoglossal: 'Hypoglossal nerve (XII)',
  innerEar: 'Cochlea, vestibule and labyrinth', tentorium: 'Tentorium cerebelli',
  tensorTympani: 'Tensor tympani muscle',
  trigeminalMuscles: 'Trigeminal-innervated muscles (semitransparent)',
  malleus: 'Malleus', incus: 'Incus', stapes: 'Stapes',
  tympanicMembrane: 'Tympanic membrane', tympanicPlexus: 'Tympanic plexus',
  tympanicNerve: 'Tympanic nerve (Jacobson)',
  tensorTympaniNerve: 'Nerve to tensor tympani',
  petrousFacial: 'Facial nerve (VII) and temporal branches',
  petrousVagus: 'Vagus nerve (X) and local branches',
  jugularBulb: 'Jugular bulb (if separately modeled)',
  auditoryTube: 'Auditory (Eustachian) tube',
  upperCervical: 'Upper cervical vertebrae', brainstem: 'Brainstem gross anatomy (semitransparent)',
  cervicalVenousPlexus: 'Cervical vertebral venous plexus',
  suboccipitalSuperiorOblique: 'Obliquus capitis superior muscle',
  suboccipitalInferiorOblique: 'Obliquus capitis inferior muscle',
  rectusCapitisMajor: 'Rectus capitis posterior major muscle',
  rectusCapitisMinor: 'Rectus capitis posterior minor muscle',
  olive: 'Olive (semitransparent)',
  basalGanglia: 'Basal ganglia (semitransparent)', thalamus: 'Thalamus (semitransparent)',
  carotid: 'Internal carotid artery', ophthalmic: 'Ophthalmic artery and branches',
  carotidSympathetic: 'Carotid artery sympathetic plexus',
  mandible: 'Mandible (semitransparent)',
  externalCarotidBranches: 'External carotid artery and all available branches',
  ethmoidalArteries: 'Ethmoidal arteries', meningeal: 'Middle meningeal artery and branches',
  anteriorCerebral: 'Anterior cerebral and anterior communicating arteries',
  maxillary: 'Maxillary artery',
  infraorbitalArteries: 'Infra-orbital arteries',
  posteriorSuperiorAlveolar: 'Posterior superior alveolar arteries',
  sphenopalatineBranches: 'Sphenopalatine artery and nasal/septal branches',
  orbitalVeins: 'Ophthalmic and orbital veins',
  facialArteries: 'Facial arteries and branches',
  facialVeins: 'Facial veins and tributaries',
  anteriorDuralSinus: 'Superior sagittal sinus',
  vertebral: 'Vertebral arteries', basilar: 'Basilar artery and branches',
  basilarTrunk: 'Basilar artery',
  pica: 'Posterior inferior cerebellar artery (PICA)',
  sca: 'Superior cerebellar artery (SCA)',
  carotidBranches: 'Internal carotid artery and branches', cavernous: 'Cavernous and intercavernous sinuses',
  petrosalVeins: 'Petrosal and sigmoid sinuses', sigmoid: 'Sigmoid sinuses', jugular: 'Internal jugular veins',
  petrosalSinuses: 'Superior and inferior petrosal sinuses',
  superiorPetrosalSinuses: 'Superior petrosal sinuses',
  inferiorPetrosalSinuses: 'Inferior petrosal sinuses',
  transverseSinuses: 'Transverse sinuses',
  middleFossaVeins: 'Sphenoid venous plexus and middle cerebral veins',
  basilarPlexus: 'Basilar venous plexus', skullVeins: 'Jugular veins and other available veins and sinuses',
  skullArteries: 'Other available arteries and branches',
};
export type SkullBaseEntry = { id: string; label: string; components?: readonly Component[]; children?: readonly SkullBaseEntry[] };
type Entry = SkullBaseEntry;
const brainstemNuclei = BRAINSTEM_GROUP.children!.find(group => group.id.endsWith('/nuclei'))!;
const cranialNuclearLeaves = new Set([
  'gse/oculomotor', 'gse/trochlear', 'gse/abducens', 'gse/hypoglossal',
  'sve/facial', 'sve/ambiguus', 'sve/accessory',
  'gve/edinger-westphal', 'gve/superior-salivatory', 'gve/inferior-salivatory', 'gve/dorsal-vagus',
  'gsa/mesencephalic-trigeminal', 'gsa/spinal-trigeminal', 'gsa/principal-trigeminal',
  'gva-sva/solitary', 'ssa/vestibular', 'ssa/dorsal-cochlear', 'ssa/ventral-cochlear',
]);
const principalTrigeminalNucleus = named('Principal (pontine) neucleus of trigeminal nerve',
  'Principal (pontine) nucleus of trigeminal nerve', 'Principal sensory nucleus of trigeminal nerve',
  'Principal nucleus of trigeminal nerve');
const anteriorNuclearLeaves = new Set([
  'gse/oculomotor', 'gse/trochlear', 'gse/abducens', 'gve/edinger-westphal',
  'gsa/mesencephalic-trigeminal', 'gsa/spinal-trigeminal', 'gsa/principal-trigeminal',
]);
const oculomotorNuclearLeaves = new Set(['gse/oculomotor', 'gve/edinger-westphal']);
const trigeminalNuclearLeaves = new Set([
  'gsa/mesencephalic-trigeminal', 'gsa/spinal-trigeminal', 'gsa/principal-trigeminal',
]);
// Central connections of III, IV, VI and trigeminal sensory pathways, not nuclei
// physically within the cavernous sinus or motor V nuclei supplying V3.
const cavernousNuclearLeaves = new Set([
  ...oculomotorNuclearLeaves, 'gse/trochlear', 'gse/abducens', ...trigeminalNuclearLeaves,
]);
const vestibulocochlearNuclearLeaves = new Set(['ssa/vestibular', 'ssa/dorsal-cochlear', 'ssa/ventral-cochlear']);
const facialPetrosalNuclearLeaves = new Set(['sve/facial', 'gve/superior-salivatory', 'gva-sva/solitary']);
const lowerCranialNuclearLeaves = new Set([
  'gse/hypoglossal', 'sve/ambiguus', 'sve/accessory',
  'gve/inferior-salivatory', 'gve/dorsal-vagus', 'gva-sva/solitary',
]);
const middleNuclearLeaves = new Set([...cranialNuclearLeaves].filter(leaf => !lowerCranialNuclearLeaves.has(leaf)));
const petrousNuclearLeaves = new Set([
  ...lowerCranialNuclearLeaves,
  'gsa/mesencephalic-trigeminal', 'gsa/spinal-trigeminal', 'gsa/principal-trigeminal',
  'sve/facial', 'gve/superior-salivatory',
]);
function nuclearEntry(group: NervousGroup, allowed = cranialNuclearLeaves): Entry {
  const id = group.id.split('/').at(-1)!;
  const children = group.children?.filter(child => {
    const suffix = child.id.split('/').slice(3).join('/');
    return [...allowed].some(leaf => leaf === suffix || leaf.startsWith(`${suffix}/`));
  }).map(child => nuclearEntry(child, allowed));
  return { id, label: id === 'nuclei' ? 'Cranial nerve nuclei' : group.label,
    ...(children ? { children } : {}) };
}
const leaf = (id: Component): Entry => ({ id, label: labels[id], components: [id] });
const subdivision = (id: string, label: string, components: readonly Component[]): Entry =>
  ({ id, label, children: components.map(leaf) });
export const SKULL_BASE_DEFINITIONS: readonly Entry[] = [
  { id: 'anterior-fossa-orbit', label: 'Anterior cranial fossa and orbit', children: [
    subdivision('anterior-skull-base', 'Anterior Skull Base', ['frontal', 'ethmoid', 'sphenoid', 'nasal', 'mandible',
      'maxilla', 'vomer', 'palatine', 'olfactory']),
    { id: 'orbit', label: 'Orbit', children: [
      ...(['orbitBones', 'extraocular', 'optic', 'oculomotor', 'trochlear', 'abducens', 'v1', 'ciliary', 'ophthalmic'] as const).map(leaf),
      subdivision('venous', 'Venous Anatomy', ['orbitalVeins', 'cavernous']),
      leaf('brainstem'),
      { ...nuclearEntry(brainstemNuclei, oculomotorNuclearLeaves), id: 'brainstem-nuclei', label: 'Oculomotor nuclei' },
      leaf('trigeminalRootGanglion'),
    ] },
    subdivision('orbital-apex', 'Orbital Apex', ['sphenoid', 'optic', 'ophthalmic', 'oculomotor', 'trochlear', 'v1', 'abducens']),
    subdivision('ethmoidal-region', 'Ethmoidal Region', ['ethmoid', 'ethmoidalArteries', 'ophthalmic',
      'anteriorEthmoidalNerves', 'posteriorEthmoidalNerves']),
    subdivision('arterial', 'Arterial Anatomy', ['ophthalmic', 'ethmoidalArteries', 'anteriorCerebral', 'facialArteries',
      'carotid', 'maxillary', 'infraorbitalArteries',
      'posteriorSuperiorAlveolar', 'sphenopalatineBranches', 'externalCarotidBranches']),
    subdivision('venous', 'Venous Anatomy', ['orbitalVeins', 'anteriorDuralSinus', 'cavernous', 'facialVeins']),
    { ...nuclearEntry(brainstemNuclei, anteriorNuclearLeaves), id: 'brainstem-nuclei' },
    leaf('trigeminalAllBranches'),
    leaf('carotidSympathetic'),
  ] },
  { id: 'middle-fossa', label: 'Middle cranial fossa', components: ['tensorTympani'], children: [
    subdivision('sphenoid-central', 'Sphenoid and Central Skull Base', ['sphenoid', 'optic', 'carotid', 'cavernous']),
    { id: 'cavernous-sinus', label: 'Cavernous Sinus', children: [
      ...(['cavernous', 'carotid', 'oculomotor', 'trochlear',
        'v1', 'v2', 'abducens', 'trigeminalRootGanglion', 'brainstem'] as const).map(leaf),
      { ...nuclearEntry(brainstemNuclei, cavernousNuclearLeaves), id: 'brainstem-nuclei',
        label: 'Brainstem nuclei — III, IV, VI and trigeminal sensory connections' },
    ] },
    { id: 'trigeminal-region', label: 'Trigeminal Region', children: [
      { id: 'trigeminal', label: 'Trigeminal nerve, ganglion, branches and innervated muscles',
        components: ['trigeminal', 'trigeminalMuscles', 'tensorTympani', 'brainstem'] },
      ...(['v1', 'v2', 'v3'] as const).map(leaf),
      { ...nuclearEntry(brainstemNuclei, trigeminalNuclearLeaves), id: 'brainstem-nuclei', label: 'Trigeminal nerve nuclei' },
    ] },
    subdivision('foramina', 'Middle Cranial Fossa Foramina', ['sphenoid', 'temporal', 'meningeal', 'v2', 'v3', 'gasserianGanglion']),
    subdivision('venous', 'Venous Anatomy', ['cavernous', 'petrosalSinuses', 'middleFossaVeins', 'sigmoid', 'jugularBulb']),
    leaf('innerEar'),
    leaf('brainstem'),
    { ...nuclearEntry(brainstemNuclei, middleNuclearLeaves), id: 'brainstem-nuclei' },
    leaf('auditoryTube'),
    leaf('facial'),
    leaf('vestibulocochlear'),
    leaf('carotidSympathetic'),
  ] },
  { id: 'petrous-temporal', label: 'Temporal bone', components: ['tensorTympani'], children: [
    subdivision('petrous-apex', 'Petrous Bone and Petrous Apex', ['temporal']),
    { id: 'acoustic-meatus-cpa', label: 'Internal Acoustic Meatus and Cerebellopontine Angle',
      children: [
        ...(['temporal', 'petrousFacial', 'vestibulocochlear', 'brainstem'] as const).map(leaf),
        { ...nuclearEntry(brainstemNuclei, vestibulocochlearNuclearLeaves), id: 'brainstem-nuclei', label: 'Vestibular and cochlear nuclei' },
      ] },
    subdivision('inner-ear', 'Inner Ear and Labyrinth', ['innerEar', 'temporal', 'malleus', 'incus', 'stapes']),
    { id: 'middle-ear', label: 'Middle Ear and Tympanic Anatomy', children: [
      ...(['temporal', 'malleus', 'incus', 'stapes', 'tympanicMembrane', 'tympanicPlexus', 'tympanicNerve',
        'auditoryTube', 'petrousFacial', 'glossopharyngeal', 'lesserPetrosal', 'deepPetrosal'] as const).map(leaf),
      { id: 'tensorTympaniNerve', label: 'Nerve to tensor tympani and innervated muscle',
        components: ['tensorTympaniNerve', 'tensorTympani'] },
    ] },
    { id: 'facial-petrosal', label: 'Facial Nerve and Petrosal Nerves', children: [
      ...(['petrousFacial', 'petrosal', 'tympanicPlexus', 'tympanicNerve', 'temporal', 'brainstem'] as const).map(leaf),
      { ...nuclearEntry(brainstemNuclei, facialPetrosalNuclearLeaves), id: 'brainstem-nuclei',
        label: 'Facial motor, superior salivatory and solitary nuclei' },
    ] },
    subdivision('petrous-carotid', 'Petrous Carotid Region', ['carotid', 'temporal', 'temporalTrigeminalTrunks', 'petrousFacial', 'petrosal']),
    subdivision('petrosal-veins', 'Petrosal Venous Anatomy', ['superiorPetrosalSinuses', 'inferiorPetrosalSinuses', 'sigmoid', 'jugularBulb', 'jugular', 'temporal']),
    subdivision('jugular-foramen', 'Jugular Foramen and Cranial Nerves IX–X', ['temporal', 'glossopharyngeal', 'petrousVagus',
      'tympanicNerve', 'tympanicPlexus', 'petrosal', 'jugularBulb', 'jugular']),
    subdivision('surgical-relationships', 'Surgical Relationships', ['temporal', 'temporalTrigeminalTrunks', 'petrousFacial', 'vestibulocochlear', 'carotid', 'petrosalVeins', 'brainstem']),
    leaf('auditoryTube'),
    { ...nuclearEntry(brainstemNuclei, petrousNuclearLeaves), id: 'brainstem-nuclei' },
    leaf('carotidSympathetic'),
  ] },
  { id: 'posterior-fossa', label: 'Posterior cranial fossa', components: ['tensorTympani'], children: [
    subdivision('clivus-petroclival', 'Clivus and Petroclival Region', ['occipital', 'sphenoid', 'temporal', 'basilar', 'basilarPlexus', 'abducens', 'trigeminalRootGanglion', 'brainstem']),
    { id: 'cpa', label: 'Cerebellopontine Angle', children: [
      ...['facial', 'vestibulocochlear', 'trigeminalRootGanglion', 'basilar', 'petrosalVeins', 'brainstem',
        'glossopharyngeal', 'vagus', 'accessory', 'hypoglossal'].map(id => leaf(id as Component)),
      { id: 'cerebellum', label: 'Cerebellum — whole (semitransparent)' },
    ] },
    subdivision('jugular-foramen', 'Jugular Foramen Region', ['glossopharyngeal', 'vagus', 'accessory', 'sigmoid', 'jugular', 'temporal', 'occipital', 'brainstem']),
    subdivision('foramen-magnum', 'Foramen Magnum Region', ['occipital', 'vertebral', 'hypoglossal', 'upperCervical', 'brainstem',
      'cervicalVenousPlexus', 'suboccipitalSuperiorOblique', 'suboccipitalInferiorOblique',
      'rectusCapitisMajor', 'rectusCapitisMinor', 'sigmoid', 'jugularBulb', 'glossopharyngeal', 'vagus', 'accessory']),
    subdivision('venous', 'Venous Anatomy', ['sigmoid', 'transverseSinuses', 'superiorPetrosalSinuses', 'inferiorPetrosalSinuses']),
    { id: 'cerebellum', label: 'Cerebellum — whole (semitransparent)' },
    SKULL_BASE_CEREBELLUM_ENTRY,
    { ...nuclearEntry(brainstemNuclei), id: 'brainstem-nuclei' },
  ] },
  { id: 'vascular', label: 'Skull base vascular anatomy', children: [
    subdivision('arterial', 'Arterial Anatomy', ['carotidBranches', 'ophthalmic', 'meningeal', 'vertebral', 'basilar', 'skullArteries']),
    { id: 'venous', label: 'Venous Anatomy', children: [
      leaf('cavernous'),
      { id: 'petrosalVeins', label: 'Superior petrosal and sigmoid sinuses',
        components: ['superiorPetrosalSinuses', 'sigmoid'] },
      leaf('basilarPlexus'), leaf('inferiorPetrosalSinuses'), leaf('skullVeins'),
    ] },
    { id: 'bones', label: 'Bones (semitransparent)' },
    { id: 'cerebellum', label: 'Cerebellum — whole (semitransparent)' },
  ] },
  buildPetrosalAutonomicEntry(leaf, (label, allowed) => ({
    ...nuclearEntry(brainstemNuclei, new Set(allowed)), id: 'brainstem-nuclei', label,
  })),
  buildSellarCavernousEntry(leaf, () => ({
    ...nuclearEntry(brainstemNuclei, cavernousNuclearLeaves), id: 'brainstem-nuclei',
    label: 'Brainstem nuclei — III, IV, VI and trigeminal sensory connections',
  })),
];

const componentsByPath = new Map<string, readonly Component[]>();
function register(entry: Entry, parent: readonly string[]): NervousGroup {
  const path = [...parent, entry.id];
  const children = entry.children?.map(child => register(child, path));
  componentsByPath.set(path.join('/'), [...new Set([...entry.components ?? [],
    ...entry.children?.flatMap(child => componentsByPath.get([...path, child.id].join('/')) ?? []) ?? []])]);
  return { id: path.join('/'), label: entry.label, ...(children ? { children } : {}) };
}
export const SKULL_BASE_GROUPS = SKULL_BASE_DEFINITIONS.map(entry => register(entry, SKULL_BASE_ROOT_PATH));
function collectNuclearPaths(groups: readonly NervousGroup[]): string[][] {
  return groups.flatMap(group => [
    ...(group.id.endsWith('/brainstem-nuclei') ? [group.id.split('/')] : []),
    ...collectNuclearPaths(group.children ?? []),
  ]);
}
// General regional nuclear controls keep their routing priority; nested Orbit
// controls use the same classifier with their narrower registered memberships.
const brainstemNuclearPaths = collectNuclearPaths(SKULL_BASE_GROUPS).sort((a, b) => a.length - b.length);
componentsByPath.set(SKULL_BASE_ROOT_PATH.join('/'), Object.keys(rules) as Component[]);
const within = (path: readonly string[], parent: readonly string[]) => parent.every((part, i) => path[i] === part);
function matches(component: Component, name: string): boolean {
  if (component === 'skullArteries' && ['carotidBranches', 'ophthalmic', 'meningeal', 'vertebral', 'basilar']
    .some(id => rules[id as Component](name))) return false;
  if (component === 'skullVeins' && ['cavernous', 'petrosalVeins', 'basilarPlexus']
    .some(id => rules[id as Component](name))) return false;
  return rules[component](name);
}
export function skullBasePathForGroup(node: SceneNode, requested: readonly string[]): readonly string[] | null {
  if (!within(requested, SKULL_BASE_ROOT_PATH) || isExcludedFromSkullBase(node.rawName)) return null;
  if (isSkullBaseMeningealOrigin(node, requested)) return requested;
  const cerebellarPath = skullBaseCerebellumPathForGroup(node.rawName, requested);
  if (cerebellarPath) return cerebellarPath;
  const vascularBones = [...SKULL_BASE_ROOT_PATH, 'vascular', 'bones'];
  if (within(vascularBones, requested) && skullBaseSystemForNode(node) === 'skeletal') return vascularBones;
  // The olive is not requested in any Skull base collection.
  if (rules.olive(nameOf(node.rawName))) return null;
  const nuclearPath = classifyBrainstemObject(node.rawName);
  const cranialNuclearPath = principalTrigeminalNucleus(nameOf(node.rawName))
    ? ['gsa', 'principal-trigeminal']
    : nuclearPath?.[2] === 'nuclei' && cranialNuclearLeaves.has(nuclearPath.slice(3).join('/'))
      ? nuclearPath.slice(3) : null;
  if (cranialNuclearPath) {
    return brainstemNuclearPaths.map(root => [...root, ...cranialNuclearPath])
      .find(path => within(path, requested) && componentsByPath.has(path.join('/'))) ?? null;
  }
  // Keep the shared Brainstem atlas intact, but never route its relay, motor
  // modulation or tectal nuclei into a Skull base collection.
  if (nuclearPath?.[2] === 'nuclei') return null;
  const name = nameOf(node.rawName);
  if (!(componentsByPath.get(requested.join('/')) ?? []).some(id => matches(id, name))) return null;
  return [...componentsByPath].find(([key, ids]) => within(key.split('/'), requested)
    && ids.some(id => matches(id, name))
    && ![...componentsByPath.keys()].some(other => other.startsWith(`${key}/`)))?.[0].split('/') ?? requested;
}
export function skullBaseSystemForNode(node: SceneNode): SystemGroupId | null {
  const name = nameOf(node.rawName);
  const sellarSystem = sellarCavernousSystem(node);
  if (sellarSystem) return sellarSystem;
  // These meshes can inherit another system from the combined source export.
  // Classify them explicitly so the existing vascular Bones collection includes them.
  if (jawAndTeeth(name) || isSkullBaseCervicalBone(name)) return 'skeletal';
  if (isSkullBaseCerebellarStructure(node.rawName)) return 'nervous';
  const autonomicSystem = petrosalAutonomicSystem(node);
  if (autonomicSystem) return autonomicSystem;
  if (rules.carotidSympathetic(name)) return 'nervous';
  if (skullBaseVascularSource.has(name) || skullBaseVesselKind(name) || jugularBulb(name) || superiorPetrosalSinus(name)
    || rules.cervicalVenousPlexus(name)) return 'vascular';
  if (rules.extraocular(name) || rules.tensorTympani(name) || rules.trigeminalMuscles(name)
    || rules.suboccipitalSuperiorOblique(name) || rules.suboccipitalInferiorOblique(name)
    || rules.rectusCapitisMajor(name) || rules.rectusCapitisMinor(name)) return 'muscular';
  if (rules.auditoryTube(name) || rules.innerEar(name) || trigeminalEarRole(name) === 'middle-ear') return 'organs';
  if (['frontal', 'ethmoid', 'sphenoid', 'nasal', 'maxilla', 'vomer', 'palatine', 'temporal', 'occipital', 'orbitBones', 'upperCervical']
    .some(id => rules[id as Component](name))) return 'skeletal';
  if (skullBaseNervousSource.has(name) || rules.brainstem(name) || rules.basalGanglia(name) || rules.thalamus(name)) return 'nervous';
  return node.systemId;
}
export function isSkullBaseContext(node: SceneNode): boolean {
  if (isExcludedFromSkullBase(node.rawName)) return false;
  if (isSkullBaseCerebellarSurface(node.rawName)) return true;
  if (colliculi(nameOf(node.rawName))) return true;
  if (rules.olive(nameOf(node.rawName))) return true;
  // Nuclear source geometry is foreground anatomy, not a gross brainstem shell.
  if (classifyBrainstemObject(node.rawName)?.[2] === 'nuclei') return false;
  const name = nameOf(node.rawName);
  return ['skeletal', 'muscular'].includes(skullBaseSystemForNode(node) ?? '')
    || rules.brainstem(name) || rules.basalGanglia(name) || rules.thalamus(name);
}
export function skullBaseBoneTransparencyPlan(
  nodes: readonly SceneNode[], contextIds: readonly number[], enabled: boolean,
) {
  const boneIds = nodes.filter(node => skullBaseSystemForNode(node) === 'skeletal').map(node => node.instanceID);
  const bones = new Set(boneIds);
  return {
    contextIds: enabled ? [...new Set([...contextIds, ...boneIds])] : contextIds.filter(id => !bones.has(id)),
    opaqueBoneIds: enabled ? [] : boneIds,
  };
}
export function skullBaseContextIds(nodes: readonly SceneNode[], path: readonly string[]): number[] {
  return nodes.filter(node => isPetrosalAutonomicContext(node, path) || isSkullBaseVascularContext(node, path)
    || (skullBasePathForGroup(node, path) && (isSkullBaseContext(node) || isSellarTransparentContext(node, path))))
    .map(node => node.instanceID);
}
