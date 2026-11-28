import nervousCsv from '@assets/Nervous_system_CLean_1791612986964.csv?raw';
import muscleCsv from '@assets/0_Final_Muscles_fused__1791947151699.csv?raw';
import { normalizeAdvancedObjectName } from './advancedCollection';
import { OLFACTORY_BASAL_FOREBRAIN_GROUP, olfactoryBasalForebrainPath, olfactoryAnatomyAliasPath } from './olfactoryBasalForebrain';
import { classifyBrainGrossAnatomy } from './brainGrossAnatomy';
import { VESTIBULOCOCHLEAR_GROUP, vestibulocochlearPathForGroup, isCochlearNervousName, isCochlearContextPath } from './cochlearTaxonomy';
import { vagalMuscleNames, esophagealPlexusNames, vagusBackdropRole } from './vagusTargets';
import { opticAnatomyAliasRole, isOpticOccipitalContext } from './opticVisualContext';
import { CRANIAL_OVERVIEW_GROUP, cranialOverviewRole } from './cranialOverview';
import { TRIGEMINAL_MOTOR_NUCLEUS_NAMES } from './trigeminalMotorNucleus';
import { TRIGEMINAL_EAR_GROUP, trigeminalEarRole } from './trigeminalEar';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';

// CSV-aware parsing preserves quoted names and collection memberships.
function parseCsv(source: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], value = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"') {
      if (quoted && source[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && (ch === ',' || ch === '\n')) {
      row.push(value.replace(/\r$/, '')); value = '';
      if (ch === '\n') { rows.push(row); row = []; }
    } else value += ch;
  }
  if (value || row.length) { row.push(value.replace(/\r$/, '')); rows.push(row); }
  const header = rows.shift()!;
  return rows.filter(row => row.length > 1).map(row => Object.fromEntries(header.map((key, i) => [key, row[i] ?? ''])));
}
const nervousRows = parseCsv(nervousCsv);
const muscleRows = parseCsv(muscleCsv);
const parents = new Map(nervousRows.filter(row => row.row_type === 'COLLECTION')
  .map(row => [row.collection_name, row.parent_collection]));
function within(name: string, root: string): boolean {
  const visited = new Set<string>();
  while (name && !visited.has(name)) {
    if (name === root) return true;
    visited.add(name); name = parents.get(name) ?? '';
  }
  return false;
}

const definitions = [
  ['i', 'Olfactory', 'NS_CN01_OLFACTORY'], ['ii', 'Optic', 'NS_CN02_OPTIC'],
  ['iii', 'Oculomotor', 'NS_CN03_OCULOMOTOR'], ['iv', 'Trochlear', 'NS_CN04_TROCHLEAR'],
  ['v', 'Trigeminal', 'NS_CN05_TRIGEMINAL'], ['vi', 'Abducens', 'NS_CN06_ABDUCENS'],
  ['vii', 'Facial', 'NS_CN07_FACIAL'], ['viii', 'Vestibulocochlear', 'NS_CN08_VESTIBULOCOCHLEAR'],
  ['ix', 'Glossopharyngeal', 'NS_CN09_GLOSSOPHARYNGEAL'], ['x', 'Vagus', 'NS_CN10_VAGUS'],
  ['xi', 'Accessory', 'NS_CN11_ACCESSORY'], ['xii', 'Hypoglossal', 'NS_CN12_HYPOGLOSSAL'],
] as const;
const roleLabels = {
  brain: 'Brain structures (semitransparent)', tracts: 'Fiber tracts',
  nuclei: 'Nuclei', ganglia: 'Ganglia', nerves: 'Nerve and branches',
  muscles: 'Innervated muscles', targets: 'Other source structures',
  eyes: 'Eye structures', thalamus: 'Thalamus (semitransparent)',
  'visual-cortex': 'Occipital lobe structures (semitransparent)',
  'temporal-context': 'Temporal lobe structures (semitransparent)',
  ventricles: 'Lateral and third ventricles',
  annulus: 'Annulus of Zinn (common tendinous rings)',
  'bone-context': 'Orbital bones (semitransparent)',
  'thalamic-nuclei': 'Thalamic relay nuclei (VPM)',
  'ascending-fibers': 'Ascending somatosensory fibers (face)',
  'sensory-cortex': 'Postcentral gyri (somatosensory cortex, semitransparent)',
  'central-sulcus': 'Central sulci (semitransparent)',
  'mandibular-posterior': 'Posterior division of mandibular nerve',
  'mandibular-anterior': 'Anterior division of mandibular nerve',
  'chorda-tympani': 'Chorda tympani (VII) and associated nuclei',
  'trigeminal-connections': 'VII–V communicating pathways',
  'tongue-taste': 'Tongue — VII taste in anterior two-thirds (chorda tympani)',
  'petrosal-connections': 'Petrosal pathway (communicating nerves)',
  'tympanic-pathway': 'Tympanic–lesser petrosal–otic pathway',
  'vagus-vessels': 'Thoracic great vessels (semitransparent)',
  'vagus-viscera': 'Trachea, esophagus, esophageal plexus and stomach (semitransparent)',
  'cardiac-connections': 'Cardiac and aortic plexuses (communicating pathways)',
};
type Role = keyof typeof roleLabels;
type Membership = { name: string; role: Role };
const memberships = new Map<string, Map<string, Membership>>();
const facialMuscles = new Set([
  'Frontalis muscle', 'Corrugator supercilii', 'Procerus muscle',
  'Depressor anguli oris', 'Depressor labii inferioris', 'Depressor septi nasi',
  'Levator anguli oris', 'Levator labii superioris', 'Nasalis muscle', 'Orbicularis oris muscle',
  'Orbital part of orbicularis oculi', 'Palpebral part of orbicularis oculi',
  'Risorius muscle', 'Zygomaticus major muscle', 'Zygomaticus minor muscle',
  'Platysma', 'Posterior belly of digastric muscle', 'Stylohyoid muscle',
].map(normalizeAdvancedObjectName));
const oculomotorMuscles = new Set([
  'Superior rectus muscle', 'Inferior rectus muscle', 'Medial rectus muscle',
  'Inferior oblique muscle', 'Levator palpebrae superioris',
].map(normalizeAdvancedObjectName));
const masticatoryMuscles = new Set([
  'Temporalis muscle', 'Superficial part of masseter', 'Deep part of masseter',
  'Medial pterygoid muscle', 'Superior head of lateral pterygoid muscle',
  'Inferior head of lateral pterygoid muscle',
].map(normalizeAdvancedObjectName));
const posteriorMandibularBranches = new Set([
  'Posterior division of mandibular nerve', 'Auriculotemporal nerve', 'Lingual nerve',
  'Inferior alveolar nerve', 'Trunk of right inferior alveolar nerve',
  'Mental nerve', 'Right mental nerve', 'Nerve to mylohyoid muscle',
].map(normalizeAdvancedObjectName));
const anteriorMandibularBranches = new Set([
  'Anterior division of mandibular nerve', 'Buccal nerve', 'Right masseteric nerve',
  'Lateral pterygoid nerve', 'Medial pterygoid nerve',
].map(normalizeAdvancedObjectName));
const chordaTympaniPathway = new Set([
  'Chorda tympani', 'Superior salivatory nucleus', 'Nucleus of solitary tract',
].map(normalizeAdvancedObjectName));
const facialTrigeminalConnections = new Set([
  'Lingual nerve', 'Zygomatic nerve', 'Lacrimal nerve', 'Frontal nerve', 'Ophthalmic nerve', 'Maxillary nerve',
  'Ganglionic branch of maxillary nerve', 'Posterior division of mandibular nerve',
  'Trigeminal nerve maxillary n (V)', 'Trigeminal nerve (Gasserian) ganglion', 'Trigeminal ganglion',
  'Trigeminal nerve root', 'Trigeminal nerve (cisternal part)', 'Cisternal segment of trigeminal nerve',
].map(normalizeAdvancedObjectName));
const facialExcludedBranches = new Set(['Tensor tympani nerve', 'Lesser petrosal nerve', 'Spinal trigeminal tract'].map(normalizeAdvancedObjectName));
const nasociliaryCommunicatingBranches = [
  'Communicating branch of nasociliary nerve to cilliary ganglion',
  'Communicating branch of nasociliary nerve to ciliary ganglion',
  // The source incorrectly includes "right" in both the .l and .r labels.
  // Preserve the source names and let the terminal marker determine side.
  'Communicating branch of right nasociliary nerve to cilliary ganglion',
  'Communicating branch of right nasociliary nerve to ciliary ganglion',
  'Communicating branch of left nasociliary nerve to cilliary ganglion',
  'Communicating branch of left nasociliary nerve to ciliary ganglion',
];
const trigeminalCorticalLandmarks = [
  ['Postcentral gyrus', 'sensory-cortex'],
  ['Central sulcus', 'central-sulcus'],
] as const;

for (const [id, , collection] of definitions) {
  const map = new Map<string, Membership>();
  const add = (name: string, role: Role) => map.set(normalizeAdvancedObjectName(name), { name, role });
  for (const row of nervousRows) {
    if (row.row_type !== 'OBJECT') continue;
    const name = row.object_name, key = normalizeAdvancedObjectName(name);
    // The export places III's peripheral branches under V: use the actual
    // object names for III without mislabelling these as trigeminal branches.
    const oculomotorBranch = /oculomot(?:or|r)/i.test(name) && !/nucle/i.test(name);
    if (within(row.collection_name, collection) && !(id === 'v' && oculomotorBranch)
      && !/^(muscles of head|extra-ocular muscles|cranial part of muscular system|common tendinous ring)/i.test(name)) {
      const role: Role = /nucle|neucle/i.test(name) ? 'nuclei'
        : /gangli/i.test(name) && !/\bbranch(?:es)?\b/i.test(name) ? 'ganglia'
        : /tract/i.test(name) ? 'tracts' : /carotid body/i.test(name) ? 'targets' : 'nerves';
      add(name, role);
    }
    if (id === 'iii' || id === 'iv') {
      if (id === 'iii' && oculomotorBranch) add(name, 'nerves');
      if (within(row.collection_name, 'Medial longitudinal fascicle')) add(name, 'tracts');
      if (classifyBrainGrossAnatomy(name)?.[2] === 'brainstem') add(name, 'brain');
      if (/^(accessory )?nucleus of (oculomotor|trochlear|abducens) nerve$/.test(key)) add(name, 'nuclei');
    }
    if ((id === 'vi' || id === 'xi' || id === 'xii') && classifyBrainGrossAnatomy(name)?.[2] === 'brainstem') add(name, 'brain');
    if ((id === 'ii' || id === 'iv' || id === 'vi') && within(row.collection_name, 'Eye')) add(name, 'eyes');
    if (id === 'ii') {
      if (['optic chiasm', 'optic tract', 'optic radiation'].includes(key)) add(name, 'tracts');
      if (key === 'lateral geniculate body') add(name, 'nuclei');
      if (key === 'thalamus' || key === '00 thalamic background core') add(name, 'thalamus');
      if (within(row.collection_name, 'NS_04_OCCIPITAL_LOBE')) add(name, 'visual-cortex');
      if (key === 'lateral ventricle' || key === 'third ventricle') add(name, 'ventricles');
      if (key === 'base of cerebral peduncle (midbrain)') add(name, 'brain');
    }
    if (id === 'v') {
      if (classifyBrainGrossAnatomy(name)?.[2] === 'brainstem') add(name, 'brain');
      if (within(row.collection_name, 'Trigeminal')) add(name, 'tracts');
      if (key === 'somatosensory tract face') add(name, 'ascending-fibers');
      if (key === '13 ventral posteromedial vpm') add(name, 'thalamic-nuclei');
      if (key === 'thalamus' || key === '00 thalamic background core') add(name, 'thalamus');
      if (posteriorMandibularBranches.has(key)) add(name, 'mandibular-posterior');
      if (anteriorMandibularBranches.has(key)) add(name, 'mandibular-anterior');
      if (chordaTympaniPathway.has(key)) add(name, 'chorda-tympani');
    }
    if (id === 'vii') {
      if (key === 'precentral gyrus' || classifyBrainGrossAnatomy(name)?.[2] === 'brainstem') add(name, 'brain');
      if (within(row.collection_name, 'Corticopontine fibers')) add(name, 'tracts');
      if (key === 'superior salivatory nucleus' || key === 'nucleus of solitary tract') add(name, 'nuclei');
      if (facialTrigeminalConnections.has(key)) add(name, 'trigeminal-connections');
      if (key === 'chorda tympani') add(name, 'nerves');
      if (key === 'submadinular ganglia nerves') add(name, 'ganglia');
      if (key === 'submandibular ganglion' || key === 'pterygopalatine ganglion') add(name, 'ganglia');
      if (key === 'deep petrosal nerve' || key === 'vidian nerve (nerve of the pterygoid canal)') add(name, 'petrosal-connections');
    }
    if (id === 'ix') {
      if (classifyBrainGrossAnatomy(name)?.[2] === 'brainstem') add(name, 'brain');
      if (['nucleus ambiguus', 'inferior salivatory nucleus', 'nucleus of solitary tract',
        'spinal nucleus of trigeminal nerve'].includes(key)) add(name, 'nuclei');
      if (['tympanic nerve (jacobson)', 'tympanic membrane', 'tympanic plexus', 'lesser petrosal nerve'].includes(key)) {
        add(name, 'tympanic-pathway');
      }
      if (key === 'otic ganglion') add(name, 'ganglia');
    }
    if (id === 'x') {
      if (classifyBrainGrossAnatomy(name)?.[2] === 'brainstem') add(name, 'brain');
      if (['posterior nucleus of vagus nerve', 'nucleus ambiguus', 'nucleus of solitary tract',
        'spinal nucleus of trigeminal nerve'].includes(key)) add(name, 'nuclei');
      if (esophagealPlexusNames.has(key)) add(name, 'vagus-viscera');
      if (['cardiac plexus', 'aortic plexus', 'ascending aorta nerve plexus'].includes(key)
        || (/cardiac/.test(key) && /sympathetic/.test(key))) add(name, 'cardiac-connections');
    }
  }
  for (const row of muscleRows) {
    if (row.row_type !== 'OBJECT') continue;
    const name = row.object_name, key = normalizeAdvancedObjectName(name);
    if ((id === 'iii' || id === 'iv' || id === 'vi') && key === 'common tendinous ring') add(name, 'annulus');
    if ((id === 'iii' && oculomotorMuscles.has(key)) || (id === 'vii' && facialMuscles.has(key))
      || (id === 'iv' && key === 'superior oblique muscle')
      || (id === 'vi' && key === 'lateral rectus muscle')
      || (id === 'ix' && key === 'stylopharyngeus muscle')
      || (id === 'x' && vagalMuscleNames.has(key))
      || (id === 'xii' && (key === 'genioglossus muscle' || key === 'hyoglossus muscle'))
      || (id === 'v' && masticatoryMuscles.has(key))
      || (id === 'xi' && (key === 'sternocleidomastoid muscle' || /^(transverse|descending|ascending) part of trapezius muscle$/.test(key)))) {
      add(name, 'muscles');
    }
  }
  if (id === 'vii') {
    for (const key of facialExcludedBranches) map.delete(key);
    // Remove any trigeminal nuclear aliases even if the source files them in VII.
    for (const key of map.keys()) if (/trigeminal/.test(key) && /nucle|neucle/.test(key)) map.delete(key);
    for (const name of facialTrigeminalConnections) add(name, 'trigeminal-connections');
  }
  // Explicit aliases also cover live-model labels absent from the older CSV.
  // Override the misleading word "tract": this structure is a nucleus.
  if (id === 'v') for (const name of TRIGEMINAL_MOTOR_NUCLEUS_NAMES) add(name, 'nuclei');
  if (id === 'v') for (const name of nasociliaryCommunicatingBranches) add(name, 'nerves');
  if (id === 'v') for (const [name, role] of trigeminalCorticalLandmarks) add(name, role);
  memberships.set(id, map);
}
const muscleNames = new Set([...memberships.values()].flatMap(map =>
  [...map.entries()].filter(([, member]) => member.role === 'muscles' || member.role === 'annulus').map(([name]) => name)));
const nervousNames = new Set([...memberships.values()].flatMap(map =>
  [...map.entries()].filter(([, member]) => member.role !== 'muscles' && member.role !== 'annulus').map(([name]) => name)));

function olfactoryBasalGroup(group: NervousGroup): NervousGroup {
  return { ...group, id: group.id.replace('advanced-neuroanatomy/', 'advanced-neuroanatomy/cranial-nerves/i/'),
    ...(group.children ? { children: group.children.map(olfactoryBasalGroup) } : {}) };
}

export const CRANIAL_NERVE_GROUPS: readonly NervousGroup[] = [...definitions.map(([id, label]) => {
  if (id === 'viii') return VESTIBULOCOCHLEAR_GROUP;
  const root = `advanced-neuroanatomy/cranial-nerves/${id}`;
  const roles = new Set([...memberships.get(id)!.values()].map(member => member.role));
  if (id === 'ii') { roles.add('brain'); roles.add('visual-cortex'); }
  if (id === 'iii' || id === 'iv' || id === 'vi' || id === 'vii' || id === 'ix' || id === 'x' || id === 'xi' || id === 'xii') roles.add('bone-context');
  if (id === 'x') { roles.add('vagus-vessels'); roles.add('vagus-viscera'); }
  if (id === 'vii') roles.add('tongue-taste');
  return { id: root, label: `${id.toUpperCase()} ${label} nerve`,
    children: (Object.entries(roleLabels) as [Role, string][]).filter(([role]) => roles.has(role))
      .map(([role, label]) => ({ id: `${root}/${role}`,
        label: role === 'brain' && id === 'vii' ? 'Brain and brainstem (semitransparent)'
          : role === 'brain' && (id === 'ii' || id === 'iii' || id === 'iv' || id === 'v' || id === 'vi' || id === 'ix' || id === 'x' || id === 'xi' || id === 'xii') ? 'Brainstem (semitransparent)'
          : role === 'tracts' && id === 'v' ? 'Trigeminal white matter fibers'
          : role === 'nuclei' && id === 'v' ? 'Trigeminal nuclei'
          : role === 'nerves' && id === 'vii' ? 'Facial nerve (VII) and branches'
          : role === 'trigeminal-connections' && id === 'vii' ? 'Trigeminal nerve (V) — main trunks relevant to VII connections'
          : role === 'muscles' && id === 'vii' ? 'Facial muscles (semitransparent)'
          : role === 'muscles' && id === 'v' ? 'Muscles of mastication (semitransparent)'
          : role === 'bone-context' && (id === 'vii' || id === 'ix' || id === 'x' || id === 'xi') ? 'Temporal bones (semitransparent)'
          : role === 'bone-context' && id === 'xii' ? 'Temporal and occipital bones (semitransparent)'
          : role === 'bone-context' && (id === 'iii' || id === 'vi') ? 'Sphenoid bone (semitransparent)' : label }))
      .concat(id === 'i' ? [olfactoryBasalGroup(OLFACTORY_BASAL_FOREBRAIN_GROUP)] : [])
      .concat(id === 'v' ? [TRIGEMINAL_EAR_GROUP] : []),
  };
}), CRANIAL_OVERVIEW_GROUP];

// Keep this curated view separate from every detailed nerve's membership.
const overviewMembers = new Map<string, string>();
for (const row of nervousRows) {
  if (row.row_type !== 'OBJECT' || row.object_type !== 'MESH') continue;
  const name = row.object_name, key = normalizeAdvancedObjectName(name);
  const explicitRole = cranialOverviewRole(name);
  if (explicitRole) { overviewMembers.set(key, explicitRole); continue; }
  // V's small branches also occur in VII and other CSV collections: never
  // reintroduce them through a shared nerve's broader collection.
  const trigeminal = memberships.get('v')?.get(key);
  if (trigeminal && ['nerves', 'ganglia', 'mandibular-anterior', 'mandibular-posterior'].includes(trigeminal.role)) continue;
  const isNerve = definitions.some(([id]) => id !== 'i' && id !== 'ii' && id !== 'v'
    && memberships.get(id)?.get(key)?.role === 'nerves');
  if (isNerve && /\bnerve\b|\bnerves\b|\bchorda tympani\b/i.test(name)
    && !/sympathetic|plexus|gangli|carotid body/i.test(name)) overviewMembers.set(key, 'nerves');
}

export function cranialNervePathForGroup(node: SceneNode, path: readonly string[]): readonly string[] | null {
  if (path[0] !== 'advanced-neuroanatomy' || path[1] !== 'cranial-nerves') return null;
  if (path[2] === 'overview') {
    const role = cranialOverviewRole(node.rawName) ?? overviewMembers.get(normalizeAdvancedObjectName(node.rawName));
    if (!role || (role === 'bone-context' ? node.systemId !== 'skeletal' : node.systemId !== 'nervous')) return null;
    return path.slice(0, 3).concat(role);
  }
  if (path[2] === 'viii') return vestibulocochlearPathForGroup(node, path);
  if (path[2] === 'v') {
    const earRole = trigeminalEarRole(node.rawName);
    if (earRole) return path.slice(0, 3).concat('ear-anatomy', earRole);
  }
  if (path[2] === 'vii' && node.systemId === 'organs' && isCranialOrganName(node.rawName)) {
    return path.slice(0, 3).concat('tongue-taste');
  }
  if (path[2] === 'x') {
    const role = vagusBackdropRole(node);
    if (role) return path.slice(0, 3).concat(role);
  }
  if (node.systemId === 'skeletal' && (((path[2] === 'iii' || path[2] === 'vi') && normalizeAdvancedObjectName(node.rawName) === 'sphenoid bone')
    || (path[2] === 'iv' && ['sphenoid bone', 'ethmoid bone', 'frontal bone'].includes(normalizeAdvancedObjectName(node.rawName)))
    || ((path[2] === 'vii' || path[2] === 'ix' || path[2] === 'x' || path[2] === 'xi') && normalizeAdvancedObjectName(node.rawName) === 'temporal bone')
    || (path[2] === 'xii' && ['temporal bone', 'occipital bone'].includes(normalizeAdvancedObjectName(node.rawName))))) {
    return path.slice(0, 3).concat('bone-context');
  }
  if (node.systemId && !['nervous', 'muscular'].includes(node.systemId)) return null;
  if (path[2] === 'i' && node.systemId === 'nervous') {
    const basal = olfactoryBasalForebrainPath(node.rawName);
    if (basal) return path.slice(0, 3).concat(basal.slice(1));
  }
  const member = memberships.get(path[2])?.get(normalizeAdvancedObjectName(node.rawName));
  if (path[2] === 'ix' && path[3] === 'tympanic-pathway' && member
    && ['otic ganglion', 'inferior salivatory nucleus'].includes(normalizeAdvancedObjectName(node.rawName))) {
    return path.slice(0, 3).concat('tympanic-pathway');
  }
  if (path[2] === 'ii' && node.systemId === 'nervous') {
    const aliasRole = opticAnatomyAliasRole(node.rawName);
    if (aliasRole) return path.slice(0, 3).concat(aliasRole);
    if (isOpticOccipitalContext(node)) return path.slice(0, 3).concat('visual-cortex');
    // Keep explicit pathways and landmarks; admit only brainstem gross context,
    // not the other cortical lobes or a whole-cerebrum backdrop.
    if (member && member.role !== 'visual-cortex') {
      return path.slice(0, 3).concat(member.role);
    }
    const brain = classifyBrainGrossAnatomy(node.rawName);
    if (brain?.[2] === 'brainstem') return path.slice(0, 3).concat('brain');
    return null;
  }
  return member ? path.slice(0, 3).concat(member.role) : null;
}
export function isCranialMuscleName(rawName: string): boolean {
  const key = normalizeAdvancedObjectName(rawName);
  // Excluding occipitalis from VII must not reclassify its export aliases.
  return muscleNames.has(key) || key === 'occipitalis muscle' || trigeminalEarRole(rawName) === 'muscle';
}
export function isCranialOrganName(rawName: string): boolean {
  return normalizeAdvancedObjectName(rawName) === 'tongue';
}
export function isCranialNervousName(rawName: string): boolean {
  const earRole = trigeminalEarRole(rawName);
  return nervousNames.has(normalizeAdvancedObjectName(rawName)) || isCochlearNervousName(rawName)
    || (earRole !== null && earRole !== 'muscle')
    || olfactoryAnatomyAliasPath(rawName) !== null || opticAnatomyAliasRole(rawName) !== null
    || (cranialOverviewRole(rawName) !== null && cranialOverviewRole(rawName) !== 'bone-context');
}
export function isCranialSkeletalName(rawName: string): boolean {
  return ['sphenoid bone', 'ethmoid bone', 'frontal bone', 'temporal bone', 'occipital bone'].includes(normalizeAdvancedObjectName(rawName));
}
export function cranialNerveContextIds(nodes: readonly SceneNode[], path: readonly string[]): number[] {
  return nodes.filter(node => isCranialNerveContextPath(cranialNervePathForGroup(node, path))).map(node => node.instanceID);
}
export function isCranialNerveContextPath(path: readonly string[] | null): boolean {
  return isCochlearContextPath(path) || path?.[3] === 'brain'
    || ((path?.[2] === 'overview' || path?.[2] === 'iii' || path?.[2] === 'iv' || path?.[2] === 'vi' || path?.[2] === 'vii' || path?.[2] === 'ix' || path?.[2] === 'x' || path?.[2] === 'xi' || path?.[2] === 'xii') && path[3] === 'bone-context')
    || (path?.[2] === 'x' && (path[3] === 'vagus-vessels' || path[3] === 'vagus-viscera'))
    || ((path?.[2] === 'vii' || path?.[2] === 'v') && path[3] === 'muscles')
    || ((path?.[2] === 'ii' || path?.[2] === 'v') && path[3] === 'thalamus')
    || (path?.[2] === 'v' && ['sensory-cortex', 'central-sulcus'].includes(path[3]))
    || (path?.[2] === 'ii' && path[3] === 'visual-cortex')
    || (path?.[2] === 'i' && path[3] === 'basal-forebrain' && path[4] === 'context');
}
export function isCranialNerveRetainedContextPath(path: readonly string[] | null): boolean {
  return isCranialNerveContextPath(path) || (path?.[2] === 'ii' && path[3] === 'ventricles')
    || (path?.[2] === 'viii' && path[3] === 'cochlear' && path[4] === 'ventricles');
}
export function cranialNerveForegroundIds(nodes: readonly SceneNode[], path: readonly string[]): number[] {
  return nodes.filter(node => {
    const member = cranialNervePathForGroup(node, path);
    return member && !isCranialNerveContextPath(member) && (path.every((part, i) => member[i] === part)
      || (!isCranialNerveRetainedContextPath(path) && isCranialNerveRetainedContextPath(member)));
  }).map(node => node.instanceID);
}
