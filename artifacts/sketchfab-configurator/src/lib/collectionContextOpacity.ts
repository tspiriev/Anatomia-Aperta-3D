import type { SketchfabMaterial } from '../types/sketchfab';
import { BRAINSTEM_TRANSPARENCY, applyStructureColor, applyReferenceColor } from './materialTransparency';

type Geometry = { instanceID: number; materialID?: string };
export type CollectionNodeColor = { instanceID: number; color: readonly number[] };
type Dependencies = {
  api: () => SketchfabAPI | null;
  geometry: (id: number) => Geometry[];
  opaqueNodes?: () => readonly number[];
  alwaysOpaqueNodes?: () => readonly number[];
  automaticContextNodes?: () => readonly number[];
  coloredNodes?: () => readonly { instanceID: number; color: readonly number[] }[];
  matchedColorNodes?: () => readonly { instanceID: number; referenceID: number }[];
  material: (id: string) => SketchfabMaterial | undefined;
  contextOpacity?: (material: SketchfabMaterial, nodeId?: number) => SketchfabMaterial['channels']['Opacity'];
  register: (material: SketchfabMaterial) => void;
  onError: (message: string) => void;
};

// Per-geometry overrides: cortex and nuclei may share the same source material.
// Never change that shared material's opacity to implement collection context.
export function createCollectionContextOpacity(deps: Dependencies) {
  const originals = new Map<number, { geometry: Geometry; material: string }>();
  const clones = new Map<string, Promise<string>>();
  const alwaysOpaqueMaterials = new Map<number, string>();
  let desired = new Set<number>();
  let nodeIds = new Set<number>();
  let requestedNodeIds = new Set<number>();
  let requestedPriorityIds = new Set<number>();
  let requestedForegroundProtected = false;
  let version = 0;
  let foregroundProtected = false;
  let foregroundIds: readonly number[] = [];
  let transparentPriorityNodeIds = new Set<number>();
  let collectionColors: readonly CollectionNodeColor[] = [];
  function restore(id: number) {
    alwaysOpaqueMaterials.delete(id);
    const original = originals.get(id);
    if (!original) return;
    original.geometry.materialID = original.material;
    deps.api()?.assignMaterial(original.geometry, original.material, err => {
      if (err) deps.onError('Could not restore a brain context material.');
    });
    originals.delete(id);
  }
  function cloneMaterial(id: string, opaque: boolean, permanent = false, color?: readonly number[], referenceId?: string, preserveOpacity = false, nodeId?: number): Promise<string> {
    const api = deps.api(), material = deps.material(id);
    if (!api || !material) return Promise.reject(new Error('Brain context material unavailable.'));
    const opacity = opaque ? { enable: false, factor: 1 }
      : deps.contextOpacity?.(material, nodeId) ?? { ...BRAINSTEM_TRANSPARENCY };
    // One source material can serve Neck bones and non-bone context; never
    // reuse a clone with a different transparency preset when switching views.
    const key = `${id}:${preserveOpacity ? 'original-opacity' : permanent ? 'always-opaque' : opaque ? 'opaque' : JSON.stringify(opacity)}:${color?.join(',') ?? ''}:${referenceId ?? ''}`;
    const cached = clones.get(key);
    if (cached) return cached;
    const reference = referenceId ? deps.material(referenceId) : undefined;
    if (referenceId && !reference) return Promise.reject(new Error('Left ventricle color material unavailable.'));
    const clone: Partial<SketchfabMaterial> = JSON.parse(JSON.stringify(material));
    delete clone.id;
    clone.name = `__basal_forebrain_${permanent ? 'always_opaque' : opaque ? 'opaque' : 'context'}_${id}`;
    if (!preserveOpacity) clone.channels!.Opacity = { ...opacity };
    if (reference) applyReferenceColor(clone as SketchfabMaterial, reference);
    if (color) applyStructureColor(clone as SketchfabMaterial, color);
    const pending = new Promise<string>((resolve, reject) => {
      api.createMaterial(clone as Omit<SketchfabMaterial, 'id'>, (err, created) => {
        if (err || !created?.id) { clones.delete(key); reject(err ?? new Error('No context material was returned.')); return; }
        // Apply the same material update as the brainstem Fade control after
        // creation as well; use the SDK-returned material with its actual ID.
        const faded: SketchfabMaterial = JSON.parse(JSON.stringify(created));
        if (preserveOpacity) {
          if (material.channels.Opacity) faded.channels.Opacity = JSON.parse(JSON.stringify(material.channels.Opacity));
          else delete faded.channels.Opacity;
        } else faded.channels.Opacity = { ...opacity };
        if (reference) applyReferenceColor(faded, reference);
        if (color) applyStructureColor(faded, color);
        api.setMaterial(faded, (error?: unknown) => {
          if (error) { reject(error); return; }
          deps.register(faded);
          resolve(faded.id);
        });
      });
    });
    clones.set(key, pending);
    void pending.catch(() => { if (clones.get(key) === pending) clones.delete(key); });
    return pending;
  }
  async function setNodes(ids: readonly number[], merge = false, keepForegroundOpaque = false, opaqueContextIds?: readonly number[], transparentPriorityIds: readonly number[] = [], colorOverrides?: readonly CollectionNodeColor[]) {
    const request = ++version;
    requestedNodeIds = new Set(merge ? [...requestedNodeIds, ...ids] : ids);
    requestedPriorityIds = new Set(merge ? [...requestedPriorityIds, ...transparentPriorityIds] : transparentPriorityIds);
    requestedForegroundProtected = keepForegroundOpaque;
    const automatic = deps.automaticContextNodes?.() ?? [];
    nodeIds = new Set([...requestedNodeIds, ...automatic]);
    transparentPriorityNodeIds = new Set([...requestedPriorityIds, ...automatic]);
    foregroundProtected = nodeIds.size > 0 || keepForegroundOpaque;
    if (colorOverrides !== undefined) collectionColors = colorOverrides;
    else if (!foregroundProtected && !merge) collectionColors = [];
    if (opaqueContextIds) foregroundIds = merge ? [...new Set([...foregroundIds, ...opaqueContextIds])] : opaqueContextIds;
    else if (!foregroundProtected) foregroundIds = [];
    const geometries = new Map<number, Geometry>();
    const contextOwners = new Map<number, number>();
    for (const id of nodeIds) for (const geo of deps.geometry(id)) {
      geometries.set(geo.instanceID, geo);
      contextOwners.set(geo.instanceID, id);
    }
    const contextGeometryIds = new Set(geometries.keys());
    const transparentGeometryIds = new Set([...transparentPriorityNodeIds]
      .filter(id => nodeIds.has(id)).flatMap(id => deps.geometry(id).map(geo => geo.instanceID)));
    // Explicit nucleus overrides take precedence even when a lobe transform
    // contains their geometry, or their source material is already transparent.
    const opaqueGeometryIds = new Set<number>();
    const permanentGeometryIds = new Set<number>();
    const geometryColors = new Map<number, readonly number[]>();
    const colorReferences = new Map<number, string>();
    for (const match of deps.matchedColorNodes?.() ?? []) {
      const references = deps.geometry(match.referenceID);
      const targets = deps.geometry(match.instanceID);
      for (const [index, target] of targets.entries()) {
        const reference = references[index] ?? references[0];
        const materialId = reference && (originals.get(reference.instanceID)?.material ?? reference.materialID);
        if (!materialId) { deps.onError('Could not read the left lateral ventricle color settings.'); continue; }
        colorReferences.set(target.instanceID, materialId);
        geometries.set(target.instanceID, target);
      }
    }
    for (const node of deps.coloredNodes?.() ?? []) {
      for (const geo of deps.geometry(node.instanceID)) geometryColors.set(geo.instanceID, node.color);
    }
    for (const id of deps.alwaysOpaqueNodes?.() ?? []) {
      for (const geo of deps.geometry(id)) {
        if (transparentGeometryIds.has(geo.instanceID)) continue;
        permanentGeometryIds.add(geo.instanceID);
        opaqueGeometryIds.add(geo.instanceID);
        geometries.set(geo.instanceID, geo);
      }
    }
    if (foregroundProtected) for (const id of [...(deps.opaqueNodes?.() ?? []), ...foregroundIds]) {
      for (const geo of deps.geometry(id)) {
        if (transparentGeometryIds.has(geo.instanceID)) continue;
        opaqueGeometryIds.add(geo.instanceID);
        geometries.set(geo.instanceID, geo);
      }
    }
    // Category colors use private, opaque geometry materials. Even hidden
    // sibling trunks keep their category color when shown individually later.
    for (const node of collectionColors) for (const geo of deps.geometry(node.instanceID)) {
      geometryColors.set(geo.instanceID, node.color);
      opaqueGeometryIds.add(geo.instanceID);
      geometries.set(geo.instanceID, geo);
    }
    // Selection restoration must only use currently enforced opaque overrides.
    // A bone that changes from Off to On must not retain its old opaque clone.
    for (const id of alwaysOpaqueMaterials.keys()) {
      if (!permanentGeometryIds.has(id)) alwaysOpaqueMaterials.delete(id);
    }
    desired = new Set(geometries.keys());
    for (const id of [...originals.keys()]) if (!desired.has(id)) restore(id);
    await Promise.all([...geometries.values()].map(async geo => {
      const material = originals.get(geo.instanceID)?.material ?? geo.materialID;
      if (!material) { deps.onError('A brain context geometry has no material.'); return; }
      if (!originals.has(geo.instanceID)) originals.set(geo.instanceID, { geometry: geo, material });
      try {
        const cloned = await cloneMaterial(material, opaqueGeometryIds.has(geo.instanceID),
          permanentGeometryIds.has(geo.instanceID), geometryColors.get(geo.instanceID),
          colorReferences.get(geo.instanceID),
          colorReferences.has(geo.instanceID) && !opaqueGeometryIds.has(geo.instanceID)
             && !contextGeometryIds.has(geo.instanceID), contextOwners.get(geo.instanceID));
        if (request !== version || !desired.has(geo.instanceID)) return;
        if (permanentGeometryIds.has(geo.instanceID)) alwaysOpaqueMaterials.set(geo.instanceID, cloned);
        geo.materialID = cloned;
        deps.api()?.assignMaterial(geo, cloned, err => {
          if (err) deps.onError('Could not apply brain context transparency.');
          // A delayed SDK assignment must not re-fade a restored scene.
          if (!desired.has(geo.instanceID)) {
            geo.materialID = material;
            deps.api()?.assignMaterial(geo, material, () => {});
          }
        });
      } catch {
        if (request === version) deps.onError('Could not create semitransparent brain context.');
      }
    }));
  }
  return {
    setNodes,
    refresh: () => setNodes([...requestedNodeIds], false, requestedForegroundProtected,
      foregroundIds, [...requestedPriorityIds], collectionColors),
    alwaysOpaqueMaterial: (id: number) => alwaysOpaqueMaterials.get(id),
    get nodeIds() { return nodeIds; },
    get foregroundProtected() { return foregroundProtected; },
  };
}
