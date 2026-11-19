import type { SceneNode } from '../types/sketchfab';
import { skullBaseName, skullBaseVascularSource } from './skullBaseSources';
import { isSkullBaseCerebellarSurface } from './skullBaseCerebellum';

const eyeNames = new Set([
  'Eye', 'Eyeball', 'Globe', 'Globe of eye', 'Cornea', 'Sclera', 'Retina', 'Iris', 'Lens',
  'Vitreous body', 'Posterior segment of eyeball', 'Anterior segment of eyeball',
  'Anterior chamber of eyeball', 'Posterior chamber of eyeball', 'Ciliary body',
  'Ciliary body-curve', 'Zonular fibers-curve', 'Zonular fibres', 'Zonular fibers',
  'Suspensory ligament of eyeball',
].map(skullBaseName));
const brainstemNames = new Set(['Midbrain', 'Pons', 'Medulla oblongata', 'Brainstem', 'Brain stem'].map(skullBaseName));
const temporalNames = new Set(['Temporal bone', 'Temporal', 'Petrous bone',
  'Petrous temporal bone', 'Petrous apex'].map(skullBaseName));
const sphenoidNames = new Set(['Sphenoid bone', 'Sphenoid'].map(skullBaseName));
// The clivus spans sphenoid and occipital bone. Use actual whole-bone meshes
// when those regions are not separately modeled; never synthesize a fragment.
const clivalNames = new Set(['Clivus', 'Occipital bone', 'Occipital',
  'Sphenoid bone', 'Sphenoid'].map(skullBaseName));

export function isSkullBaseCervicalBone(rawName: string): boolean {
  const name = skullBaseName(rawName);
  return /^(?:atlas(?: \(c1\))?|axis(?: \(c2\))?|c[1-7](?: vertebra)?|cervical vertebrae?|cervical vertebra [1-7]|cervical vertebrae? \(?c[1-7]\)?|(?:first|second|third|fourth|fifth|sixth|seventh) cervical vertebra)$/.test(name);
}

/** Context belongs to the exact vascular group being isolated, not its menu
 * membership or the unrelated regional fossa collections. */
function vascularLeaf(path: readonly string[]): string | null {
  if (path.length !== 5 || path[0] !== 'advanced-neuroanatomy'
    || path[1] !== 'skull-base' || path[2] !== 'vascular') return null;
  const arterial = ['ophthalmic', 'meningeal', 'vertebral', 'basilar'];
  const venous = ['cavernous', 'basilarPlexus'];
  return (path[3] === 'arterial' && arterial.includes(path[4]))
    || (path[3] === 'venous' && venous.includes(path[4])) ? path[4] : null;
}

export function isSkullBaseVascularContext(node: SceneNode, path: readonly string[]): boolean {
  const name = skullBaseName(node.rawName);
  switch (vascularLeaf(path)) {
    case 'ophthalmic': return eyeNames.has(name);
    case 'meningeal': return temporalNames.has(name);
    case 'vertebral': return isSkullBaseCervicalBone(name) || clivalNames.has(name);
    case 'basilar': return brainstemNames.has(name) || isSkullBaseCerebellarSurface(node.rawName);
    case 'cavernous': return sphenoidNames.has(name);
    case 'basilarPlexus': return clivalNames.has(name);
    default: return false;
  }
}

/** Foreground arterial origin, not transparent context. Only include branches
 * needed to trace ECA → maxillary → MMA, not every external-carotid branch. */
export function isSkullBaseMeningealOrigin(node: SceneNode, path: readonly string[]): boolean {
  const name = skullBaseName(node.rawName);
  return vascularLeaf(path) === 'meningeal' && skullBaseVascularSource.has(name)
    && /^(?:external carotid artery|maxillary artery)$/.test(name);
}
