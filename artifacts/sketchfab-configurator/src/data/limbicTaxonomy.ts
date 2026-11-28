import { buildAdvancedCollection, collection, structures, normalizeAdvancedObjectName } from './advancedCollection';
import grossMemberships from './brainGrossAnatomyMemberships.json';
import { DIENCEPHALON_DEFINITION } from './diencephalonTaxonomy';

// This focused collection overlaps the existing gross, white-matter and
// diencephalon collections; it never moves structures out of those menus.
const limbic = buildAdvancedCollection(collection('limbic-system', 'Limbic system',
  structures('structures', 'Limbic structures',
    ...new Set(grossMemberships.limbic.map(normalizeAdvancedObjectName))),
  collection('white-matter', 'Limbic white matter connections',
    structures('cingulum', 'Cingulum fibers', 'Cingulum fibers'),
    structures('anterior-thalamic-radiations', 'Anterior thalamic radiations', 'Fibers from anterior thalamic nuclei'),
    structures('mammillothalamic', 'Mammillothalamic tract (Vicq d’Azyr)', "bundle of Vicq d'Azyr tractus mamillothalamicus"),
    structures('mediodorsal-thalamic', 'Mediodorsal thalamic fibers', 'Mediodorsal thalamic fibers'),
    structures('hippocampal-commissure', 'Hippocampal commissure', 'Hippocampal commissure'),
    // These connections also belong to the original gross limbic structures.
    structures('fornix', 'Fornix'),
    structures('anterior-commissure', 'Anterior commissure'),
    structures('stria-terminalis', 'Stria terminalis'),
    structures('stria-medullaris', 'Stria medullaris thalami'),
    collection('ansa-peduncularis', 'Ansa peduncularis fibers',
      structures('amygdaloseptal', 'Amygdaloseptal fibers', 'Ansa peduncularis Amygdaloseptal fibers'),
      structures('amygdalohypothalamic', 'Amygdalohypothalamic fibers', 'Ansa peduncularis Amygdalohypothalamic fibers'),
      structures('amygdalothalamic', 'Amygdalothalamic fibers', 'Ansa peduncularis Amygdalothalamic fibers'),
    ),
  ),
  DIENCEPHALON_DEFINITION.children!.find(group => group.id === 'hypothalamus')!,
  collection('thalamus', 'Limbic thalamus',
    structures('capsule', 'Thalamus capsule / outer surface', 'Thalamus', '00_Thalamic_background_core'),
    collection('nuclei', 'Associated thalamic nuclei',
      collection('anterior', 'Anterior nuclear complex',
        structures('av', 'Anteroventral nucleus (AV)', '01_Anterior_ventral_AV'),
        structures('ad', 'Anterodorsal nucleus (AD)', '02_Anterior_dorsal_AD'),
        structures('am', 'Anteromedial nucleus (AM)', '03_Anterior_medial_AM'),
      ),
      structures('mediodorsal', 'Mediodorsal nucleus (MD)', '04_Mediodorsal_MD'),
      structures('midline', 'Midline nuclei', '05_Midline_nuclei'),
      structures('lateral-dorsal', 'Lateral dorsal nucleus (LD)', '08_Lateral_dorsal_LD'),
      collection('intralaminar', 'Intralaminar nuclear complex',
        structures('rostral', 'Rostral nuclei (CL, PC, CeM)', '06_Intralaminar_rostral_CL_PC_CeM'),
        structures('cm-pf', 'Centromedian–parafascicular complex (CM, Pf)', '07_Centromedian_parafascicular_CM_Pf'),
      ),
    ),
  ),
));

export const LIMBIC_GROUP = limbic.group;
export const classifyLimbicObject = limbic.classify;

const sharedConnections = new Map([
  ['anterior commissure', 'anterior-commissure'],
  ['fornix', 'fornix'],
  ['stria terminalis', 'stria-terminalis'],
  ['stria medullaris thalami', 'stria-medullaris'],
]);

export function limbicPathForGroup(rawName: string, groupPath: readonly string[]): readonly string[] | null {
  const path = classifyLimbicObject(rawName);
  if (!path) return null;
  const prefix = LIMBIC_GROUP.id.split('/');
  if (groupPath[2] === 'white-matter') {
    const connection = sharedConnections.get(normalizeAdvancedObjectName(rawName));
    if (connection) return [...prefix, 'white-matter', connection];
  }
  // Retain the outer thalamus/background when viewing a nuclear complex or
  // individual nucleus. The context meshes stay selectable in that isolation.
  if (groupPath[2] === 'thalamus' && groupPath[3] === 'nuclei' && path[3] === 'capsule') {
    return groupPath;
  }
  return path;
}
