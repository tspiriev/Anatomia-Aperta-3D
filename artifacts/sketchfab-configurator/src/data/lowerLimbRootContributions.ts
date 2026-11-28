import { lumbosacralRootContributionForName } from './lumbosacralPlexusTaxonomy';
import { lowerLimbName } from './lowerLimbNames';
import type { SceneNode } from '../types/sketchfab';

const branchParents: readonly (readonly [RegExp, string])[] = [
  [/genitofemoral/, 'Genitofemoral nerve'],
  [/saphenous/, 'Saphenous nerve'],
  [/lateral plantar/, 'Lateral plantar nerve'],
  [/medial plantar/, 'Medial plantar nerve'],
  [/sural/, 'Sural nerve'],
  [/deep fibular/, 'Deep fibular nerve'],
  [/superficial fibular|(?:intermediate|medial) dorsal cutaneous nerve of foot/, 'Superficial fibular nerve'],
  [/common fibular/, 'Common fibular nerve'],
  [/posterior femoral cutaneous/, 'Posterior femoral cutaneous nerve'],
  [/\bfemoral nerve/, 'Femoral nerve'],
  [/obturator nerve/, 'Obturator nerve'],
];

export function lowerLimbNerveRoots(rawName: string): string | undefined {
  const name = lowerLimbName(rawName);
  if (/^superior cluneal nerves?$/.test(name)) return 'L1–L3';
  if (/^(?:medial|middle) cl+l?uneal nerves?$/.test(name)) return 'S1–S3';
  if (/^inferior cluneal nerves?$/.test(name)) return 'S1–S3';
  const exact = lumbosacralRootContributionForName(name);
  if (exact) return exact;
  // Keep the existing atlas's reviewed parent contributions on exported
  // downstream branches; do not manufacture individually separable root meshes.
  const parent = branchParents.find(([pattern]) => pattern.test(name))?.[1];
  return parent ? lumbosacralRootContributionForName(parent) : undefined;
}

/** Display annotations only: retain raw names, IDs, laterality and geometry. */
export function withLowerLimbRootContributions(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.map(node => {
    if (node.systemId !== 'nervous') return node;
    const roots = lowerLimbNerveRoots(node.rawName);
    return roots && !node.name.includes(`(${roots})`)
      ? { ...node, name: `${node.name} (${roots})` } : node;
  });
}
