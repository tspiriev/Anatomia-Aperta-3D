import { buildAdvancedCollection, structures, collection, type AdvancedCollection } from './advancedCollection';

// Requested teaching hierarchy, restricted to meshes in the cleaned nervous
// CSV. Whole horns are not split into invented nuclear columns. The canal is
// a parent-level reference structure, not mislabeled as central gray matter.
const definition: AdvancedCollection = {
  id: 'spinal-cord',
  label: 'Spinal cord',
  objects: ['Central canal', "Central canal'"],
  children: [
    {
      id: 'white-matter',
      label: 'White matter tracts',
      objects: ['White matter of spinal cord'],
      children: [
        collection('descending-motor', 'Descending motor pathways',
          collection('pyramidal', 'Pyramidal tracts',
            structures('lateral-corticospinal', 'Lateral corticospinal tract', 'Lateral corticospinal tract'),
            structures('anterior-corticospinal', 'Anterior corticospinal tract', 'Anterior corticospinal tract'),
          ),
          collection('extrapyramidal', 'Extrapyramidal tracts',
            structures('rubrospinal', 'Rubrospinal tract', 'Rubrospinal tract'),
            collection('vestibulospinal', 'Vestibulospinal tracts',
              structures('lateral', 'Lateral vestibulospinal tract', 'Lateral vestibulospinal tract'),
              structures('medial', 'Medial vestibulospinal tract', 'Medial vestibulospinal tract'),
            ),
            collection('reticulospinal', 'Reticulospinal tracts',
              structures('lateral', 'Lateral reticulospinal tract', 'Lateral reticulospinal tract'),
              structures('medial', 'Medial reticulospinal tract', 'Medial reticulospinal tract'),
            ),
            structures('tectospinal', 'Tectospinal tract', 'Tectospinal tract'),
          ),
        ),
        collection('ascending-somatosensory', 'Ascending somatosensory pathways',
          collection('dorsal-column', 'Dorsal column system',
            structures('gracilis', 'Fasciculus gracilis', 'Gracile fasciculus'),
            structures('cuneatus', 'Fasciculus cuneatus', 'Cuneate fasciculus'),
          ),
          collection('anterolateral', 'Pain, temperature and crude touch',
            structures('lateral-spinothalamic', 'Lateral spinothalamic tract', 'Lateral spinothalamic tract'),
            structures('anterior-spinothalamic', 'Anterior spinothalamic tract', 'Anterior spinothalamic tract'),
            collection('other-anterolateral', 'Other anterolateral pathways',
              structures('spinotectal', 'Spinotectal tract', 'Spinotectal tract'),
            ),
          ),
        ),
        collection('ascending-cerebellar', 'Ascending cerebellar pathways',
          structures('posterior-spinocerebellar', 'Posterior spinocerebellar tract', 'Posterior spinocerebellar tract'),
          structures('anterior-spinocerebellar', 'Anterior spinocerebellar tract', 'Anterior spinocerebellar tract'),
        ),
        collection('other-spinal', 'Other spinal cord pathways',
          collection('fasciculus-proprius', 'Fasciculus proprius',
            structures('posterior', 'Posterior fasciculus proprius', 'Posterior fasciculus proprius'),
            structures('anterior', 'Anterior fasciculus proprius', 'Anterior fasciculus proprius'),
            structures('lateral', 'Lateral fasciculus proprius', 'Lateral fasciculus proprius'),
          ),
          collection('other-intrinsic', 'Other intrinsic spinal pathways',
            structures('lissauer', 'Lissauer’s tract', "Posterolateral (Lissauer's) tract"),
          ),
        ),
      ],
    },
    collection('gray-matter', 'Gray matter',
      structures('anterior-horn', 'Anterior horn', 'Anterior horn of spinal cord'),
      {
        id: 'posterior-horn',
        label: 'Posterior horn',
        objects: ['Posterior horn of spinal cord'],
        children: [
          structures('nucleus-proprius', 'Nucleus proprius', 'Nucleus proprius'),
        ],
      },
      {
        id: 'intermediate-gray',
        label: 'Intermediate gray matter',
        objects: ['Lateral intermediate substance'],
        children: [
          structures('intermediolateral', 'Intermediolateral cell column', 'Intermediolateral nucleus'),
          structures('intermediomedial', 'Intermediomedial nucleus', 'Intermediomedial nucleus'),
          structures('clarke', 'Clarke’s nucleus', "Dorsal nucleus Clarke's nucleus"),
        ],
      },
    ),
  ],
};

const taxonomy = buildAdvancedCollection(definition);
export const SPINAL_CORD_GROUP = taxonomy.group;

// All these source objects are unsided. Preserve that distinction from sided
// brainstem tract segments; tolerate numeric Blender/Sketchfab export suffixes.
const sourceNames = new Set<string>();
function sourceName(rawName: string): string {
  return rawName.trim().toLowerCase()
    .replace(/\.+$/, '')
    .replace(/(?:\.+\d+\.*|_\d+)+$/g, '')
    .replace(/\.+$/, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}
function register(group: AdvancedCollection) {
  group.objects?.forEach((object) => sourceNames.add(sourceName(object)));
  group.children?.forEach(register);
}
register(definition);

export function classifySpinalCordObject(rawName: string): readonly string[] | null {
  return sourceNames.has(sourceName(rawName)) ? taxonomy.classify(rawName) : null;
}
