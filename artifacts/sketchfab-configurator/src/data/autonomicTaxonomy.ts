import { NERVOUS_SOURCE_ROWS as rows, NERVOUS_SOURCE_OBJECTS as AUTONOMIC_SOURCE_OBJECTS } from './nervousSourceRows';
import { normalizeAdvancedObjectName } from './advancedCollection';
import { classifyBrainGrossAnatomy } from './brainGrossAnatomy';
import { headNeckLandmarkSystem, headNeckLandmarkSubgroup, isHeadNeckRetainedContextNode } from './headNeckAutonomicLandmarks';
import { isPlexusContextNode, plexusContextPath, isPlexusVertebralName, isAbdominalSympatheticArteryName, isAbdominalSympatheticVesselName } from './autonomicPlexusContext';
import { entericVisceralPath, isEntericVisceralContextNode } from './entericVisceralContext';
import { parasympatheticVisceralPath, isParasympatheticVisceralContextNode } from './parasympatheticVisceralContext';
import { REQUESTED_AUTONOMIC_NERVES, AUTONOMIC_SPINAL_CORD_NAMES } from './autonomicRequestedNerves';
import { AUTONOMIC_HYPOTHALAMUS_MEMBERSHIPS, autonomicHypothalamusGroups, isAutonomicHypothalamusSurface } from './autonomicHypothalamus';
import { AUTONOMIC_PARAVERTEBRAL_SELECTIONS, autonomicParavertebralSelection } from './autonomicParavertebral';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';

export const AUTONOMIC_ROOT_PATH = ['advanced-neuroanatomy', 'autonomic-nervous-system'] as const;

const definitions = [
  ['sympathetic', 'Sympathetic Nervous System', [
    ['hypothalamus', 'Hypothalamus and autonomic nuclei'],
    ['brainstem', 'Brainstem gross anatomy (semitransparent)'],
    ['cervical', 'Cervical sympathetic system'],
    ['thoracic', 'Thoracic sympathetic system'],
    ['abdominal', 'Abdominal sympathetic system'],
    ['pelvic', 'Pelvic sympathetic system'],
  ]],
  ['parasympathetic', 'Parasympathetic Nervous System', [
    ['hypothalamus', 'Hypothalamus and autonomic nuclei'],
    ['cranial', 'Cranial parasympathetic pathways'],
    ['vagus', 'Vagus nerve'],
    ['sacral', 'Sacral parasympathetic system'],
  ]],
  ['head-neck', 'Head and Neck Autonomic Pathways', [
    ['hypothalamus', 'Hypothalamus and autonomic nuclei'],
    ['carotid', 'Carotid sympathetic plexuses'],
    ['ocular', 'Ocular sympathetic pathway'],
    ['pterygopalatine', 'Pterygopalatine pathway (Vidian nerve)'],
    ['ganglia', 'Cranial parasympathetic ganglia'],
  ]],
  ['plexuses', 'Thoracic and Abdominal Autonomic Plexuses', [
    ['paravertebral', 'Paravertebral ganglia, communicating rami and spinal roots'],
    ['cardiac', 'Cardiac plexus'],
    ['pulmonary-esophageal', 'Pulmonary and esophageal plexuses'],
    ['abdominal', 'Abdominal prevertebral plexuses'],
    ['pelvic', 'Pelvic hypogastric plexuses'],
  ]],
  ['enteric', 'Enteric Nervous System', [
    ['organs', 'Visceral organs (semitransparent)'],
  ]],
] as const;

export const AUTONOMIC_GROUPS: readonly NervousGroup[] = definitions.map(([id, label, children]) => ({
  id: [...AUTONOMIC_ROOT_PATH, id].join('/'),
  label,
  ...(children.length ? { children: children.map(([childId, childLabel]) => ({
    id: [...AUTONOMIC_ROOT_PATH, id, childId].join('/'), label: childLabel,
    ...(childId === 'hypothalamus' ? {
      children: autonomicHypothalamusGroups([...AUTONOMIC_ROOT_PATH, id, childId]),
    } : {}),
    ...(id === 'plexuses' && childId === 'paravertebral' ? { children:
      AUTONOMIC_PARAVERTEBRAL_SELECTIONS.map(([selectionId, selectionLabel]) => ({
        id: [...AUTONOMIC_ROOT_PATH, id, childId, selectionId].join('/'), label: selectionLabel,
      })),
    } : {}),
    ...(id === 'parasympathetic' && childId === 'vagus' ? { children: [
      { id: [...AUTONOMIC_ROOT_PATH, id, childId, 'thoracic-vessels'].join('/'), label: 'Thoracic vessels (semitransparent)' },
      { id: [...AUTONOMIC_ROOT_PATH, id, childId, 'stomach'].join('/'), label: 'Stomach (semitransparent)' },
    ] } : {}),
  })) } : {}),
}));


export function normalizeAutonomicName(rawName: string): string {
  // The export includes ".r .001" and internal ".001_Enteric" spellings.
  const key = normalizeAdvancedObjectName(rawName.trim().replace(/\s+(?=[._])/g, ''))
    .replace(/\.\d+(?=\s|$)/g, '');
  // The revised live model can spell the side out instead of using ".r".
  // Scope this alias to the requested sympathetic nerve, never vagal cardiac
  // branches or other structures with anatomically meaningful parentheses.
  const cardiac = key.replace(/^(?:right|left)\s+/, '')
    .replace(/(?:\s*\((?:right|left|r|l)\)|\s*\[(?:right|left|r|l)\]|[ .-]+(?:right|left))\.?$/, '');
  return cardiac === 'superior cervical cardiac sympathetic nerve' ? cardiac : key;
}

/** Vertebral landmarks keep skeletal ownership; only the sympathetic view uses them. */
export function sympatheticVertebralRegion(rawName: string): string | null {
  const key = normalizeAutonomicName(rawName);
  if (/^(?:vertebra c[1-7]|atlas(?: \(c1\))?|axis(?: \(c2\))?)$/.test(key)) return 'cervical';
  if (/^vertebra (?:t|th)(?:[1-9]|1[0-2])$/.test(key)) return 'thoracic';
  if (/^vertebra l[1-5]$/.test(key)) return 'abdominal';
  if (/^(?:sacrum|coccyx|vertebra s[1-5])$/.test(key)) return 'pelvic';
  return null;
}

function isSympatheticAbdominalArtery(node: SceneNode): boolean {
  return (!node.systemId || node.systemId === 'vascular')
    && isAbdominalSympatheticArteryName(node.rawName);
}

function isSympatheticOverviewVessel(node: SceneNode, path: readonly string[]): boolean {
  return (path.length === AUTONOMIC_ROOT_PATH.length
    || (path[2] === 'sympathetic' && path.length === 3))
    && (!node.systemId || node.systemId === 'vascular')
    && isAbdominalSympatheticVesselName(node.rawName);
}

export function isParasympatheticBoneName(rawName: string): boolean {
  return ['temporal bone', 'sphenoid bone'].includes(normalizeAutonomicName(rawName));
}

function isParasympatheticContext(node: SceneNode): boolean {
  return ((!node.systemId || node.systemId === 'skeletal') && isParasympatheticBoneName(node.rawName))
    || ((!node.systemId || node.systemId === 'nervous') && classifyBrainGrossAnatomy(node.rawName)?.[2] === 'brainstem');
}

function isSympatheticBrainstemContext(node: SceneNode): boolean {
  return (!node.systemId || node.systemId === 'nervous')
    && ['midbrain', 'pons', 'medulla oblongata'].includes(normalizeAutonomicName(node.rawName));
}

export { AUTONOMIC_SOURCE_OBJECTS };
const memberships = new Map<string, readonly string[][]>();

const sympatheticSpinalCord = new Set(AUTONOMIC_SPINAL_CORD_NAMES.map(normalizeAutonomicName));

// Head pathways from the creator's reference: mixed nerves and ganglia are
// carriers/landmarks here, not reclassified as sympathetic-origin structures.
const sympatheticHeadPathways = new Set([
  'Vidian nerve (nerve of the pterygoid canal)', 'Deep petrosal nerve', 'Pterygopalatine ganglion',
  'Trigeminal nerve', 'Trigeminal nerve (V)', 'Trigeminal nerve root', 'Motor root of trigeminal nerve',
  'Trigeminal nerve (cisternal part)', 'Cisternal segment of trigeminal nerve',
  'Trigeminal nerve (Gasserian) ganglion', 'Trigeminal ganglion', 'Gasserian ganglion',
  'Ophthalmic nerve', 'Ophthalmic nerve (V1)', 'Nasociliary nerve', 'Lacrimal nerve',
  'Trigeminal nerve maxillary n (V)', 'Maxillary nerve', 'Maxillary nerve (V2)',
  'Ganglionic branch of maxillary nerve', 'Zygomatic nerve',
  'Ciliary ganglion', 'Short ciliary nerves',
  'Communicating branch of right nasociliary nerve to cilliary ganglion',
  'Communicating branch of nasociliary nerve to ciliary ganglion',
  'Communicating branch of nasociliary nerve to cilliary ganglion',
  'Oculomotor nerve (cisternal and cavernous part)', 'Superior branch of the oculomotor nerve',
  'Superior division of oculomotor nerve',
].map(normalizeAutonomicName));

const sympatheticHeadTargets = new Set([
  'Lacrimal gland', 'Eye', 'Eyeball', 'Anterior segment of eyeball', 'Posterior segment of eyeball',
  'Anterior chamber of eyeball', 'Cornea', 'Sclera', 'Iris', 'Retina', 'Vitreous body', 'Lens',
  'Ciliary body', 'Ciliary body-curve', 'Zonular fibers', 'Zonular fibres', 'Zonular fibers-curve',
  'Suspensory ligament of eyeball',
].map(normalizeAutonomicName));

const parasympatheticGanglia = new Set([
  'Ciliary ganglion', 'Pterygopalatine ganglion', 'Otic ganglion', 'Submandibular ganglion',
].map(normalizeAutonomicName));
const cranialParasympathetic = new Set([
  ...parasympatheticGanglia,
  'Accessory nucleus of oculomotor nerve', 'Superior salivatory nucleus', 'Inferior salivatory nucleus',
  'Oculomotor nerve (cisternal and cavernous part)', 'Inferior branch of right oculomotor nerve',
  'Facial nerve (VII)', 'Glossopharyngeal nerve (IX)', 'Tympanic nerve (Jacobson)', 'Tympanic plexus',
  'Short ciliary nerves', 'Chorda tympani', 'Lesser petrosal nerve',
  // Dedicated ganglionic nerve meshes can be added in live model revisions.
  'Submandibular ganglion nerve', 'Submandibular ganglion nerves',
  'Submandibular ganglia nerve', 'Submandibular ganglia nerves',
  'Nerves of submandibular ganglion', 'Nerve of submandibular ganglion',
  'Submandibular ganglionic nerve', 'Submandibular ganglionic nerves',
  'Nerves to submandibular ganglion', 'Nerves to submandibular ganglia',
  'Ganglionic branch of lingual nerve', 'Ganglionic branches of lingual nerve',
  'Communicating branch of lingual nerve to submandibular ganglion',
  'Communicating branches of lingual nerve to submandibular ganglion',
  'Vidian nerve (nerve of the pterygoid canal)', 'Ganglionic branch of maxillary nerve',
  'Communicating branch of right nasociliary nerve to cilliary ganglion',
  // Trigeminal carriers and landmarks of cranial parasympathetic pathways.
  // Their inclusion does not imply a parasympathetic origin.
  'Trigeminal nerve', 'Trigeminal nerve (V)', 'Trigeminal nerve root', 'Motor root of trigeminal nerve',
  'Trigeminal nerve (cisternal part)', 'Cisternal segment of trigeminal nerve',
  'Trigeminal nerve (Gasserian) ganglion', 'Trigeminal ganglion', 'Gasserian ganglion',
  'Ophthalmic nerve', 'Ophthalmic nerve (V1)',
  'Trigeminal nerve maxillary n (V)', 'Maxillary nerve', 'Maxillary nerve (V2)',
  'Mandibular nerve', 'Mandibular nerve (V3)', 'Mandibular division of trigeminal nerve',
  'Anterior division of mandibular nerve', 'Posterior division of mandibular nerve',
  'Lingual nerve', 'Zygomatic nerve', 'Tympanic membrane',
  // Ciliary ganglion: III supplies the preganglionic route; nasociliary
  // connections are sensory carriers, and short ciliary nerves are mixed.
  'Oculomotor nerve', 'Oculomotor nerve (III)', 'Inferior branch of left oculomotor nerve',
  'Inferior branch of oculomotor nerve', 'Parasympathetic root of ciliary ganglion',
  'Oculomotor root of ciliary ganglion', 'Branch of oculomotor nerve to ciliary ganglion',
  'Nasociliary nerve', 'Communicating branch of nasociliary nerve to ciliary ganglion',
  'Communicating branch of nasociliary nerve to cilliary ganglion',
  'Communicating branch of right nasociliary nerve to ciliary ganglion',
  'Communicating branch of left nasociliary nerve to ciliary ganglion',
  'Communicating branch of left nasociliary nerve to cilliary ganglion',
  'Short ciliary nerve', 'Short cilliary nerve', 'Short cilliary nerves',
  // Pterygopalatine ganglion: VII/greater petrosal → Vidian; postganglionic
  // fibers follow V2 branches and the zygomatic-to-lacrimal connection.
  'Facial nerve', 'Intermediate nerve', 'Nervus intermedius',
  'Greater petrosal nerve', 'Greater superficial petrosal nerve',
  'Vidian nerve', 'Nerve of pterygoid canal', 'Nerve of the pterygoid canal',
  'Ganglionic branches of maxillary nerve', 'Zygomaticotemporal nerve', 'Lacrimal nerve',
  'Communicating branch of zygomatic nerve to lacrimal nerve',
  'Greater palatine nerve', 'Lesser palatine nerve', 'Nasopalatine nerve',
  'Lateral posterior superior nasal nerve', 'Lateral posterior inferior nasal nerve',
  // The CSV places this pharyngeal nerve under CN V; it is not the separate
  // pharyngeal branch of the vagus nerve.
  'Pharyngeal nerve',
  // The CSV misspelling is a real bilateral mesh, not a missing connection.
  // Combined ganglionic branches are not split into fabricated afferent/efferent meshes.
  'Submadinular ganglia nerves', 'Branches to submandibular ganglion',
  'Branches from submandibular ganglion',
  // Otic ganglion: IX → tympanic / lesser petrosal; auriculotemporal (V3)
  // carries postganglionic fibers to the parotid, rather than originating them.
  'Glossopharyngeal nerve', 'Tympanic nerve', 'Auriculotemporal nerve',
].map(normalizeAutonomicName));
const vidianPathway = new Set([
  'Vidian nerve (nerve of the pterygoid canal)', 'Deep petrosal nerve',
  'Pterygopalatine ganglion', 'Ganglionic branch of maxillary nerve',
].map(normalizeAutonomicName));
const vagalNuclei = new Set([
  'Posterior nucleus of vagus nerve', 'Nucleus ambiguus', 'Nucleus of solitary tract',
].map(normalizeAutonomicName));

for (const row of AUTONOMIC_SOURCE_OBJECTS) {
  const key = normalizeAutonomicName(row.object_name);
  const collection = row.collection_name;
  const paths: string[][] = [];
  const add = (category: string, subgroup?: string) =>
    paths.push([...AUTONOMIC_ROOT_PATH, category, ...(subgroup ? [subgroup] : [])]);
  const cervical = collection === 'Sympathetic trunk Cervical';
  const thoracic = collection === 'Sympathetic trunk thoracic';
  const lumbar = collection === 'Sympathetic trunk lumbar and scacral';
  const sacral = collection === 'Sympathetic trunk Sacral';
  const carotid = /carotid.*sympathetic.*plexus/.test(key);
  const cardiac = /cardiac.*(?:nerve|plexus)|(?:aortic plexus|ascending aorta nerve plexus)/.test(key);
  const sympatheticCardiac = cardiac && key.includes('sympathetic');
  const esophageal = /(?:oesophag|esophag).*(?:enteric|nerve plexus|plexus)/.test(key);
  const pulmonary = /(?:pulmonary|lung).*(?:nerve plexus|plexus)/.test(key);
  const pelvicPlexus = /hypogastric.*(?:nerve|plexus)|(?:iliac artery|urinary bladder|prostate|superior anorectal).*(?:nerve plexus|enteric)/.test(key);
  // Artery-associated extrinsic plexuses are not evidence of bowel-wall ENS.
  const intrinsicEnteric = /^(?:stomach|duodenum|oesophagus|esophagus|jejunum|ileum|transverse colon|descending colon|ascending colon|sigmoid colon|rectum)\b.*(?:enteric|nerve plexus)/.test(key)
    || /(?:myenteric|submucosal).*plexus/.test(key);
  // Creator-requested pelvic autonomic context overlaps the enteric teaching
  // view without reclassifying these plexuses as intrinsic bowel-wall ENS.
  const pelvicEntericContext = ['urinary bladder nerve plexus', 'prostate nerve plexus'].includes(key);
  const visceralSource = collection === 'Splanchnic nerves and plexuses';
  const abdominalPlexus = visceralSource && !pelvicPlexus && !carotid && !cardiac && !pulmonary && !esophageal
    && !intrinsicEnteric && /plexus|coeliac ganglia|mesenteric gangli/.test(key);

  if (cervical || (sympatheticCardiac && key.includes('cervical')) || carotid || key === 'deep petrosal nerve') add('sympathetic', 'cervical');
  if (thoracic || /^(greater splanchnic|lesser splanchinc|least splanchnic)/.test(key)
    || (sympatheticCardiac && key.includes('thoracic'))) add('sympathetic', 'thoracic');
  if (lumbar || /^lumbar splanchnic/.test(key) || key === 'coeliac ganglia'
    || /^(superior mesenteric ganglia|inferior mesenteric ganglion)$/.test(key)) add('sympathetic', 'abdominal');
  // Overlapping abdominal teaching view: retain the thoracic origins and all
  // source-backed perivascular abdominal plexuses, not just their ganglia.
  if (thoracic || abdominalPlexus)
    add('sympathetic', 'abdominal');
  if (sacral || /^(superior hypogastric plexus|inferior hypogastric nerves and plexus)$/.test(key)) add('sympathetic', 'pelvic');
  // The superior plexus bridges the abdominal aortic bifurcation and pelvis.
  if (key === 'superior hypogastric plexus') add('sympathetic', 'abdominal');
  // Whole trunks cannot be assigned to one regional subdivision.
  if (collection === 'NS_01_SYMPATHETIC_TRUNK' && /^sympathetic (trunk|nerves)/.test(key)) {
    add('sympathetic');
    add('sympathetic', 'abdominal');
  }
  // Whole spinal-cord meshes remain parent-level opaque landmarks.
  if (sympatheticSpinalCord.has(key)) add('sympathetic');
  if (sympatheticSpinalCord.has(key)) add('plexuses');
  // Unsplit paravertebral chains remain whole-view landmarks rather than
  // being mislabelled as cardiac, prevertebral or hypogastric plexus meshes.
  if ((thoracic || lumbar || sacral) && /^sympathetic (?:gangli|gangion)/.test(key)) add('plexuses');
  if (collection === 'NS_01_SYMPATHETIC_TRUNK' && /^sympathetic (?:trunk|nerves)/.test(key)) add('plexuses');
  if (key === 'ganglion impar') add('plexuses', 'pelvic');
  if (sympatheticHeadPathways.has(key) || sympatheticHeadTargets.has(key)) add('sympathetic', 'cervical');

  // Somatic roots are opaque landmarks, not relabelled as sympathetic fibers.
  const spinalRoot = /^(c|th|t|l|s|co)\d+\s*(?:(?:anterior|posterior|dorsal|ventral)\s+root|dorsal root ganglion|root)\b/.exec(key);
  if (spinalRoot) add('sympathetic', spinalRoot[1] === 'c' ? 'cervical'
    : ['th', 't'].includes(spinalRoot[1]) ? 'thoracic' : spinalRoot[1] === 'l' ? 'abdominal' : 'pelvic');
  if (spinalRoot && ['th', 't', 'l'].includes(spinalRoot[1])) add('sympathetic', 'abdominal');
  if (/roots? of (?:the )?brachial plexus|(?:cervical|brachial) plexus.*roots?|root.*ansa cervical/.test(key)
    || (collection === 'Cervical plexus' && /^(?:c[1-4] nerve|superior root)/.test(key))) add('sympathetic', 'cervical');
  if (/lumbar plexus/.test(key)) add('sympathetic', 'abdominal');
  if (/^intercostal nerve\b/.test(key)) add('sympathetic', 'thoracic');

  if (cranialParasympathetic.has(key)) add('parasympathetic', 'cranial');
  if (/vagus|vagal/.test(key) || vagalNuclei.has(key)
    || (collection === 'NS_CN10_VAGUS' && /laryngeal nerve/.test(key))) add('parasympathetic', 'vagus');
  // Only pelvic splanchnic fibers are sacral parasympathetic, not sacral
  // sympathetic ganglia or a mixed hypogastric plexus.
  if (/pelvic splanchnic/.test(key)) add('parasympathetic', 'sacral');

  if (carotid) add('head-neck', 'carotid');
  // These are the proximal sympathetic sources. Additional mixed carriers and
  // ganglion landmarks are included below, without inventing distal fiber meshes.
  if (carotid || key === 'superior cervical sympathetic ganglion') add('head-neck', 'ocular');
  if (vidianPathway.has(key)) add('head-neck', 'pterygopalatine');
  if (parasympatheticGanglia.has(key)) add('head-neck', 'ganglia');

  if (cardiac) add('plexuses', 'cardiac');
  if (pulmonary || esophageal) add('plexuses', 'pulmonary-esophageal');
  if (abdominalPlexus || key === 'coeliac ganglia'
    || /^(?:greater|lesser|least) (?:splanchnic|splanchinc) nerves?$/.test(key)) add('plexuses', 'abdominal');
  if (pelvicPlexus) add('plexuses', 'pelvic');
  if (intrinsicEnteric || pelvicEntericContext) add('enteric');

  const previous = memberships.get(key) ?? [];
  if (paths.length) memberships.set(key, [...previous, ...paths].filter((path, i, all) =>
    all.findIndex(other => other.join('/') === path.join('/')) === i));
}

// Recognize live model aliases as well as the source's exported spellings.
for (const level of [1, 2, 3, 4]) {
  const names = [`C${level} dorsal root`, `C${level} posterior root`,
    ...(level <= 2 ? [`C${level} anterior posterior`] : [])];
  for (const name of names) {
    const key = normalizeAutonomicName(name);
    const path = [...AUTONOMIC_ROOT_PATH, 'sympathetic', 'cervical'];
    const previous = memberships.get(key) ?? [];
    if (!previous.some(member => member.join('/') === path.join('/'))) memberships.set(key, [...previous, path]);
    const headPath = [...AUTONOMIC_ROOT_PATH, 'head-neck', 'carotid'];
    memberships.set(key, [...memberships.get(key)!, headPath]);
  }
}

// Somatic cervical landmarks belong directly to the head/neck view, not to
// a carotid or cranial parasympathetic pathway. Use the creator's actual
// C1–C4 spinal nerve mesh names; dorsal rami remain distinct structures.
const headNeckCervicalNerves = [
  'Roots of brachial plexus', 'Roots of the brachial plexus', 'Brachial plexus roots',
  ...[1, 2, 3, 4].flatMap(level => [
    `C${level} spinal nerve`,
    `Dorsal ramus C${level}`, `Dorsal rami C${level}`,
    `C${level} dorsal ramus`, `C${level} dorsal rami`,
    `Posterior ramus C${level}`, `C${level} posterior ramus`,
  ]),
];
for (const name of headNeckCervicalNerves) {
  const key = normalizeAutonomicName(name);
  const path = [...AUTONOMIC_ROOT_PATH, 'head-neck'];
  memberships.set(key, [...memberships.get(key) ?? [], path]);
}

// These requested spinal nerves are opaque somatic landmarks, not dorsal roots.
// Keep their existing head/neck membership and admit both live-model sides.
for (const level of [1, 2, 3, 4]) {
  const key = normalizeAutonomicName(`C${level} spinal nerve`);
  memberships.set(key, [...memberships.get(key) ?? [],
    [...AUTONOMIC_ROOT_PATH, 'sympathetic', 'cervical']]);
}

for (const key of cranialParasympathetic) {
  const path = [...AUTONOMIC_ROOT_PATH, 'parasympathetic', 'cranial'];
  const previous = memberships.get(key) ?? [];
  if (!previous.some(member => member.join('/') === path.join('/'))) memberships.set(key, [...previous, path]);
}

for (const key of [...sympatheticHeadPathways, ...sympatheticHeadTargets]) {
  const path = [...AUTONOMIC_ROOT_PATH, 'sympathetic', 'cervical'];
  const previous = memberships.get(key) ?? [];
  if (!previous.some(member => member.join('/') === path.join('/'))) memberships.set(key, [...previous, path]);
}

function addHeadMembership(key: string, subgroup: string) {
  const path = [...AUTONOMIC_ROOT_PATH, 'head-neck', subgroup];
  const previous = memberships.get(key) ?? [];
  if (!previous.some(member => member.join('/') === path.join('/'))) memberships.set(key, [...previous, path]);
}

// Preserve pathway-specific browsing while sharing relevant mixed carriers.
for (const key of sympatheticHeadPathways) {
  if (/trigeminal|gasserian|ophthalmic|nasociliary|ciliary|oculomotor|lacrimal/.test(key)) addHeadMembership(key, 'ocular');
  if (/trigeminal|gasserian|maxillary|zygomatic|lacrimal|vidian|petrosal|pterygopalatine/.test(key)) addHeadMembership(key, 'pterygopalatine');
}
for (const key of sympatheticHeadTargets) {
  addHeadMembership(key, 'ocular');
  if (key === 'lacrimal gland') addHeadMembership(key, 'pterygopalatine');
}
for (const key of cranialParasympathetic) addHeadMembership(key, 'ganglia');
addHeadMembership(normalizeAutonomicName('Posterior nucleus of vagus nerve'), 'ganglia');
addHeadMembership(normalizeAutonomicName('Auriculotemporal nerve'), 'ganglia');
for (const name of ['Carotid body', 'Carotid body left', 'Carotid body right']) {
  addHeadMembership(normalizeAutonomicName(name), 'carotid');
}
for (const name of ['Middle cervical sympathetic ganglion', 'Inferior cervical sympathetic ganglion',
  'Middle cervical ganglion', 'Inferior cervical ganglion', 'Cervicothoracic Ganglion (Stellatum)',
  'Cervicothoracic ganglion', 'Stellate ganglion', 'Ansa subclavia']) {
  addHeadMembership(normalizeAutonomicName(name), 'carotid');
}

for (const [subgroup, names] of [
  ['abdominal', ['Greater splanchnic nerve', 'Greater splanchnic nerves',
    'Lesser splanchnic nerve', 'Lesser splanchnic nerves', 'Lesser splanchinc nerve',
    'Lesser splanchinc nerves', 'Least splanchnic nerve', 'Least splanchnic nerves']],
  ['pelvic', ['Hypogastric nerve', 'Hypogastric nerves', 'Hypogastric plexus',
    'Superior hypogastric plexus', 'Inferior hypogastric plexus', 'Superior hypogastric nerves',
    'Inferior hypogastric nerve', 'Inferior hypogastric nerves', 'Inferior hypogastric nerves and plexus']],
  ['', ['Paravertebral sympathetic ganglia', 'Paravertebral sympathetic ganglion',
    'Thoracic sympathetic ganglia', 'Lumbar sympathetic ganglia', 'Sacral sympathetic ganglia',
    'Sympathetic trunk', 'Rami communicantes grisei',
    'Rami communicantes griseithoracic retion', 'Rami communicantes griseithoracic region',
    'Rami communicantes grisei thoracic region', 'Rami communicantes grisei lumbar region',
    'Rami communicantes grisei sacral region']],
] as const) {
  for (const name of names) {
    const key = normalizeAutonomicName(name);
    const path = [...AUTONOMIC_ROOT_PATH, 'plexuses', ...(subgroup ? [subgroup] : [])];
    const previous = memberships.get(key) ?? [];
    if (!previous.some(member => member.join('/') === path.join('/'))) memberships.set(key, [...previous, path]);
    if (subgroup === 'abdominal') {
      const abdominal = [...AUTONOMIC_ROOT_PATH, 'sympathetic', 'abdominal'];
      const members = memberships.get(key) ?? [];
      if (!members.some(member => member.join('/') === abdominal.join('/')))
        memberships.set(key, [...members, abdominal]);
    }
  }
}

// Keep the original unsplit cord meshes: do not pretend they are individually
// segmented thoracic/lumbar geometry. A whole-cord alias is used only if loaded.
for (const key of [...sympatheticSpinalCord, normalizeAutonomicName('Spinal cord')]) {
  const path = [...AUTONOMIC_ROOT_PATH, 'sympathetic', 'abdominal'];
  memberships.set(key, [...memberships.get(key) ?? [], path]);
}

for (const { names, paths } of [...REQUESTED_AUTONOMIC_NERVES, ...AUTONOMIC_HYPOTHALAMUS_MEMBERSHIPS]) {
  for (const name of names) {
    const key = normalizeAutonomicName(name);
    const members = [...memberships.get(key) ?? []];
    for (const suffix of paths) {
      const path = [...AUTONOMIC_ROOT_PATH, ...suffix];
      if (!members.some(member => member.join('/') === path.join('/'))) members.push(path);
    }
    memberships.set(key, members);
  }
}

export function isAutonomicNervousName(rawName: string): boolean {
  const key = normalizeAutonomicName(rawName);
  return memberships.has(key) || autonomicParavertebralSelection(key) !== null;
}

/** Shared anatomy stays in every relevant group, resolved in browsing context. */
export function autonomicPathForGroup(
  node: SceneNode, groupPath: readonly string[],
): readonly string[] | null {
  if (!AUTONOMIC_ROOT_PATH.every((part, i) => groupPath[i] === part)) return null;
  const key = normalizeAutonomicName(node.rawName);
  // Creator correction is left-specific; preserve the right nerve and the
  // independent abdominal-plexus membership of both sides.
  if ((groupPath.length === AUTONOMIC_ROOT_PATH.length || groupPath[2] === 'sympathetic')
    && /^least splanchnic nerves?$/.test(key)
    && /[._]l(?:\.\d+|_\d+)*$/i.test(node.rawName.trim().replace(/\s+(?=\.)/g, ''))
    && (!node.systemId || node.systemId === 'nervous')) {
    const path = [...AUTONOMIC_ROOT_PATH, 'sympathetic', 'abdominal'];
    return groupPath.every((part, i) => path[i] === part) ? path : null;
  }
  const paravertebral = autonomicParavertebralSelection(key);
  if ((groupPath[2] === 'plexuses' || (groupPath.length === AUTONOMIC_ROOT_PATH.length && !memberships.has(key)))
    && paravertebral && (!node.systemId || node.systemId === 'nervous')
    && !(groupPath[3] === 'pelvic' && memberships.get(key)?.some(path =>
      groupPath.every((part, i) => path[i] === part)))) {
    const path = [...AUTONOMIC_ROOT_PATH, 'plexuses', 'paravertebral', paravertebral];
    return groupPath.every((part, i) => path[i] === part) ? path : null;
  }
  const trigeminalMotorNucleus = /trigemin/.test(key) && /motor/.test(key) && /nucle|neucle/.test(key);
  const trigeminalMotorRoot = /trigemin/.test(key) && /motor/.test(key) && /\broot\b/.test(key);
  const excludedFromSympathetic = /oculomot(?:or|r)/.test(key) || trigeminalMotorNucleus
    || trigeminalMotorRoot;
  if (isSympatheticAbdominalArtery(node)
    && (groupPath.length === AUTONOMIC_ROOT_PATH.length || groupPath[2] === 'sympathetic')) {
    const path = [...AUTONOMIC_ROOT_PATH, 'sympathetic', 'abdominal'];
    return groupPath.every((part, i) => path[i] === part) ? path : null;
  }
  if (isSympatheticOverviewVessel(node, groupPath))
    return [...AUTONOMIC_ROOT_PATH, 'sympathetic'];
  if (groupPath[2] === 'sympathetic' && excludedFromSympathetic) return null;
  if (groupPath[2] === 'parasympathetic' && trigeminalMotorRoot) return null;
  if (groupPath[2] === 'sympathetic' && isSympatheticBrainstemContext(node)) {
    const path = [...AUTONOMIC_ROOT_PATH, 'sympathetic', 'brainstem'];
    return groupPath.every((part, i) => path[i] === part) ? path : null;
  }
  if (groupPath[2] === 'head-neck' && (trigeminalMotorNucleus || trigeminalMotorRoot)) return null;
  if (groupPath[2] === 'head-neck' && isHeadNeckRetainedContextNode(node)) {
    return [...AUTONOMIC_ROOT_PATH, 'head-neck'];
  }
  const parasympatheticViscera = parasympatheticVisceralPath(node, groupPath);
  if (parasympatheticViscera) return parasympatheticViscera;
  const visceralContext = entericVisceralPath(node, groupPath);
  if (visceralContext) return visceralContext;
  const plexusContext = plexusContextPath(node, groupPath);
  if (plexusContext) return plexusContext;
  const landmarkSystem = headNeckLandmarkSystem(node.rawName);
  if ((!node.systemId || node.systemId === landmarkSystem) && landmarkSystem) {
    if (groupPath[2] === 'head-neck') {
      const path = [...AUTONOMIC_ROOT_PATH, 'head-neck', headNeckLandmarkSubgroup(node.rawName)!];
      return groupPath.every((part, i) => path[i] === part) ? path : null;
    }
    // Cross-system landmarks must also be discoverable before a category is chosen.
    if (groupPath.length === AUTONOMIC_ROOT_PATH.length && landmarkSystem !== 'skeletal') {
      return [...AUTONOMIC_ROOT_PATH, 'head-neck', headNeckLandmarkSubgroup(node.rawName)!];
    }
  }
  if (isParasympatheticContext(node)) {
    // Brainstem and skull landmarks accompany both cranial and vagal views.
    // Do not populate the absent sacral pathway with context-only meshes.
    const paths = ['cranial', 'vagus'].map(subgroup => [...AUTONOMIC_ROOT_PATH, 'parasympathetic', subgroup]);
    return paths.find(path => groupPath.every((part, i) => path[i] === part)) ?? null;
  }
  const region = sympatheticVertebralRegion(node.rawName);
  if (region && (!node.systemId || node.systemId === 'skeletal')) {
    if (groupPath[2] === 'sympathetic' && groupPath[3] === 'abdominal'
      && isPlexusVertebralName(node.rawName)) {
      const path = [...AUTONOMIC_ROOT_PATH, 'sympathetic', 'abdominal'];
      return groupPath.every((part, i) => path[i] === part) ? path : null;
    }
    // Share lumbar landmarks with the requested teaching views, preserving
    // their canonical Abdominal membership: L1–L5 in Thoracic, L3–L5 in Pelvic.
    const lumbar = region === 'abdominal' && groupPath[2] === 'sympathetic';
    const contextRegion = lumbar && groupPath[3] === 'thoracic' ? 'thoracic'
      : lumbar && groupPath[3] === 'pelvic' && /^vertebra l[3-5]$/.test(key) ? 'pelvic' : region;
    const path = [...AUTONOMIC_ROOT_PATH, 'sympathetic', contextRegion];
    return groupPath.every((part, i) => path[i] === part) ? path : null;
  }
  if (node.systemId && node.systemId !== 'nervous') return null;
  if (/\bdura\b/.test(normalizeAutonomicName(node.rawName))) return null;
  return memberships.get(key)?.find(path =>
    !(excludedFromSympathetic && path[2] === 'sympathetic')
    && !(trigeminalMotorRoot && path[2] === 'parasympathetic')
    && !((trigeminalMotorNucleus || trigeminalMotorRoot) && path[2] === 'head-neck')
    && groupPath.every((part, i) => path[i] === part)) ?? null;
}

export function autonomicContextIds(nodes: readonly SceneNode[], path: readonly string[]): number[] {
  return nodes.filter(node => (isAutonomicHypothalamusSurface(node.rawName)
    || isSympatheticAbdominalArtery(node)
    || isSympatheticOverviewVessel(node, path)
    || (path[2] === 'sympathetic' && isSympatheticBrainstemContext(node))
    || sympatheticVertebralRegion(node.rawName) || isParasympatheticContext(node)
    || (path[2] === 'parasympathetic' && isParasympatheticVisceralContextNode(node))
    || (path[2] === 'head-neck' && isHeadNeckRetainedContextNode(node))
    || (path[2] === 'plexuses' && isPlexusContextNode(node))
    || (path[2] === 'enteric' && isEntericVisceralContextNode(node)))
    && autonomicPathForGroup(node, path)).map(node => node.instanceID);
}

export function autonomicForegroundIds(nodes: readonly SceneNode[], path: readonly string[]): number[] {
  return nodes.filter(node => !isAutonomicHypothalamusSurface(node.rawName)
    && !isSympatheticAbdominalArtery(node)
    && !isSympatheticOverviewVessel(node, path)
    && !(path[2] === 'sympathetic' && isSympatheticBrainstemContext(node))
    && !sympatheticVertebralRegion(node.rawName) && !isParasympatheticContext(node)
    && !(path[2] === 'parasympathetic' && isParasympatheticVisceralContextNode(node))
    && !(path[2] === 'head-neck' && isHeadNeckRetainedContextNode(node))
    && !(path[2] === 'plexuses' && isPlexusContextNode(node))
    && !(path[2] === 'enteric' && isEntericVisceralContextNode(node))
    && autonomicPathForGroup(node, path)).map(node => node.instanceID);
}

export const AUTONOMIC_SOURCE_NOTES = {
  sacral: 'No separate pelvic splanchnic nerve meshes are present in the nervous-system CSV.',
  ocular: 'Brainstem, cervical vertebrae, temporal and sphenoid bones are semitransparent. Eyes, lacrimal and salivary glands, C1–C4 dorsal roots, carotid arteries and carotid bodies stay opaque. C1–C4 spinal nerves and brachial plexus roots are opaque somatic landmarks, not reclassified autonomic fibers. Salivatory and posterior vagal nuclei, submandibular ganglion nerves, tympanic pathways and membranes, cervical ganglia, ansa subclavia, subclavian arteries and aortic arch also stay opaque. Trigeminal motor nuclei and motor roots are excluded. The inferior cervical ganglion is represented by the cervicothoracic (stellate) ganglion. No separate ocular sympathetic fiber mesh is provided.',
  sympatheticHead: 'Head pathways include mixed nerve carriers and ganglion landmarks; sympathetic fibers pass through the ciliary and pterygopalatine ganglia without synapsing there. The source has no separately named long ciliary nerve, sympathetic root to the ciliary ganglion, iris dilator muscle or superior tarsal muscle.',
};
