import { normalizeAdvancedObjectName } from './advancedCollection';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';
import { classifyBrainGrossAnatomy } from './brainGrossAnatomy';

export const TEMPORAL_ASSOCIATION_ROOT_PATH = ['advanced-neuroanatomy', 'temporal-stem-sagittal-stratum'] as const;
export const TEMPORAL_BRAIN_CONTEXT_NAME = 'Supratentorial brain (semitransparent)';
const normalize = (name: string) => normalizeAdvancedObjectName(name).replace(/’/g, "'");
export function isTemporalBrainContext(node: Pick<SceneNode, 'rawName'>): boolean {
  const name = normalize(node.rawName);
  return classifyBrainGrossAnatomy(node.rawName)?.[2] === 'brain-lobes'
    || [normalize(TEMPORAL_BRAIN_CONTEXT_NAME), 'brain', 'cerebrum', 'cerebral hemisphere',
      'cerebral hemispheres', 'cerebral cortex', 'supratentorial brain', 'brain (supratentorial)', 'telencephalon'].includes(name);
}
export function isTemporalStemPath(path: readonly string[]): boolean {
  return TEMPORAL_ASSOCIATION_ROOT_PATH.every((part, i) => path[i] === part) && path[2] === 'temporal-stem';
}
export function isTemporalBrainContextPath(path: readonly string[]): boolean {
  return TEMPORAL_ASSOCIATION_ROOT_PATH.every((part, i) => path[i] === part)
    && ['temporal-stem', 'sagittal-stratum', 'association-fibers', 'temporal-lobe'].includes(path[2]);
}
export function isTemporalLobePath(path: readonly string[]): boolean {
  return TEMPORAL_ASSOCIATION_ROOT_PATH.every((part, i) => path[i] === part) && path[2] === 'temporal-lobe';
}
export function isTemporalBrainstemContext(node: Pick<SceneNode, 'rawName'>): boolean {
  return classifyBrainGrossAnatomy(node.rawName)?.[2] === 'brainstem'
    || ['brainstem', 'brain stem', 'midbrain', 'pons', 'medulla oblongata'].includes(normalize(node.rawName));
}
export function temporalAssociationContextIds(nodes: readonly SceneNode[], path: readonly string[]): number[] {
  return nodes.filter(node =>
    (isTemporalBrainContextPath(path) && isTemporalBrainContext(node))
    || (isTemporalLobePath(path) && isTemporalBrainstemContext(node))).map(node => node.instanceID);
}
const component = (label: string, ...names: string[]) => ({ label, names: new Set(names.map(normalize)) });

export const TEMPORAL_ASSOCIATION_COMPONENTS = {
  uncinate: component('Uncinate fasciculus', 'Uncinate fascicle', 'Uncinate fasciculus'),
  ifof: component('Inferior fronto-occipital fasciculus (IFOF)', 'Inferor FrontoOccipital Fascicle (IFOF)',
    'Inferior fronto-occipital fasciculus', 'Inferior fronto-occipital fasciculus (IFOF)',
    'Inferior fronto-occipital fascicle', 'Inferior fronto-occipital fascicle (IFOF)', 'IFOF'),
  temporalCommissure: component('Anterior commissure — temporal component',
    'Anterior commissure - temporal component', 'Anterior commissure temporal component',
    'Anterior commissure (temporal component)', 'Temporal component of anterior commissure',
    'Anterior commissure temporal fibers', 'Anterior commissure - temporal fibers',
    'Anterior commissure - temporal part', 'Anterior commissure (temporal part)', 'Temporal part of anterior commissure'),
  temporalOptic: component('Optic radiation — temporal component (Meyer’s loop)',
    'Temporal optic radiation', 'Temporal optic radiations', 'Meyer loop', "Meyer's loop",
    "Optic radiation (Meyer's loop)", "Optic radiation - temporal component (Meyer's loop)",
    'Optic radiation (temporal component)', 'Optic radiation - temporal component',
    'Optic radiation temporal component', 'Meyers loop', "Meyer's loop of optic radiation",
    'Optic radiation', 'Optic radiations'),
  auditory: component('Auditory radiation', 'Auditory fibers', 'Auditory radiation', 'Auditory radiations'),
  temporopontine: component('Temporopontine fibers', 'Temporoponne fibers', 'Temporopontine fibers'),
  optic: component('Optic radiation', 'Optic radiation', 'Optic radiations'),
  posteriorThalamic: component('Posterior thalamic radiations', 'Posterior thalamic radiation',
    'Posterior thalamic radiations', 'Pulvinar fibers'),
  ilf: component('Inferior longitudinal fasciculus (ILF)', 'Inferior Longitudinal Fascicle (ILF)',
    'Inferior longitudinal fasciculus', 'Inferior longitudinal fasciculus (ILF)', 'ILF'),
  slf1: component('SLF I', 'Superior longitudinal fascicle (SLF) I', 'Superior longitudinal fasciculus I', 'SLF I'),
  slf2: component('SLF II', 'Superior longitudinal fiascicle (SLF) II', 'Superior longitudinal fascicle (SLF) II',
    'Superior longitudinal fasciculus II', 'SLF II'),
  slf3: component('SLF III', 'Superior longitudinal fascicle III', 'Superior longitudinal fascicle (SLF) III',
    'Superior longitudinal fasciculus III', 'SLF III'),
  arcuate: component('Arcuate fasciculus', 'Arcuate fascicle', 'Arcuate fasciculus'),
  middleLongitudinal: component('Middle longitudinal fasciculus', 'Middle longitudinal fascicle',
    'Middle longitudianl fascicle',
    'Middle longitudinal fasciculus', 'Middle longitudinal fasciculus (MdLF)', 'Middle longitudinal fascicle (MdLF)', 'MdLF'),
  frontalAslant: component('Frontal aslant tract', 'Frontal aslant tract'),
  cingulum: component('Cingulum', 'Cingulum', 'Cingulum fibers'),
  supratentorialBrain: component(TEMPORAL_BRAIN_CONTEXT_NAME, TEMPORAL_BRAIN_CONTEXT_NAME),
  brainstemGross: component('Brainstem gross anatomy (semitransparent)', 'Brainstem', 'Brain stem', 'Midbrain', 'Pons', 'Medulla oblongata'),
  anteriorCommissure: component('Anterior commissure (AC)', 'Anterior commissure'),
  amygdala: component('Amygdala', 'Amygdala', 'Amygdaloid body', 'Amygdaloid nucleus', 'Amygdaloid complex'),
  lateralVentricles: component('Lateral ventricles', 'Lateral ventricle', 'Lateral ventricles'),
  thirdVentricle: component('Third ventricle', 'Third ventricle'),
  aqueduct: component('Cerebral aqueduct', 'Aqueduct of midbrain', 'Cerebral aqueduct'),
  fourthVentricle: component('Fourth ventricle', 'Fourth ventricle'),
  caudate: component('Caudate nucleus', 'Caudate nucleus', 'Head of caudate nucleus', 'Body of caudate nucleus', 'Tail of caudate nucleus'),
  putamen: component('Putamen', 'Putamen'),
  externalPallidum: component('Globus pallidus externus', 'Globus pallidus externus', 'External segment of globus pallidus'),
  internalPallidum: component('Globus pallidus internus', 'Globus pallidus internus', 'Internal segment of globus pallidus'),
  accumbens: component('Nucleus accumbens', 'Nucleus accumbens'),
  subthalamic: component('Subthalamic nucleus', 'Subthalamic nucleus'),
  substantiaNigra: component('Substantia nigra', 'Substantia nigra', 'Substantia nigra pars compacta',
    'Substantia nigra pars reticularis', 'Substantia nigra pars reticulata'),
};
type ComponentId = keyof typeof TEMPORAL_ASSOCIATION_COMPONENTS;
type Entry = { id: string; label: string; components?: readonly ComponentId[]; children?: readonly Entry[]; role?: 'adjacent' };
const leaf = (id: ComponentId): Entry => ({ id, label: TEMPORAL_ASSOCIATION_COMPONENTS[id].label, components: [id] });
const ventricularAndBasalGroups: readonly Entry[] = [
  { id: 'ventricles', label: 'Ventricles', children: [
    leaf('lateralVentricles'), leaf('thirdVentricle'), leaf('aqueduct'), leaf('fourthVentricle'),
  ] },
  { id: 'basal-ganglia', label: 'Basal ganglia', children: [
    leaf('caudate'), leaf('putamen'), leaf('externalPallidum'), leaf('internalPallidum'),
    leaf('accumbens'), leaf('subthalamic'), leaf('substantiaNigra'),
  ] },
];
export const TEMPORAL_ASSOCIATION_DEFINITIONS: readonly Entry[] = [
  { id: 'temporal-stem', label: 'Temporal Stem',
    children: [
      ...(['uncinate', 'ifof', 'temporalCommissure', 'temporalOptic', 'auditory', 'temporopontine', 'supratentorialBrain'] as const).map(leaf),
      ...ventricularAndBasalGroups,
    ] },
  { id: 'sagittal-stratum', label: 'Sagittal Stratum', children: [
    { id: 'principal-components', label: 'Principal components', children: ['ifof', 'optic', 'posteriorThalamic'].map(id => leaf(id as ComponentId)) },
    { id: 'adjacent-pathway', label: 'Adjacent ventral association pathway', role: 'adjacent', children: [leaf('ilf')] },
    leaf('supratentorialBrain'),
    ...ventricularAndBasalGroups,
  ] },
  { id: 'association-fibers', label: 'Association Fibers', children: [
    { id: 'superior-longitudinal', label: 'Superior Longitudinal System', children: ['slf1', 'slf2', 'slf3', 'arcuate'].map(id => leaf(id as ComponentId)) },
    { id: 'inferior-association', label: 'Inferior Association System', children: ['ifof', 'ilf', 'middleLongitudinal', 'uncinate'].map(id => leaf(id as ComponentId)) },
    { id: 'frontal-association', label: 'Frontal Association', children: [leaf('frontalAslant')] },
    { id: 'limbic-association', label: 'Limbic Association', children: [leaf('cingulum')] },
    leaf('supratentorialBrain'),
  ] },
  { id: 'temporal-lobe', label: 'Temporal lobe', children: [
    ...(['ifof', 'ilf', 'uncinate', 'optic', 'anteriorCommissure', 'amygdala', 'cingulum',
      'middleLongitudinal', 'auditory', 'temporopontine', 'posteriorThalamic',
      'supratentorialBrain'] as const).map(leaf),
    leaf('brainstemGross'),
    ...ventricularAndBasalGroups,
  ] },
];
const componentsByPath = new Map<string, readonly ComponentId[]>();
function register(entry: Entry, parent: readonly string[]): NervousGroup {
  const path = [...parent, entry.id];
  const children = entry.children?.map(child => register(child, path));
  const components = [...new Set([
    ...entry.components ?? [],
    ...entry.children?.flatMap(child => componentsByPath.get([...path, child.id].join('/')) ?? []) ?? [],
  ])];
  componentsByPath.set(path.join('/'), components);
  return { id: path.join('/'), label: entry.label, ...(children ? { children } : {}) };
}
export const TEMPORAL_ASSOCIATION_GROUPS = TEMPORAL_ASSOCIATION_DEFINITIONS.map(entry => register(entry, TEMPORAL_ASSOCIATION_ROOT_PATH));
componentsByPath.set(TEMPORAL_ASSOCIATION_ROOT_PATH.join('/'), Object.keys(TEMPORAL_ASSOCIATION_COMPONENTS) as ComponentId[]);
const within = (path: readonly string[], parent: readonly string[]) => parent.every((part, i) => path[i] === part);
const matches = (node: Pick<SceneNode, 'rawName'>, id: ComponentId) =>
  (id === 'supratentorialBrain' && isTemporalBrainContext(node))
  || (id === 'brainstemGross' && isTemporalBrainstemContext(node))
  || TEMPORAL_ASSOCIATION_COMPONENTS[id].names.has(normalize(node.rawName))
  || (id === 'anteriorCommissure' && TEMPORAL_ASSOCIATION_COMPONENTS.temporalCommissure.names.has(normalize(node.rawName)))
  // A separately modeled temporal optic component is also part of the optic radiation.
  || (id === 'optic' && TEMPORAL_ASSOCIATION_COMPONENTS.temporalOptic.names.has(normalize(node.rawName)));

export function temporalAssociationPathForGroup(node: SceneNode, requested: readonly string[]): readonly string[] | null {
  if (!within(requested, TEMPORAL_ASSOCIATION_ROOT_PATH)) return null;
  if (!(componentsByPath.get(requested.join('/')) ?? []).some(id => matches(node, id))) return null;
  return [...componentsByPath].find(([key, ids]) =>
    within(key.split('/'), requested) && ids.length === 1 && ids.some(id => matches(node, id))
    && ![...componentsByPath.keys()].some(other => other.startsWith(`${key}/`)))?.[0].split('/') ?? requested;
}
export const isTemporalAssociationNode = (node: SceneNode) => temporalAssociationPathForGroup(node, TEMPORAL_ASSOCIATION_ROOT_PATH) !== null;
export function temporalAssociationMissingComponents(nodes: readonly SceneNode[], requested: readonly string[]): string[] {
  return (componentsByPath.get(requested.join('/')) ?? [])
    .filter(id => !nodes.some(node => matches(node, id))).map(id => TEMPORAL_ASSOCIATION_COMPONENTS[id].label);
}
