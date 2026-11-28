import { normalizeAdvancedObjectName } from './advancedCollection';
import type { NervousGroup } from './nervousTaxonomy';

/** Only the enclosing hypothalamus surface fades, never its regulatory nuclei. */
export function isAutonomicHypothalamusSurface(rawName: string): boolean {
  return normalizeAdvancedObjectName(rawName) === 'hypothalamus';
}

// Rostrocaudal regions and longitudinal zones are separate teaching axes.
// Do not confine the periventricular/lateral/dorsal meshes to one rostrocaudal
// level, or confuse the source's periventricular nucleus with a missing PVN.
export const AUTONOMIC_HYPOTHALAMUS_SECTIONS = [
  { id: 'preoptic', label: 'Preoptic region', nuclei: [
    ['medial-preoptic', 'Medial preoptic nucleus', 'Medial_preoptic_nucleus'],
    ['lateral-preoptic', 'Lateral preoptic nucleus', 'Lateral_preoptic_nucleus'],
  ] },
  { id: 'anterior', label: 'Anterior (supraoptic) region', nuclei: [
    ['anterior-hypothalamic', 'Anterior hypothalamic nucleus', 'Anterior_hypothalamic_nucleus'],
    ['suprachiasmatic', 'Suprachiasmatic nucleus', 'Suprachiasmatic_nucleus'],
    ['supraoptic', 'Supraoptic nucleus', 'Supraoptic_nucleus'],
  ] },
  { id: 'tuberal', label: 'Tuberal region', nuclei: [
    ['arcuate', 'Arcuate nucleus', 'Arcuate_nucleus'],
    ['dorsomedial', 'Dorsomedial nucleus', 'Dorsomedial_nucleus'],
    ['ventromedial', 'Ventromedial nucleus', 'Ventromedial_nucleus'],
  ] },
  { id: 'posterior', label: 'Posterior region', nuclei: [
    ['posterior-hypothalamic', 'Posterior hypothalamic nucleus', 'Posterior_hypothalamic_nucleus'],
    ['tuberomammillary', 'Tuberomammillary nucleus', 'Tuberomammillary_nucleus'],
  ] },
  { id: 'periventricular', label: 'Periventricular zone', nuclei: [
    ['periventricular-nucleus', 'Periventricular nucleus', 'Periventricular_nucleus'],
  ] },
  { id: 'longitudinal-areas', label: 'Longitudinal hypothalamic areas', nuclei: [
    ['lateral-area', 'Lateral hypothalamic area', 'Lateral_hypothalamic_area'],
    ['dorsal-area', 'Dorsal hypothalamic area', 'Dorsal hypothalamic area'],
  ] },
] as const;

export const AUTONOMIC_HYPOTHALAMUS_NAMES = [
  'Hypothalamus', ...AUTONOMIC_HYPOTHALAMUS_SECTIONS.flatMap(section => section.nuclei.map(nucleus => nucleus[2])),
] as const;

// Shared central regulation, not an exclusive sympathetic/parasympathetic
// division. The older export files these objects under "Thalamus".
const categories = ['sympathetic', 'parasympathetic', 'head-neck'] as const;
export const AUTONOMIC_HYPOTHALAMUS_MEMBERSHIPS = [
  { names: ['Hypothalamus'], paths: categories.map(category => [category, 'hypothalamus', 'surface']) },
  ...AUTONOMIC_HYPOTHALAMUS_SECTIONS.flatMap(section => section.nuclei.map(([id, , name]) => ({
    names: [name],
    paths: categories.map(category => [category, 'hypothalamus', section.id, id]),
  }))),
];

/** The sidebar and fullscreen use the same registered hierarchy and controls. */
export function autonomicHypothalamusGroups(parent: readonly string[]): NervousGroup[] {
  return [
    { id: [...parent, 'surface'].join('/'), label: 'Hypothalamus surface (semitransparent)' },
    ...AUTONOMIC_HYPOTHALAMUS_SECTIONS.map(section => ({
      id: [...parent, section.id].join('/'), label: section.label,
      children: section.nuclei.map(([id, label]) => ({
        id: [...parent, section.id, id].join('/'), label,
      })),
    })),
  ];
}
