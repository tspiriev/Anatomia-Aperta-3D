import type { SketchfabMaterial } from '../types/sketchfab';
import { refractionContextOpacity } from './materialTransparency';

/** The creator's refraction settings for explicit gross context, on private clones only. */
export function thalamusContextOpacity(modelUid: string, material: SketchfabMaterial): SketchfabMaterial['channels']['Opacity'] {
  // This hook runs only on explicitly selected context geometry's private
  // clones. Basal nuclei can share arbitrary source materials with fibers;
  // a material-name filter would miss them or require changing shared sources.
  if (modelUid !== '8abdb885c8c146068ca1c801a16f2b9f') return undefined;
  return refractionContextOpacity(material);
}
