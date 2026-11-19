import { skullBaseName } from './skullBaseSources';
import type { SceneNode } from '../types/sketchfab';
import type { SystemGroupId } from './anatomicalSystems';
import type { SkullBaseEntry } from './skullBaseTaxonomy';

export const PETROSAL_AUTONOMIC_ID = 'petrosal-autonomic';
const named = (...names: string[]) => {
  const keys = new Set(names.map(skullBaseName));
  return (name: string) => keys.has(name);
};
export const isLesserPetrosalName = named('Lesser petrosal nerve',
  'Lesser superficial petrosal nerve', 'Small superficial petrosal nerve');

// Explicit identities, including reviewed source typos. Newly named live meshes
// need not exist in the older CSV, but no geometry or missing connections are fabricated.
const neuralRules = {
  autonomicIII: named('Oculomotor nerve', 'Oculomotor nerve (III)',
    'Oculomotor nerve (cisternal and cavernous part)', 'Inferior branch of right oculomotor nerve',
    'Inferior branch of left oculomotor nerve', 'Inferior branch of oculomotor nerve',
    'Parasympathetic root of ciliary ganglion', 'Oculomotor root of ciliary ganglion',
    'Branch of oculomotor nerve to ciliary ganglion'),
  autonomicVII: named('Facial nerve', 'Facial nerve (VII)', 'Intermediate nerve', 'Nervus intermedius',
    'Geniculate ganglion'),
  autonomicIX: named('Glossopharyngeal nerve', 'Glossopharyngeal nerve (IX)'),
  autonomicTrigeminalRoot: named('Trigeminal nerve', 'Trigeminal nerve (V)', 'Trigeminal nerve root',
    'Trigeminal nerve (Gasserian) ganglion', 'Trigeminal ganglion', 'Gasserian ganglion'),
  autonomicV1: named('Ophthalmic nerve', 'Nasociliary nerve',
    'Communicating branch of nasociliary nerve to ciliary ganglion',
    'Communicating branch of nasociliary nerve to cilliary ganglion',
    'Communicating branch of right nasociliary nerve to cilliary ganglion',
    'Communicating branch of right nasociliary nerve to ciliary ganglion',
    'Communicating branch of left nasociliary nerve to cilliary ganglion',
    'Communicating branch of left nasociliary nerve to ciliary ganglion'),
  autonomicLongCiliary: named('Long ciliary nerve', 'Long ciliary nerves', 'Long cilliary nerve'),
  autonomicV2Root: named('Maxillary nerve', 'Trigeminal nerve maxillary n (V)', 'Ganglionic branch of maxillary nerve'),
  autonomicV2: named('Zygomatic nerve', 'Zygomaticotemporal nerve', 'Lacrimal nerve',
    'Greater palatine nerve', 'Lesser palatine nerve',
    'Nasopalatine nerve', 'Lateral posterior inferior nasal nerve', 'Lateral posterior superior nasal nerve',
    'Communicating branch of zygomatic nerve to lacrimal nerve'),
  autonomicLacrimalCarriers: named('Zygomatic nerve', 'Zygomaticotemporal nerve', 'Lacrimal nerve',
    'Communicating branch of zygomatic nerve to lacrimal nerve'),
  autonomicV3: named('Mandibular nerve', 'Posterior division of mandibular nerve'),
  autonomicLingual: named('Lingual nerve'),
  autonomicSubmandibularBranches: named('Submadinular ganglia nerves', 'Submandibular ganglion nerves',
    'Branches to submandibular ganglion', 'Branches from submandibular ganglion'),
  autonomicAuriculotemporal: named('Auriculotemporal nerve'),
  autonomicCiliaryGanglion: named('Ciliary ganglion', 'Cilliary ganglion'),
  autonomicPterygopalatineGanglion: named('Pterygopalatine ganglion'),
  autonomicOticGanglion: named('Otic ganglion'),
  autonomicSubmandibularGanglion: named('Submandibular ganglion'),
  autonomicShortCiliary: named('Short ciliary nerve', 'Short ciliary nerves', 'Short cilliary nerves'),
  autonomicGreaterPetrosal: named('Greater petrosal nerve', 'Greater superficial petrosal nerve'),
  autonomicPterygoidCanal: named('Vidian nerve (nerve of the pterygoid canal)', 'Vidian nerve', 'Nerve of pterygoid canal',
    'Nerve of the pterygoid canal'),
  autonomicChordaLingual: named('Chorda tympani', 'Lingual nerve'),
  autonomicInternalCarotid: named('Internal carotid artery sympathetic', 'Internal carotid artery sympathetic plexus',
    'Internal carotid artery symapthetic', 'Internal carotid artery symapthetic plexus'),
  autonomicIML: named('Intermediolateral nucleus'),
  autonomicSuperiorCervical: named('Superior cervical sympathetic ganglion', 'Superior cervical ganglion'),
};
const organRules = {
  autonomicLacrimalGland: named('Lacrimal gland'),
  autonomicLacrimalNasalTargets: named('Lacrimal gland', 'Mucosa of nasal cavity',
    'Nasal mucosa', 'Palatal mucosa', 'Mucosa of palate', 'Palatine glands', 'Nasal mucous glands'),
  autonomicSubmandibularTargets: named('Submandibular gland', 'Sublingual gland'),
  autonomicParotidTargets: named('Parotid gland', 'Accessory parotid gland', '(Accessory parotid gland)'),
};
export const PETROSAL_AUTONOMIC_RULES = { ...neuralRules, ...organRules };
export const PETROSAL_AUTONOMIC_LABELS: Record<keyof typeof PETROSAL_AUTONOMIC_RULES, string> = {
  autonomicIII: 'III trunk / inferior division — preganglionic route to ciliary ganglion',
  autonomicVII: 'VII / intermediate nerve and geniculate region (not a parasympathetic relay)',
  autonomicIX: 'Glossopharyngeal nerve (IX) — source of the tympanic pathway',
  autonomicTrigeminalRoot: 'V trunk / Gasserian ganglion — semitransparent sensory reference, not an autonomic relay',
  autonomicV1: 'V1 / nasociliary nerve and sensory root of ciliary ganglion',
  autonomicLongCiliary: 'Long ciliary nerves — sympathetic / sensory route bypassing ciliary ganglion',
  autonomicV2Root: 'V2 / maxillary nerve and pterygopalatine ganglionic connections',
  autonomicV2: 'Outgoing carriers — zygomatic / lacrimal, palatine and nasal branches',
  autonomicLacrimalCarriers: 'Zygomatic / lacrimal nerves and communicating branch (where modeled)',
  autonomicV3: 'V3 / posterior division — parent carrier',
  autonomicLingual: 'Lingual nerve (V3) — carrier to / from submandibular ganglion',
  autonomicSubmandibularBranches: 'Submandibular communicating branches (combined source mesh; directions not separated)',
  autonomicAuriculotemporal: 'Auriculotemporal nerve (V3) — postganglionic carrier to parotid',
  autonomicCiliaryGanglion: 'Ciliary ganglion',
  autonomicPterygopalatineGanglion: 'Pterygopalatine ganglion',
  autonomicOticGanglion: 'Otic ganglion',
  autonomicSubmandibularGanglion: 'Submandibular ganglion',
  autonomicShortCiliary: 'Short ciliary nerves',
  autonomicGreaterPetrosal: 'Greater superficial petrosal nerve (VII; if separately modeled)',
  autonomicPterygoidCanal: 'Nerve of the pterygoid canal (Vidian nerve)',
  autonomicChordaLingual: 'Chorda tympani joining lingual nerve — preganglionic route',
  autonomicInternalCarotid: 'Internal carotid sympathetic plexus',
  autonomicIML: 'Intermediolateral nucleus (spinal source mesh; not level-segmented)',
  autonomicSuperiorCervical: 'Superior cervical sympathetic ganglion',
  autonomicLacrimalNasalTargets: 'Lacrimal gland and available nasal / palatal targets',
  autonomicLacrimalGland: 'Lacrimal gland',
  autonomicSubmandibularTargets: 'Submandibular and sublingual glands',
  autonomicParotidTargets: 'Parotid and accessory parotid glands',
};

const petrosalBones = named('Temporal bone', 'Temporal', 'Petrous bone', 'Petrous temporal bone',
  'Petrous apex', 'Sphenoid bone', 'Sphenoid');
const grossBrainstem = named('Midbrain', 'Pons', 'Medulla oblongata', 'Brainstem', 'Brain stem');
const deepPetrosal = named('Deep petrosal nerve');
const tympanicRoute = named('Tympanic nerve', 'Tympanic nerve (Jacobson)', 'Tympanic plexus');
const tympanicIX = (name: string) => tympanicRoute(name) || isLesserPetrosalName(name);
const carotidPlexus = named('Carotid artery sympathetic', 'Internal carotid artery sympathetic',
  'Carotid artery sympathetic plexus', 'Internal carotid artery sympathetic plexus',
  'Carotid artery symapthetic', 'Internal carotid artery symapthetic',
  'Carotid artery symapthetic plexus', 'Internal carotid artery symapthetic plexus');
const inPetrosal = (path: readonly string[]) => path[0] === 'advanced-neuroanatomy'
  && path[1] === 'skull-base' && path[2] === PETROSAL_AUTONOMIC_ID;
/** Bony context follows every ganglion/nerve isolation without becoming its membership. */
export function isPetrosalAutonomicBoneContext(node: SceneNode, path: readonly string[]): boolean {
  return inPetrosal(path) && petrosalBones(skullBaseName(node.rawName));
}

export function isPetrosalAutonomicContext(node: SceneNode, path: readonly string[]): boolean {
  const name = skullBaseName(node.rawName);
  return isPetrosalAutonomicBoneContext(node, path)
    || (inPetrosal(path) && ['brainstem-nuclei', 'iii-ciliary', 'v-connections', 'vii-petrosal', 'ix-otic', 'lesserPetrosal'].includes(path[3]) && grossBrainstem(name))
    || (inPetrosal(path) && path[3] === 'v-connections' && neuralRules.autonomicTrigeminalRoot(name));
}

/** Opaque companions of the III overview/input, not additional III branches.
 * Petrosal nerves are a parallel pterygopalatine pathway, never a ciliary root. */
export function isPetrosalIIICompanion(node: SceneNode, path: readonly string[]): boolean {
  if (!inPetrosal(path) || path[3] !== 'iii-ciliary' || (path.length > 4 && path[4] !== 'incoming')) return false;
  const name = skullBaseName(node.rawName);
  return [neuralRules.autonomicCiliaryGanglion, neuralRules.autonomicShortCiliary,
    neuralRules.autonomicV1, neuralRules.autonomicLongCiliary, carotidPlexus,
    neuralRules.autonomicGreaterPetrosal, deepPetrosal,
    neuralRules.autonomicPterygoidCanal, neuralRules.autonomicPterygopalatineGanglion]
    .some(matches => matches(name));
}

/** VII overview/trunk retains the petrosal route. Deep petrosal remains
 * sympathetic, not a VII branch; lesser petrosal belongs to IX. */
export function isPetrosalVIICompanion(node: SceneNode, path: readonly string[]): boolean {
  if (!inPetrosal(path) || path[3] !== 'vii-petrosal'
    || (path.length > 4 && path[4] !== 'autonomicVII')) return false;
  const name = skullBaseName(node.rawName);
  return [neuralRules.autonomicGreaterPetrosal, deepPetrosal, neuralRules.autonomicInternalCarotid,
    neuralRules.autonomicPterygoidCanal, neuralRules.autonomicPterygopalatineGanglion]
    .some(matches => matches(name));
}

/** Show and isolation share the same support, including meshes previously hidden.
 * Hide receives only the original menu membership and must not expand it. */
function petrosalAutonomicShowPath(
  nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[],
): readonly string[] {
  if (!inPetrosal(path)) return path;
  // Keep an explicitly selected pathway, including shared lingual/Vidian
  // carriers, rather than inferring a different pathway from a single mesh.
  if (path.length > 3) return path;
  const requested = new Set(ids);
  const showingIII = nodes.some(node => requested.has(node.instanceID)
    && neuralRules.autonomicIII(skullBaseName(node.rawName)));
  if (showingIII) return [...path.slice(0, 3), 'iii-ciliary'];
  const showingVII = nodes.some(node => requested.has(node.instanceID)
    && neuralRules.autonomicVII(skullBaseName(node.rawName)));
  if (showingVII) return [...path.slice(0, 3), 'vii-petrosal', 'autonomicVII'];
  const showingChorda = nodes.some(node => requested.has(node.instanceID)
    && skullBaseName(node.rawName) === 'chorda tympani');
  if (showingChorda) return [...path, 'vii-petrosal', 'chorda-tympani'];
  const showingGreaterPetrosal = nodes.some(node => requested.has(node.instanceID)
    && neuralRules.autonomicGreaterPetrosal(skullBaseName(node.rawName)));
  if (showingGreaterPetrosal) return [...path, 'vii-petrosal', 'greater-petrosal'];
  const showingIX = nodes.some(node => requested.has(node.instanceID)
    && (neuralRules.autonomicIX(skullBaseName(node.rawName)) || tympanicIX(skullBaseName(node.rawName))
      || neuralRules.autonomicOticGanglion(skullBaseName(node.rawName))
      || organRules.autonomicParotidTargets(skullBaseName(node.rawName))
      || skullBaseName(node.rawName) === 'inferior salivatory nucleus'));
  if (showingIX) return [...path.slice(0, 3), 'ix-otic'];
  const showingV = path.length === 3 && nodes.some(node => requested.has(node.instanceID)
    && neuralRules.autonomicTrigeminalRoot(skullBaseName(node.rawName)));
  return showingV ? [...path, 'v-connections'] : path;
}

export function petrosalAutonomicShowSupportIds(
  nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[],
): number[] {
  if (!inPetrosal(path)) return [];
  const supportPath = petrosalAutonomicShowPath(nodes, ids, path);
  return nodes.filter(node => isPetrosalAutonomicContext(node, supportPath)
    || isPetrosalIIICompanion(node, supportPath)
    || isPetrosalVIICompanion(node, supportPath)).map(node => node.instanceID);
}

export function petrosalAutonomicShowContextIds(
  nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[],
): number[] {
  const supportPath = petrosalAutonomicShowPath(nodes, ids, path);
  return nodes.filter(node => isPetrosalAutonomicContext(node, supportPath)).map(node => node.instanceID);
}

export function petrosalAutonomicSystem(node: SceneNode): SystemGroupId | null {
  const name = skullBaseName(node.rawName);
  if (petrosalBones(name)) return 'skeletal';
  if (isLesserPetrosalName(name) || Object.values(neuralRules).some(matches => matches(name))) return 'nervous';
  if (Object.values(organRules).some(matches => matches(name))) return 'organs';
  return null;
}

type Component = NonNullable<SkullBaseEntry['components']>[number];
type NuclearEntry = (label: string, allowed: readonly string[]) => SkullBaseEntry;
export function buildPetrosalAutonomicEntry(
  leaf: (id: Component) => SkullBaseEntry, nuclei: NuclearEntry,
): SkullBaseEntry {
  const section = (id: string, label: string, components: readonly Component[]): SkullBaseEntry =>
    ({ id, label, children: components.map(leaf) });
  return { id: PETROSAL_AUTONOMIC_ID, label: 'Petrosal nerves and autonomic ganglia', children: [
    { id: 'orientation', label: 'Semitransparent bony / brainstem orientation', children: [
      { ...leaf('temporal'), label: 'Petrous / temporal bone (available whole mesh; semitransparent)' },
      { ...leaf('sphenoid'), label: 'Sphenoid bone (semitransparent)' },
      leaf('brainstem'),
    ] },
    nuclei('Brainstem parasympathetic nuclei', [
      'gve/edinger-westphal', 'gve/superior-salivatory', 'gve/inferior-salivatory',
    ]),
    { id: 'iii-ciliary', label: 'III → ciliary ganglion → short ciliary nerves', children: [
      section('incoming', 'Incoming — III preganglionic parasympathetic route', ['autonomicIII']),
      leaf('autonomicCiliaryGanglion'),
      section('outgoing', 'Outgoing — short ciliary nerves (no eye or muscle meshes)', ['autonomicShortCiliary']),
      section('orbital-carriers', 'Orbital sympathetic / sensory carriers — V1, not III branches', [
        'autonomicV1', 'autonomicLongCiliary',
      ]),
      leaf('carotidSympathetic'),
      section('parallel-petrosal', 'Parallel petrosal pathway → pterygopalatine ganglion, NOT ciliary ganglion', [
        'autonomicGreaterPetrosal', 'deepPetrosal', 'autonomicPterygoidCanal', 'autonomicPterygopalatineGanglion',
      ]),
      nuclei('Accessory oculomotor / Edinger–Westphal source nucleus', ['gve/edinger-westphal']),
    ] },
    { id: 'v-connections', label: 'V — peripheral carriers and ganglionic connections', children: [
      { id: 'orientation', label: 'Semitransparent V / Gasserian, brainstem and bone orientation', children: [
        leaf('autonomicTrigeminalRoot'), leaf('brainstem'),
        { ...leaf('temporal'), label: 'Petrous / temporal bone (semitransparent)' },
        { ...leaf('sphenoid'), label: 'Sphenoid bone (semitransparent)' },
      ] },
      section('v1-ciliary', 'V1 — ciliary connections', [
        'autonomicV1', 'autonomicCiliaryGanglion', 'autonomicShortCiliary', 'autonomicLongCiliary',
      ]),
      section('v2-pterygopalatine', 'V2 — pterygopalatine and lacrimal connections', [
        'autonomicV2Root', 'autonomicPterygopalatineGanglion', 'autonomicV2',
      ]),
      section('v3-salivary', 'V3 — otic / submandibular ganglia and their nerve connections', [
        'autonomicV3', 'autonomicAuriculotemporal', 'autonomicLingual', 'autonomicSubmandibularBranches',
        'autonomicOticGanglion', 'autonomicSubmandibularGanglion',
      ]),
    ] },
    { id: 'vii-petrosal', label: 'VII — petrosal and chorda tympani pathways', children: [
      { id: 'orientation', label: 'Semitransparent brainstem and petrous / sphenoid bone orientation', children: [
        leaf('brainstem'),
        { ...leaf('temporal'), label: 'Petrous / temporal bone (available whole mesh; semitransparent)' },
        { ...leaf('sphenoid'), label: 'Sphenoid bone (semitransparent)' },
      ] },
      leaf('autonomicVII'),
      { id: 'greater-petrosal', label: 'Greater petrosal → pterygopalatine → V2 / lacrimal carriers', children: [
        section('incoming', 'Incoming parasympathetic route — greater petrosal / Vidian', [
          'autonomicGreaterPetrosal', 'autonomicPterygoidCanal',
        ]),
        section('sympathetic-contributor', 'Sympathetic contributor — carotid plexus → deep petrosal → Vidian', [
          'autonomicInternalCarotid', 'deepPetrosal',
        ]),
        leaf('autonomicPterygopalatineGanglion'),
        section('outgoing', 'Outgoing postganglionic carriers — V2 → zygomatic / lacrimal, nasal and palatine', [
          'autonomicV2Root', 'autonomicV2',
        ]),
        leaf('autonomicLacrimalNasalTargets'),
      ] },
      { id: 'chorda-tympani', label: 'Chorda tympani → lingual → submandibular ganglion → glands', children: [
        section('incoming', 'Incoming — chorda tympani joins the lingual nerve', ['autonomicChordaLingual']),
        leaf('autonomicSubmandibularGanglion'),
        section('outgoing', 'Outgoing — available glandular connections and lingual carrier', [
          'autonomicSubmandibularBranches', 'autonomicLingual',
        ]),
        leaf('autonomicSubmandibularTargets'),
      ] },
      nuclei('Superior salivatory nucleus', ['gve/superior-salivatory']),
    ] },
    { id: 'ix-otic', label: 'IX → tympanic / lesser petrosal → otic → parotid', children: [
      { id: 'orientation', label: 'Semitransparent brainstem and temporal bone orientation', children: [
        leaf('brainstem'),
        { ...leaf('temporal'), label: 'Petrous / temporal bone (available whole mesh; semitransparent)' },
      ] },
      section('incoming', 'Incoming — IX → Jacobson / tympanic plexus → lesser petrosal', [
        'autonomicIX', 'tympanicNerve', 'tympanicPlexus', 'lesserPetrosal',
      ]),
      leaf('autonomicOticGanglion'),
      section('outgoing', 'Outgoing — auriculotemporal nerve carries postganglionic fibers to parotid', [
        'autonomicAuriculotemporal', 'autonomicParotidTargets',
      ]),
      leaf('tympanicMembrane'),
      nuclei('Inferior salivatory nucleus', ['gve/inferior-salivatory']),
    ] },
    leaf('lesserPetrosal'),
    { id: 'sympathetic', label: 'Sympathetic — spinal origin → cervical relay → carotid plexuses', children: [
      section('origin-relay', 'Preganglionic origin → superior cervical sympathetic relay', [
        'autonomicIML', 'autonomicSuperiorCervical',
      ]),
      leaf('carotidSympathetic'),
      section('deep-petrosal', 'Postganglionic — deep petrosal → Vidian → pterygopalatine (no synapse here)', [
        'autonomicInternalCarotid', 'deepPetrosal', 'autonomicPterygoidCanal',
        'autonomicPterygopalatineGanglion', 'autonomicV2Root', 'autonomicV2', 'autonomicLacrimalNasalTargets',
      ]),
      section('ciliary', 'Postganglionic — carotid / nasociliary → long or short ciliary nerves', [
        'autonomicInternalCarotid', 'autonomicV1', 'autonomicLongCiliary',
        'autonomicCiliaryGanglion', 'autonomicShortCiliary',
      ]),
      { id: 'orbital-lacrimal', label: 'Parallel orbital routes — pterygopalatine / lacrimal and ciliary', children: [
        section('lacrimal-route', 'Lacrimal route — pterygopalatine (no synapse) → V2 / zygomatic → lacrimal gland', [
          'autonomicInternalCarotid', 'deepPetrosal', 'autonomicPterygoidCanal',
          'autonomicPterygopalatineGanglion', 'autonomicV2Root', 'autonomicLacrimalCarriers', 'autonomicLacrimalGland',
        ]),
        section('ciliary-route', 'Parallel ciliary route — carotid / V1, not a pterygopalatine-to-ciliary relay', [
          'autonomicInternalCarotid', 'autonomicV1', 'autonomicCiliaryGanglion',
          'autonomicLongCiliary', 'autonomicShortCiliary',
        ]),
      ] },
    ] },
    section('ganglia', 'Four cranial parasympathetic ganglia', [
      'autonomicCiliaryGanglion', 'autonomicPterygopalatineGanglion',
      'autonomicOticGanglion', 'autonomicSubmandibularGanglion',
    ]),
    section('tympanic-anatomy', 'Tympanic membrane and plexus', ['tympanicMembrane', 'tympanicPlexus', 'tympanicNerve']),
  ] };
}
