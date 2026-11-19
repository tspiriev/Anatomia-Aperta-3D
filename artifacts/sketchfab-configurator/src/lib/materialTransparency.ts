import type { SceneNode, SketchfabMaterial } from '../types/sketchfab';
import { normalizeAdvancedObjectName } from '../data/advancedCollection';
import { classifyDiencephalonObject } from '../data/diencephalonTaxonomy';
import { normalizeTractName } from '../data/advancedNeuroanatomy';

export function lateralVentricleColorMatches(nodes: readonly SceneNode[]) {
  const left = nodes.find(node => node.systemId === 'nervous' && normalizeTractName(node.rawName) === 'lateral ventricle.l');
  return left ? nodes.filter(node => node.systemId === 'nervous' && normalizeTractName(node.rawName) === 'lateral ventricle.r')
    .map(node => ({ instanceID: node.instanceID, referenceID: left.instanceID })) : [];
}

export function applyReferenceColor(material: Pick<SketchfabMaterial, 'channels'>, reference: SketchfabMaterial) {
  for (const key of ['AlbedoPBR', 'DiffuseColor', 'EmitColor']) {
    const channel = reference.channels[key];
    if (channel) material.channels[key] = JSON.parse(JSON.stringify(channel));
    else delete material.channels[key];
  }
}

// The existing brainstem Fade control is the reference for context opacity.
// Give each material its own channel object so SDK edits cannot change defaults.
export const BRAINSTEM_TRANSPARENCY = Object.freeze({ enable: true, factor: 0.18 });

/** Screenshot-matched refraction; return fresh channel/color objects for SDK edits. */
export function refractionContextOpacity(material: SketchfabMaterial): NonNullable<SketchfabMaterial['channels']['Opacity']> {
  return {
    ...material.channels.Opacity,
    enable: true, type: 'refraction', factor: 0.133, invert: false,
    refractionColor: [1, 1, 1], useAlbedoTint: false,
    useNormalOffset: false, ior: 1, roughnessFactor: 0, useMicrosurfaceTexture: true,
  };
}

/** Apply only in the dedicated Brain atlas, leaving other atlases' fades unchanged. */
export function brainMenuOpacity(modelUid: string, material: SketchfabMaterial): SketchfabMaterial['channels']['Opacity'] {
  return modelUid === 'fe9c919b91c04fd8b2147106b07e5566'
    ? refractionContextOpacity(material) : undefined;
}

/** Dedicated Brainstem and cerebellum: use the creator's screenshot preset. */
export function brainstemCerebellumOpacity(modelUid: string, material: SketchfabMaterial): SketchfabMaterial['channels']['Opacity'] {
  return modelUid === '7f0c31427e24481797eba7369bc4c505'
    ? refractionContextOpacity(material) : undefined;
}

/** Cranial nerves use the same refraction preset for all semitransparent context. */
export function cranialNerveOpacity(modelUid: string, material: SketchfabMaterial): SketchfabMaterial['channels']['Opacity'] {
  return modelUid === '320acf193b8f484c88f4bac7624fed37'
    ? refractionContextOpacity(material) : undefined;
}

/** Autonomic context, manual Fade and focus use the creator's refraction preset. */
export function autonomicNerveOpacity(modelUid: string, material: SketchfabMaterial): SketchfabMaterial['channels']['Opacity'] {
  return modelUid === '2b5e229dd6994f67869e73d6e2466f29'
    ? refractionContextOpacity(material) : undefined;
}

/** Long pathways and the spinal view that inherits their exact display settings. */
export function longTractOpacity(modelUid: string, material: SketchfabMaterial): SketchfabMaterial['channels']['Opacity'] {
  return modelUid === '5b43a33add0f417384c10677fe117fc6'
    ? refractionContextOpacity(material) : undefined;
}

/** Screenshot-matched context, Fade and focus for the lumbar/sacral atlas only. */
export function lumbosacralPlexusOpacity(modelUid: string, material: SketchfabMaterial): SketchfabMaterial['channels']['Opacity'] {
  return modelUid === '95150214a50c40d78a845399448b7ccb'
    ? refractionContextOpacity(material) : undefined;
}

/** All brachial categories, manual Fade and focus share the creator's preset. */
export function brachialPlexusOpacity(modelUid: string, material: SketchfabMaterial): SketchfabMaterial['channels']['Opacity'] {
  return modelUid === 'd327ffccd7464160badb73687e02eac6'
    ? refractionContextOpacity(material) : undefined;
}

/** One transparency preset across every category of the temporal/association atlas. */
export function temporalAssociationOpacity(modelUid: string, material: SketchfabMaterial): SketchfabMaterial['channels']['Opacity'] {
  return modelUid === '79c954faa6284383902122319ecc136a'
    ? refractionContextOpacity(material) : undefined;
}

/** Keep this atlas's screenshot-matched refraction independent of other models. */
export function skullBaseOpacity(modelUid: string, material: SketchfabMaterial): SketchfabMaterial['channels']['Opacity'] {
  return modelUid === 'ec502e9febdd4a4c91cb52a45ac2fa98'
    ? refractionContextOpacity(material) : undefined;
}

export function isAlwaysOpaqueStructure(node: SceneNode): boolean {
  if (node.systemId !== 'nervous') return false;
  if (['anterior commissure', 'nucleus accumbens'].includes(normalizeAdvancedObjectName(node.rawName))) return true;
  const path = classifyDiencephalonObject(node.rawName);
  // Protect every nuclear subdivision, including shared Limbic memberships.
  // The gross hypothalamus and diffuse hypothalamic areas are not nuclei.
  return path?.[2] === 'hypothalamus' && path.length > 3 && path[3] !== 'areas';
}

export const ACCUMBENS_LIGHT_BLUE = Object.freeze([135 / 255, 206 / 255, 250 / 255]);
export const structureColorOverride = (node: SceneNode): readonly number[] | null =>
  node.systemId === 'nervous' && normalizeAdvancedObjectName(node.rawName) === 'nucleus accumbens'
    ? ACCUMBENS_LIGHT_BLUE : null;

export function applyStructureColor(material: Pick<SketchfabMaterial, 'channels'>, color: readonly number[]) {
  // Replace texture-driven base color on this private material only. Support
  // both the PBR and legacy diffuse workflows used by Sketchfab models.
  material.channels.AlbedoPBR = { enable: true, color: [...color], factor: 1 };
  material.channels.DiffuseColor = { enable: true, color: [...color], factor: 1 };
  material.channels.EmitColor = { enable: false, color: [0, 0, 0], factor: 0 };
}
