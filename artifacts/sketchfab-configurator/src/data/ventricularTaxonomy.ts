import { buildAdvancedCollection, collection, structures } from './advancedCollection';
import { basalForebrainContextPath, isBasalForebrainOpaqueStructure, WHOLE_BRAIN_CONTEXT_NAME } from './basalForebrainTaxonomy';
import type { SceneNode } from '../types/sketchfab';

const taxonomy = buildAdvancedCollection(collection('ventricular-system', 'Ventricular system',
  collection('ventricles', 'Ventricles',
    structures('lateral', 'Lateral ventricles', 'Lateral ventricle'),
    structures('third', 'Third ventricle', 'Third ventricle'),
    structures('aqueduct', 'Cerebral aqueduct', 'Aqueduct of midbrain'),
    structures('fourth', 'Fourth ventricle', 'Fourth ventricle'),
  ),
  structures('septum-pellucidum', 'Septum pellucidum', 'Septum pellucidum'),
  structures('choroid-plexus', 'Choroid plexuses (plexus choroideus)', 'Choroid plexus'),
));

export const classifyVentricularObject = taxonomy.classify;
export const VENTRICULAR_GROUP = {
  ...taxonomy.group,
  children: [...taxonomy.group.children!, {
    id: `${taxonomy.group.id}/context`, label: WHOLE_BRAIN_CONTEXT_NAME,
  }],
};

export function ventricularPathForGroup(rawName: string): readonly string[] | null {
  return basalForebrainContextPath(rawName)
    ? [...taxonomy.group.id.split('/'), 'context'] : classifyVentricularObject(rawName);
}

export const isBrainContextForeground = (node: SceneNode) =>
  isBasalForebrainOpaqueStructure(node)
  || (node.systemId === 'nervous' && classifyVentricularObject(node.rawName) !== null);
