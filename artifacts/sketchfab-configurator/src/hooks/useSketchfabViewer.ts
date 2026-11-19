import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { SceneNode, Annotation, SketchfabMaterial } from '../types/sketchfab';
import { systemForMeshName, type SystemGroupId } from '../data/anatomicalSystems';
import { captureViewerCamera, superiorViewerCamera, profileViewerCamera, waitForViewerVisibility, type ViewerCamera } from '../lib/viewerCamera';
import { createCollectionContextOpacity, type CollectionNodeColor } from '../lib/collectionContextOpacity';
import { lowerLimbLegColorMatches } from '../data/lowerLimbLeg';
import { thalamusContextOpacity } from '../lib/thalamusCortexMaterial';
import { collectionVisibilityCommands } from '../lib/collectionVisibility';
import { BRAINSTEM_TRANSPARENCY, refractionContextOpacity, brainMenuOpacity, brainstemCerebellumOpacity, cranialNerveOpacity, autonomicNerveOpacity, brachialPlexusOpacity, lumbosacralPlexusOpacity, longTractOpacity, temporalAssociationOpacity, skullBaseOpacity, isAlwaysOpaqueStructure, structureColorOverride, applyStructureColor, lateralVentricleColorMatches } from '../lib/materialTransparency';
import { focusVisibleSubset } from '../lib/focusVisibleSubset';
import { isBrainContextForeground as isBasalForebrainOpaqueStructure } from '../data/ventricularTaxonomy';
import { WHOLE_BRAIN_CONTEXT_NAME } from '../data/basalForebrainTaxonomy';
import { createGentlePickFocus } from '../lib/gentlePickFocus';
import { formatAnatomicalName } from '../lib/anatomicalDisplayName';
import { headNeckBoneContextIds } from '../lib/headNeckBoneContext';
import { upperLimbBoneContextPlan } from '../lib/upperLimbBoneContext';
import { UPPER_LIMB_TOPOGRAPHY_MODEL_UID } from '../data/upperLimbRegionalAtlas';
import { SKULL_BASE_MODEL_UID, skullBaseBoneTransparencyPlan } from '../data/skullBaseTaxonomy';

const EMBED_URL = (uid: string, staticStartup = false, preserveAnnotations = false) =>
  `https://sketchfab.com/models/${uid}/embed?autostart=1&ui_infos=0&annotations_visible=${preserveAnnotations ? 1 : 0}&ui_annotations=${preserveAnnotations ? 1 : 0}&ui_fullscreen=0${staticStartup ? '&camera=0&autospin=0' : ''}`;

const HIGHLIGHT_COLOR = [0.05, 0.55, 1.0];
const HIGHLIGHT_FACTOR = 0.65;

// ── Types ─────────────────────────────────────────────────────────────────────

interface SelectedNodeState {
  instanceID: number;
  name: string;
  /** geoInstanceID → original materialId (Strategy A) */
  originalMaterialAssignments: Map<string, string>;
  /** Strategy B fallback: matId → original EmitColor */
  originalEmitColors: Map<string, any>;
}

interface IsolationState {
  instanceID: number;
  visibility: Map<number, boolean>;
  originalMaterials: Map<number, string>;
  camera: { position: number[]; target: number[] } | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSketchfabViewer(modelUid: string, staticStartup = false, preserveSourceMaterials = false, preserveAnnotations = false, gentleClickFocus = false, allowSourceFade = false) {
  const boneTransparencyEnabledRef = useRef(true);
  // Skull base retains source colors but still supports the shared Fade controls.
  const keepSourceAppearance = preserveSourceMaterials || modelUid === 'ec502e9febdd4a4c91cb52a45ac2fa98';
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const apiRef = useRef<SketchfabAPI | null>(null);

  // Raw node map from Sketchfab
  const nodeMapRawRef = useRef<Record<string, any>>({});
  // Precomputed: nodeInstanceID → nearest selectable ancestor instanceID (O(1) click resolve)
  const selectableAncestorRef = useRef<Map<number, number>>(new Map());
  // Fallback for HMR / race: child → parent and set of panel IDs
  const parentMapRef = useRef<Map<number, number>>(new Map());
  const panelIdsRef = useRef<Set<number>>(new Set());
  // All materials fetched from viewer
  const materialsRef = useRef<SketchfabMaterial[]>([]);
  // Mirror of nodes state for callbacks
  const nodesRef = useRef<SceneNode[]>([]);
  const refractionContextNodesRef = useRef(new Set<number>());
  // Queue viewer visibility updates so hiding a large system does not freeze the UI.
  const pendingVisibilityRef = useRef<Map<number, boolean>>(new Map());
  const visibilityFrameRef = useRef<number | null>(null);
  // One entry per hide action; a system toggle is restored as one action.
  const hiddenHistoryRef = useRef<number[][]>([]);
  const isolationRef = useRef<IsolationState | null>(null);
  const focusRequestRef = useRef(0);
  const subsetFocusQueueRef = useRef<Promise<void>>(Promise.resolve());
  // Currently active selection state (null = nothing selected)
  const selectionRef = useRef<SelectedNodeState | null>(null);

  const initAttempted = useRef(false);

  // Fade state: tracks which panel-node instanceIDs are currently faded
  const fadedNodeIdsRef = useRef<Set<number>>(new Set());
  // Per-material original Opacity channel, stored when fading (materialId → original Opacity)
  const fadedRestoreRef = useRef<Map<string, any>>(new Map());
  const collectionContextRef = useRef<ReturnType<typeof createCollectionContextOpacity> | null>(null);
  const [contextFadedNodeIds, setContextFadedNodeIds] = useState<Set<number>>(new Set());
  const selectionGroupRef = useRef<readonly number[]>([]);
  const selectionGroupNameRef = useRef(WHOLE_BRAIN_CONTEXT_NAME);
  const selectionGroupsRef = useRef<readonly { name: string; memberIds: readonly number[] }[]>([]);
  const setSelectionGroup = useCallback((ids: readonly number[], name = WHOLE_BRAIN_CONTEXT_NAME,
    groups: readonly { name: string; memberIds: readonly number[] }[] = []) => {
    selectionGroupRef.current = ids;
    selectionGroupNameRef.current = name;
    selectionGroupsRef.current = groups;
  }, []);
  function selectionGroupForId(id: number) {
    return selectionGroupsRef.current.find(group => group.memberIds.includes(id))
      ?? (selectionGroupRef.current.includes(id)
        ? { name: selectionGroupNameRef.current, memberIds: selectionGroupRef.current } : null);
  }

  const [isViewerReady, setIsViewerReady] = useState(false);
  const [materialsReady, setMaterialsReady] = useState(false);
  const [nodes, setNodes] = useState<SceneNode[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiMode, setApiMode] = useState<'loading' | 'api' | 'embed'>('loading');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [fadedNodeIds, setFadedNodeIds] = useState<Set<number>>(new Set());
  const [isolatedNodeId, setIsolatedNodeId] = useState<number | null>(null);
  const [isolatedWithContext, setIsolatedWithContext] = useState(false);
  const [isFocusing, setIsFocusing] = useState(false);
  const [focusError, setFocusError] = useState<string | null>(null);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getRawNode = useCallback(
    (id: number): any | null =>
      (Object.values(nodeMapRawRef.current) as any[]).find((n: any) => n.instanceID === id) ??
      null,
    [],
  );

  /** Normalize a Sketchfab children entry to a numeric instanceID (or null). */
  const childToId = useCallback((c: any): number | null => {
    if (typeof c === 'number') return c;
    if (typeof c === 'string') { const n = Number(c); return Number.isNaN(n) ? null : n; }
    if (typeof c === 'object' && c !== null && c.instanceID != null) return Number(c.instanceID);
    return null;
  }, []);

  /** DFS: find all Geometry nodes (have materialID) beneath a given instanceID. */
  const getGeometryDescendants = useCallback(
    (instanceID: number): any[] => {
      const result: any[] = [];
      const visited = new Set<number>();
      const dfs = (id: number) => {
        if (visited.has(id)) return;
        visited.add(id);
        const n = getRawNode(id);
        if (!n) return;
        if (n.type === 'Geometry' && n.materialID) result.push(n);
        if (Array.isArray(n.children)) {
          n.children.forEach((c: any) => {
            const cid = childToId(c);
            if (cid !== null) dfs(cid);
          });
        }
      };
      dfs(instanceID);
      return result;
    },
    [getRawNode, childToId],
  );

  // ── Clear selection ────────────────────────────────────────────────────────

  const clearSelection = useCallback(() => {
    const api = apiRef.current;
    const sel = selectionRef.current;
    if (!api || !sel) return;

    if (sel.originalMaterialAssignments.size > 0) {
      // Strategy A: reassign original materials per-node
      sel.originalMaterialAssignments.forEach((origMatId, geoIdStr) => {
        const rawNode = getRawNode(Number(geoIdStr));
        if (rawNode) api.assignMaterial(rawNode,
          collectionContextRef.current?.alwaysOpaqueMaterial(Number(geoIdStr)) ?? origMatId, () => {});
      });
    }

    if (sel.originalEmitColors.size > 0) {
      // Strategy B: restore shared-material EmitColor
      sel.originalEmitColors.forEach((origEmit, matId) => {
        const idx = materialsRef.current.findIndex((m) => m.id === matId);
        if (idx < 0) return;
        const restored: SketchfabMaterial = JSON.parse(
          JSON.stringify(materialsRef.current[idx]),
        );
        restored.channels.EmitColor = origEmit;
        api.setMaterial(restored, () => {});
        materialsRef.current[idx] = restored;
      });
    }

    selectionRef.current = null;
    setSelectedNodeId(null);
  }, [getRawNode]);

  // ── Select node (single central function) ─────────────────────────────────

  const selectNode = useCallback(
    (instanceID: number) => {
      const api = apiRef.current;
      if (!api) return;
      const selectedGroup = selectionGroupForId(instanceID);
      const group = selectedGroup?.memberIds ?? null;
      if (group) instanceID = group[0];

      // Toggle off if same node clicked again
      if (selectionRef.current?.instanceID === instanceID) {
        clearSelection();
        return;
      }

      // Clear previous selection
      if (selectionRef.current) clearSelection();

      // Find the node in our list for its name
      const panelNode = nodesRef.current.find((n) => n.instanceID === instanceID);
      if (!panelNode) return;

      console.log('Selected exact node:', { instanceID: panelNode.instanceID, name: panelNode.name });

      const sel: SelectedNodeState = {
        instanceID,
        name: selectedGroup?.name ?? panelNode.name,
        originalMaterialAssignments: new Map(),
        originalEmitColors: new Map(),
      };
      selectionRef.current = sel;
      setSelectedNodeId(instanceID);

      // Preserving source materials still permits a temporary per-geometry
      // highlight clone. clearSelection restores its original assignment.
      // Check which per-node material methods are actually available.
      // The runtime log shows: createMaterial + assignMaterial (NOT addMaterial).
      const hasCreateMaterial = typeof (api as any).createMaterial === 'function';
      const hasAssignMaterial = typeof (api as any).assignMaterial === 'function';

      let geoNodes = [...new Map((group ?? [instanceID]).flatMap(getGeometryDescendants)
        .map(geo => [geo.instanceID, geo])).values()];
      const alwaysOpaqueIds = new Set(nodesRef.current.filter(isAlwaysOpaqueStructure)
        .flatMap(node => getGeometryDescendants(node.instanceID).map(geo => geo.instanceID)));
      const colors = new Map(nodesRef.current.flatMap(node => {
        const color = structureColorOverride(node);
        return color ? getGeometryDescendants(node.instanceID).map(geo => [geo.instanceID, color] as const) : [];
      }));
      if (group) {
        const protectedIds = new Set(nodesRef.current.filter(isBasalForebrainOpaqueStructure)
          .flatMap(node => getGeometryDescendants(node.instanceID).map(geo => geo.instanceID)));
        geoNodes = geoNodes.filter(geo => !protectedIds.has(geo.instanceID));
      }

      if (hasCreateMaterial && hasAssignMaterial) {
        // ── Strategy A: true per-node highlight ──────────────────────────
        // Clone each geometry's material → createMaterial → assignMaterial
        // only to that node. Siblings sharing the original material untouched.
        geoNodes.forEach((geoNode) => {
          const origMatId: string = geoNode.materialID;
          const origMat = materialsRef.current.find((m) => m.id === origMatId);
          if (!origMat) return;

          sel.originalMaterialAssignments.set(String(geoNode.instanceID), origMatId);

          const cloned: any = JSON.parse(JSON.stringify(origMat));
          delete cloned.id; // let Sketchfab assign a fresh id
          cloned.name = `__hl_${instanceID}_${geoNode.instanceID}`;
          const color = keepSourceAppearance ? undefined : colors.get(geoNode.instanceID);
          if (color) applyStructureColor(cloned, color);
          cloned.channels = {
            ...cloned.channels,
            EmitColor: { enable: true, color: HIGHLIGHT_COLOR, factor: HIGHLIGHT_FACTOR },
          };
          if (!keepSourceAppearance && alwaysOpaqueIds.has(geoNode.instanceID)) cloned.channels.Opacity = { enable: false, factor: 1 };

          (api as any).createMaterial(cloned, (err: any, newMat: SketchfabMaterial) => {
            if (err || !newMat?.id) return;
            if (selectionRef.current !== sel) return;
            const rawNode = getRawNode(geoNode.instanceID);
            if (rawNode) api.assignMaterial(rawNode, newMat.id, () => {});
          });
        });
      } else {
        // Never recolor a shared source material in a preservation-only atlas.
        if (preserveSourceMaterials) {
          setFocusError('Per-mesh visual highlighting is unavailable in this viewer.');
          return;
        }
        // ── Strategy B: shared-material EmitColor (best-effort fallback) ─
        // Explicitly warns when a material is shared so we don't claim success.
        const affectedMatIds = new Set<string>(
          geoNodes.map((n) => n.materialID).filter(Boolean),
        );

        affectedMatIds.forEach((matId) => {
          // Check whether multiple selectable nodes share this material
          const sharingNodes = nodesRef.current.filter((panelN) => {
            const geos = getGeometryDescendants(panelN.instanceID);
            return geos.some((g) => g.materialID === matId);
          });
          if (sharingNodes.length > 1) {
            console.warn(
              'Exact node selected, but per-node visual highlighting is unavailable because ' +
                'the Sketchfab material is shared and this Viewer API version cannot reassign ' +
                'materials per node.',
              { selectedNode: panelNode.name, sharingNodes: sharingNodes.map((n) => n.name) },
            );
          }

          const idx = materialsRef.current.findIndex((m) => m.id === matId);
          if (idx < 0) return;
          const mat = materialsRef.current[idx];

          sel.originalEmitColors.set(
            matId,
            mat.channels.EmitColor
              ? JSON.parse(JSON.stringify(mat.channels.EmitColor))
              : { enable: false, color: [0, 0, 0], factor: 0 },
          );

          const highlighted: SketchfabMaterial = JSON.parse(JSON.stringify(mat));
          highlighted.channels.EmitColor = {
            enable: true,
            color: HIGHLIGHT_COLOR,
            factor: HIGHLIGHT_FACTOR,
          };
          api.setMaterial(highlighted, () => {});
          materialsRef.current[idx] = highlighted;
        });
      }
    },
    [clearSelection, getGeometryDescendants, getRawNode, preserveSourceMaterials, keepSourceAppearance],
  );

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!iframeRef.current || initAttempted.current) return;
    initAttempted.current = true;
    const iframe = iframeRef.current;
    let clickFocusActive = true;

    const fallbackToEmbed = () => {
      iframe.src = EMBED_URL(modelUid, staticStartup, preserveAnnotations);
      setApiMode('embed');
      setIsViewerReady(true);
    };

    const tryInit = (retries = 0) => {
      if (!window.Sketchfab) {
        if (retries < 60) setTimeout(() => tryInit(retries + 1), 100);
        else fallbackToEmbed();
        return;
      }

      const client = new window.Sketchfab(iframe);
      client.init(modelUid, {
        autostart: 1,
        ...(staticStartup ? { camera: 0, autospin: 0 } : {}),
        annotations_visible: preserveAnnotations ? 1 : 0,
        ui_annotations: preserveAnnotations ? 1 : 0,
        ui_controls: preserveAnnotations ? 1 : 0,
        ui_infos: 0,
        ui_inspector: 0,
        ui_fullscreen: 0,
        success: (api) => {
          apiRef.current = api;
          const focusPickedPoint = createGentlePickFocus(api,
            () => gentleClickFocus && clickFocusActive && apiRef.current === api);
          api.start();

          api.addEventListener('viewerready', () => {
            setApiMode('api');
            setIsViewerReady(true);

            // Log which material/highlight methods are actually available at runtime
            console.log(
              '[Sketchfab] Material-related API methods:',
              Object.keys(api).filter((k) => /material|assign|highlight/i.test(k)),
            );

            // ── Build node map + lookup tables ─────────────────────────────
            api.getNodeMap((err, rawMap) => {
              if (err) return;
              nodeMapRawRef.current = rawMap;

              const allNodes = Object.values(rawMap) as any[];

              // 1. Parent map: child instanceID → parent instanceID.
              //    Children may arrive as numbers, numeric strings, or node objects —
              //    normalize to number in all cases.
              const parentMap = new Map<number, number>();
              allNodes.forEach((n) => {
                if (Array.isArray(n.children)) {
                  n.children.forEach((c: any) => {
                    const childId =
                      typeof c === 'number'
                        ? c
                        : typeof c === 'string'
                        ? Number(c)
                        : typeof c === 'object' && c !== null && c.instanceID != null
                        ? Number(c.instanceID)
                        : null;
                    if (childId !== null && !Number.isNaN(childId)) {
                      parentMap.set(childId, n.instanceID);
                    }
                  });
                }
              });

              // 2. Selectable nodes: prefer MatrixTransform; include named
              //    Geometry only when it has no MatrixTransform ancestor that
              //    is also named (avoids parent+child duplicates in the list).
              const namedMTIds = new Set<number>(
                allNodes
                  .filter(
                    (n) =>
                      n.type === 'MatrixTransform' &&
                      n.name?.trim() &&
                      n.name !== 'RootNode' &&
                      n.name !== 'GLTF_SceneRootNode' &&
                      !n.name.toLowerCase().includes('sketchfab'),
                  )
                  .map((n) => n.instanceID),
              );

              const selectableIds = new Set<number>();
              const unique: SceneNode[] = [];
              const seenIds = new Set<number>();

              allNodes.forEach((n) => {
                if (
                  !n.name?.trim() ||
                  n.name === 'RootNode' ||
                  n.name === 'GLTF_SceneRootNode' ||
                  n.name.toLowerCase().includes('sketchfab')
                )
                  return;

                if (n.type === 'MatrixTransform') {
                  if (!seenIds.has(n.instanceID)) {
                    seenIds.add(n.instanceID);
                    selectableIds.add(n.instanceID);
                    unique.push({
                      instanceID: n.instanceID,
                      name: formatAnatomicalName(n.name, modelUid),
                      rawName: n.name,
                      systemId: systemForMeshName(n.name),
                      type: n.type,
                      visible: true,
                      materialID: n.materialID,
                      children: n.children,
                    });
                  }
                } else if (n.type === 'Geometry') {
                  // Include orphan Geometry nodes — those with no named MT ancestor
                  let cur: number | null = parentMap.get(n.instanceID) ?? null;
                  let hasMTAncestor = false;
                  while (cur !== null) {
                    if (namedMTIds.has(cur)) { hasMTAncestor = true; break; }
                    cur = parentMap.get(cur) ?? null;
                  }
                  if (!hasMTAncestor && !seenIds.has(n.instanceID)) {
                    seenIds.add(n.instanceID);
                    selectableIds.add(n.instanceID);
                    unique.push({
                      instanceID: n.instanceID,
                      name: formatAnatomicalName(n.name, modelUid),
                      rawName: n.name,
                      systemId: systemForMeshName(n.name),
                      type: n.type,
                      visible: true,
                      materialID: n.materialID,
                      children: n.children,
                    });
                  }
                }
              });

              unique.sort((a, b) => a.name.localeCompare(b.name));

              // 3. Persist parentMap and panelIds for the fallback click walk-up.
              parentMapRef.current = parentMap;
              panelIdsRef.current = selectableIds;

              // 4. Precompute selectableAncestorByInstanceId for O(1) click resolve.
              //    Uses path-compression so every traversal is amortised O(1).
              const ancestorMap = new Map<number, number>();

              // Selectable nodes resolve to themselves
              selectableIds.forEach((id) => ancestorMap.set(id, id));

              // Helper: walk up from a start id with cycle-protection
              const resolveAncestor = (startId: number): number | null => {
                if (ancestorMap.has(startId)) return ancestorMap.get(startId)!;
                const path: number[] = [startId];
                const visited = new Set<number>([startId]);
                let cur: number | null = parentMap.get(startId) ?? null;
                while (cur !== null && !ancestorMap.has(cur) && !visited.has(cur)) {
                  visited.add(cur);
                  path.push(cur);
                  cur = parentMap.get(cur) ?? null;
                }
                const resolved = cur !== null ? (ancestorMap.get(cur) ?? null) : null;
                if (resolved !== null) {
                  path.forEach((id) => ancestorMap.set(id, resolved));
                }
                return resolved;
              };

              // First pass: nodes in rawMap
              allNodes.forEach((n) => resolveAncestor(n.instanceID));

              // Second pass: nodes referenced in children arrays but absent from rawMap
              // (these are geometry leaves that show up in click events but not in getNodeMap)
              parentMap.forEach((_parentId, childId) => {
                if (!ancestorMap.has(childId)) resolveAncestor(childId);
              });

              selectableAncestorRef.current = ancestorMap;
              hiddenHistoryRef.current = [];
              setNodes(unique);
            });

            // Fetch all materials
            api.getMaterialList((err, mats) => {
              if (!err) {
                materialsRef.current = mats;
                setMaterialsReady(true);
              }
            });

            api.getAnnotationList((err, list) => {
              if (!err) setAnnotations(list || []);
            });

            // ── Viewer click → selection ────────────────────────────────
            api.addEventListener('click', (info: any) => {
              // Background clicks also focus the remote iframe. Reclaim the
              // keyboard before checking whether an anatomy mesh was picked.
              iframe.parentElement?.focus({ preventScroll: true });
              // Ignore background clicks
              if (!info || info.instanceID == null) return;

              const clickedId = info.instanceID as number;
              console.log('[click] raw instanceID:', clickedId);

              // Primary: O(1) precomputed ancestor map (populated by getNodeMap callback)
              let panelId = selectableAncestorRef.current.get(clickedId) ?? null;

              // Fallback: runtime walk-up using persistent refs.
              // Handles the case where selectableAncestorRef is empty (HMR race or timing).
              if (panelId == null && parentMapRef.current.size > 0) {
                let cur: number | null = clickedId;
                const visited = new Set<number>();
                while (cur !== null && !visited.has(cur)) {
                  visited.add(cur);
                  if (panelIdsRef.current.has(cur)) { panelId = cur; break; }
                  cur = parentMapRef.current.get(cur) ?? null;
                }
                // Cache result so subsequent clicks are O(1)
                if (panelId !== null) selectableAncestorRef.current.set(clickedId, panelId);
              }

              if (panelId == null) {
                // Still return keyboard focus to the parent so hotkeys keep working
                iframe.parentElement?.focus({ preventScroll: true });
                return;
              }

              if (selectionRef.current?.instanceID === panelId) {
                clearSelection();
              } else {
                selectNode(panelId);
              }
              focusPickedPoint(info.position3D);

              // Return keyboard focus to the parent window so hotkeys fire immediately
              // after clicking in the Sketchfab iframe.
              iframe.parentElement?.focus({ preventScroll: true });
            });
          });
        },
        error: () => fallbackToEmbed(),
      });
    };

    tryInit();
    return () => { clickFocusActive = false; };
  }, [modelUid, staticStartup, preserveAnnotations, clearSelection, selectNode, gentleClickFocus]);

  // ── Visibility ────────────────────────────────────────────────────────────

  const flushVisibility = useCallback(function flushVisibility() {
    const api = apiRef.current;
    if (!api) {
      pendingVisibilityRef.current.clear();
      visibilityFrameRef.current = null;
      return;
    }

    let processed = 0;
    for (const [instanceID, visible] of pendingVisibilityRef.current) {
      pendingVisibilityRef.current.delete(instanceID);
      visible ? api.show(instanceID) : api.hide(instanceID);
      if (++processed >= 100) break;
    }

    visibilityFrameRef.current = pendingVisibilityRef.current.size > 0
      ? requestAnimationFrame(flushVisibility)
      : null;
  }, []);

  useEffect(() => () => {
    void collectionContextRef.current?.setNodes([]);
    if (visibilityFrameRef.current !== null) cancelAnimationFrame(visibilityFrameRef.current);
    pendingVisibilityRef.current.clear();
  }, []);

  const setNodesVisibility = useCallback(
    (instanceIDs: number[], isVisible: boolean, recordHistory = true, synchronizeRenderer = false) => {
      if (!apiRef.current || instanceIDs.length === 0) return;
      const ids = new Set(instanceIDs);
      const affected = nodesRef.current.filter(
        (n) => ids.has(n.instanceID) && n.visible !== isVisible,
      );
      if (affected.length === 0 && !synchronizeRenderer) return;

      if (!isVisible && recordHistory && affected.length > 0) {
        hiddenHistoryRef.current.push(affected.map((node) => node.instanceID));
        if (hiddenHistoryRef.current.length > 50) hiddenHistoryRef.current.shift();
      }

      // Keep the focus target selected even when hidden, so its Show/Restore
      // controls remain available and selection effects do not unwind isolation.
      if (!isVisible && !isolationRef.current && selectionRef.current && ids.has(selectionRef.current.instanceID)) {
        clearSelection();
      }

      const next = nodesRef.current.map((n) =>
        ids.has(n.instanceID) ? { ...n, visible: isVisible } : n,
      );
      nodesRef.current = next;
      setNodes(next);

      const commandIds = synchronizeRenderer && isVisible
        ? collectionVisibilityCommands(instanceIDs, nodeMapRawRef.current, parentMapRef.current, panelIdsRef.current)
        : synchronizeRenderer ? instanceIDs : affected.map(n => n.instanceID);
      commandIds.forEach(id => pendingVisibilityRef.current.set(id, isVisible));
      if (visibilityFrameRef.current === null) {
        visibilityFrameRef.current = requestAnimationFrame(flushVisibility);
      }
    },
    [clearSelection, flushVisibility],
  );

  const toggleNodeVisibility = useCallback(
    (instanceID: number, isVisible: boolean) => setNodesVisibility([instanceID], isVisible),
    [setNodesVisibility],
  );

  const showAllNodes = useCallback(
    () => {
      hiddenHistoryRef.current = [];
      setNodesVisibility(nodesRef.current.map((n) => n.instanceID), true);
    },
    [setNodesVisibility],
  );

  const undoLastHide = useCallback((systemId?: SystemGroupId) => {
    const hiddenIds = new Set(
      nodesRef.current
        .filter((node) => !node.visible && (!systemId || (node.systemId ?? 'nervous') === systemId))
        .map((node) => node.instanceID),
    );
    const history = hiddenHistoryRef.current;
    for (let index = history.length - 1; index >= 0; index--) {
      const previous = history[index];
      const toRestore = previous.filter((id) => hiddenIds.has(id));
      if (toRestore.length === 0) continue;

      // Preserve hides in other systems if one action affected multiple systems.
      const remaining = previous.filter((id) => !hiddenIds.has(id));
      history.splice(index, 1, ...(remaining.length ? [remaining] : []));
      setNodesVisibility(toRestore, true);
      return true;
    }
    return false;
  }, [setNodesVisibility]);

  const hideAllNodes = useCallback(
    () => setNodesVisibility(nodesRef.current.map((n) => n.instanceID), false),
    [setNodesVisibility],
  );

  const goToAnnotation = useCallback((index: number) => {
    const api = apiRef.current;
    if (!api) return;
    api.gotoAnnotation(index, { preventCameraAnimation: false }, (err) => {
      if (err) console.error('gotoAnnotation error', err);
    });
  }, []);

  const getCollectionContext = useCallback(() => {
    if (!collectionContextRef.current) {
      collectionContextRef.current = createCollectionContextOpacity({
        api: () => apiRef.current,
        geometry: getGeometryDescendants,
        opaqueNodes: () => keepSourceAppearance ? [] : nodesRef.current.filter(isBasalForebrainOpaqueStructure).map(node => node.instanceID),
        automaticContextNodes: () => upperLimbBoneContextPlan(modelUid, nodesRef.current).transparentBoneIds,
        alwaysOpaqueNodes: () => [...upperLimbBoneContextPlan(modelUid, nodesRef.current).opaqueBoneIds,
          ...(modelUid === SKULL_BASE_MODEL_UID && !boneTransparencyEnabledRef.current
          ? skullBaseBoneTransparencyPlan(nodesRef.current, [], false).opaqueBoneIds
          : keepSourceAppearance ? [] : nodesRef.current.filter(isAlwaysOpaqueStructure).map(node => node.instanceID))],
        coloredNodes: () => keepSourceAppearance ? [] : nodesRef.current.flatMap(node => {
          const color = structureColorOverride(node);
          return color ? [{ instanceID: node.instanceID, color }] : [];
        }),
        matchedColorNodes: () => keepSourceAppearance ? [] : [
          ...lateralVentricleColorMatches(nodesRef.current),
          ...lowerLimbLegColorMatches(modelUid, nodesRef.current),
        ],
        material: id => materialsRef.current.find(material => material.id === id),
        contextOpacity: (material, nodeId) => (nodeId !== undefined && (refractionContextNodesRef.current.has(nodeId)
          || upperLimbBoneContextPlan(modelUid, nodesRef.current).transparentBoneIds.includes(nodeId))
          ? refractionContextOpacity(material) : undefined) ?? cranialNerveOpacity(modelUid, material)
          ?? autonomicNerveOpacity(modelUid, material)
          ?? brachialPlexusOpacity(modelUid, material)
          ?? lumbosacralPlexusOpacity(modelUid, material)
          ?? longTractOpacity(modelUid, material)
          ?? brainstemCerebellumOpacity(modelUid, material)
          ?? brainMenuOpacity(modelUid, material) ?? temporalAssociationOpacity(modelUid, material) ?? skullBaseOpacity(modelUid, material)
          ?? thalamusContextOpacity(modelUid, material),
        register: material => { materialsRef.current.push(material); },
        onError: setFocusError,
      });
    }
    return collectionContextRef.current;
  }, [getGeometryDescendants, keepSourceAppearance, modelUid]);

  useEffect(() => {
    if (keepSourceAppearance || !isViewerReady || !materialsReady || !nodes.length) return;
    const context = getCollectionContext();
    void context.setNodes([...context.nodeIds], false, context.foregroundProtected);
  }, [keepSourceAppearance, isViewerReady, materialsReady, nodes.length, getCollectionContext]);

  // ── Fade ──────────────────────────────────────────────────────────────────

  /**
   * Toggle semi-transparency on a panel node.
   * Uses setMaterial with the atlas-specific opacity settings on every shared material that
   * belongs to the node's geometry descendants.  Restores original opacity on
   * the second call.  Composes correctly with selection highlight because
   * highlight uses createMaterial/assignMaterial (a separate per-node override)
   * while fade modifies the underlying shared material in-place.
   */
  const toggleNodeFade = useCallback(
    (instanceID: number) => {
      if (preserveSourceMaterials && !allowSourceFade) return;
      const api = apiRef.current;
      if (!api) return;
      const node = nodesRef.current.find(node => node.instanceID === instanceID);
      if (!keepSourceAppearance && node && isAlwaysOpaqueStructure(node)) return;
      const group = selectionGroupRef.current;
      if (modelUid === 'ec502e9febdd4a4c91cb52a45ac2fa98'
        || group.includes(instanceID) || refractionContextNodesRef.current.has(instanceID)) {
        const context = getCollectionContext();
        const members = group.includes(instanceID) ? group : [instanceID];
        const memberSet = new Set(members);
        const faded = members.some(id => context.nodeIds.has(id));
        const ids = faded ? [...context.nodeIds].filter(id => !memberSet.has(id))
          : [...new Set([...context.nodeIds, ...members])];
        const selected = selectionRef.current?.instanceID;
        if (selected !== undefined && group.includes(selected)) clearSelection();
        void context.setNodes(ids, false, true, faded ? members : []).then(() => {
          if (selected !== undefined && group.includes(selected) && !selectionRef.current
            && selectionGroupRef.current.includes(selected)
            && nodesRef.current.some(node => group.includes(node.instanceID) && node.visible)) selectNode(selected);
        });
        setContextFadedNodeIds(new Set(context.nodeIds));
        return;
      }
      const context = collectionContextRef.current;
      if (context?.nodeIds.has(instanceID)) {
        void context.setNodes([...context.nodeIds].filter(id => id !== instanceID));
        setContextFadedNodeIds(new Set(context.nodeIds));
        return;
      }

      const protectedIds = new Set(nodesRef.current.filter(isAlwaysOpaqueStructure)
        .flatMap(node => getGeometryDescendants(node.instanceID).map(geo => geo.instanceID)));
      const geoNodes = getGeometryDescendants(instanceID).filter(geo => !protectedIds.has(geo.instanceID));
      const matIds = Array.from(
        new Set(geoNodes.map((n) => n.materialID as string).filter(Boolean)),
      );
      if (matIds.length === 0) return;

      const alreadyFaded = fadedNodeIdsRef.current.has(instanceID);

      matIds.forEach((matId) => {
        const idx = materialsRef.current.findIndex((m) => m.id === matId);
        if (idx < 0) return;

        if (alreadyFaded) {
          // Restore original Opacity
          const orig = fadedRestoreRef.current.get(matId);
          if (orig === undefined) return;
          const restored: SketchfabMaterial = JSON.parse(
            JSON.stringify(materialsRef.current[idx]),
          );
          restored.channels.Opacity = orig;
          api.setMaterial(restored, () => {});
          materialsRef.current[idx] = restored;
          fadedRestoreRef.current.delete(matId);
        } else {
          // Store original and apply fade
          const mat = materialsRef.current[idx];
          if (!fadedRestoreRef.current.has(matId)) {
            fadedRestoreRef.current.set(
              matId,
              mat.channels.Opacity
                ? JSON.parse(JSON.stringify(mat.channels.Opacity))
                : { enable: false, factor: 1.0 },
            );
          }
          const faded: SketchfabMaterial = JSON.parse(JSON.stringify(mat));
          faded.channels.Opacity = cranialNerveOpacity(modelUid, mat)
            ?? brachialPlexusOpacity(modelUid, mat)
            ?? skullBaseOpacity(modelUid, mat)
            ?? autonomicNerveOpacity(modelUid, mat)
            ?? lumbosacralPlexusOpacity(modelUid, mat)
            ?? longTractOpacity(modelUid, mat)
            ?? brainstemCerebellumOpacity(modelUid, mat)
            ?? brainMenuOpacity(modelUid, mat) ?? temporalAssociationOpacity(modelUid, mat)
            ?? { ...BRAINSTEM_TRANSPARENCY };
          api.setMaterial(faded, () => {});
          materialsRef.current[idx] = faded;
        }
      });

      const next = new Set(fadedNodeIdsRef.current);
      alreadyFaded ? next.delete(instanceID) : next.add(instanceID);
      fadedNodeIdsRef.current = next;
      setFadedNodeIds(next);
    },
    [getGeometryDescendants, getCollectionContext, clearSelection, selectNode, preserveSourceMaterials, allowSourceFade, keepSourceAppearance, modelUid],
  );

  /** Restore opacity on every faded node at once. */
  const setCollectionContext = useCallback((ids: readonly number[], merge = false, keepForegroundOpaque = false, foregroundIds?: readonly number[], transparentPriorityIds?: readonly number[], colorOverrides: readonly CollectionNodeColor[] = [], allowSourceContext = false, refractionNodeIds: readonly number[] = []) => {
    const headNeckBones = headNeckBoneContextIds(modelUid, nodesRef.current);
    const sourceProtected = preserveSourceMaterials && !allowSourceContext;
    if (sourceProtected && ids.length > 0 && !headNeckBones.length) return;
    const contextIds = [...new Set([...(sourceProtected ? [] : ids), ...headNeckBones])];
    refractionContextNodesRef.current = new Set([...refractionNodeIds, ...headNeckBones]);
    const context = getCollectionContext();
    const opaqueBones = new Set(modelUid === SKULL_BASE_MODEL_UID && !boneTransparencyEnabledRef.current
      ? skullBaseBoneTransparencyPlan(nodesRef.current, [], false).opaqueBoneIds : []);
    void context.setNodes(contextIds.filter(id => !opaqueBones.has(id)), merge, sourceProtected && headNeckBones.length > 0 ? false : keepForegroundOpaque,
      foregroundIds, [...new Set([...(transparentPriorityIds ?? []), ...headNeckBones])].filter(id => !opaqueBones.has(id)), colorOverrides);
    setContextFadedNodeIds(new Set(context.nodeIds));
  }, [getCollectionContext, preserveSourceMaterials, modelUid]);

  // Re-evaluate after Show/Hide, isolation and Restore, not just menu changes.
  // Explicit muscle context remains separate from these automatic bone defaults.
  useEffect(() => {
    if (modelUid !== UPPER_LIMB_TOPOGRAPHY_MODEL_UID || !materialsReady || apiMode !== 'api') return;
    const context = getCollectionContext();
    void context.refresh();
    setContextFadedNodeIds(new Set(context.nodeIds));
  }, [nodes, modelUid, materialsReady, apiMode, getCollectionContext]);

  const setBoneTransparency = useCallback((enabled: boolean) => {
    if (modelUid !== SKULL_BASE_MODEL_UID) return;
    boneTransparencyEnabledRef.current = enabled;
    const context = getCollectionContext();
    const plan = skullBaseBoneTransparencyPlan(nodesRef.current, [...context.nodeIds], enabled);
    // Update materials only: visibility, the camera and collection snapshots stay intact.
    const selected = selectionRef.current?.instanceID;
    const boneIds = skullBaseBoneTransparencyPlan(nodesRef.current, [], false).opaqueBoneIds;
    const selectedBone = selected !== undefined && boneIds.includes(selected);
    if (selectedBone) clearSelection();
    void context.setNodes(plan.contextIds, false, true, undefined, plan.contextIds).then(() => {
      if (selectedBone && !selectionRef.current) selectNode(selected);
    });
    setContextFadedNodeIds(new Set(context.nodeIds));
  }, [modelUid, getCollectionContext, clearSelection, selectNode]);

  const unfadeAllNodes = useCallback(() => {
    void collectionContextRef.current?.setNodes([]);
    setContextFadedNodeIds(new Set());
    const api = apiRef.current;
    if (!api || fadedRestoreRef.current.size === 0) return;

    fadedRestoreRef.current.forEach((origOpacity, matId) => {
      const idx = materialsRef.current.findIndex((m) => m.id === matId);
      if (idx < 0) return;
      const restored: SketchfabMaterial = JSON.parse(
        JSON.stringify(materialsRef.current[idx]),
      );
      restored.channels.Opacity = origOpacity;
      api.setMaterial(restored, () => {});
      materialsRef.current[idx] = restored;
    });

    fadedRestoreRef.current.clear();
    fadedNodeIdsRef.current = new Set();
    setFadedNodeIds(new Set());
  }, []);

  const exitIsolation = useCallback(() => {
    focusRequestRef.current++;
    setIsFocusing(false);
    const isolation = isolationRef.current;
    if (!isolation) return;
    isolationRef.current = null;
    setIsolatedNodeId(null);
    setIsolatedWithContext(false);
    setFocusError(null);

    const api = apiRef.current;
    if (api) {
      isolation.originalMaterials.forEach((materialId, geoId) => {
        const raw = getRawNode(geoId);
        if (raw) api.assignMaterial(raw, materialId, () => {});
      });
    }
    const toShow: number[] = [];
    const toHide: number[] = [];
    nodesRef.current.forEach((node) => {
      const wasVisible = isolation.visibility.get(node.instanceID);
      if (wasVisible === undefined || wasVisible === node.visible) return;
      (wasVisible ? toShow : toHide).push(node.instanceID);
    });
    setNodesVisibility(toShow, true, false);
    setNodesVisibility(toHide, false, false);
    if (isolation.camera && api?.setCameraLookAt) {
      api.setCameraLookAt(isolation.camera.position, isolation.camera.target, 0.7);
    }
  }, [getRawNode, setNodesVisibility]);

  // Transfer a focused structure into a mixed view without restoring hidden
  // neighbours or moving the camera. The caller retains the Restore snapshot.
  const retainCurrentIsolation = useCallback(() => {
    focusRequestRef.current++;
    setIsFocusing(false);
    const isolation = isolationRef.current;
    if (!isolation) return null;
    isolationRef.current = null;
    setIsolatedNodeId(null);
    setIsolatedWithContext(false);
    setFocusError(null);
    const api = apiRef.current;
    isolation.originalMaterials.forEach((materialId, geoId) => {
      const raw = getRawNode(geoId);
      if (api && raw) api.assignMaterial(raw, materialId, () => {});
    });
    return { visibility: isolation.visibility, camera: Promise.resolve(isolation.camera) };
  }, [getRawNode]);

  const captureCamera = useCallback(() => {
    const api = apiRef.current;
    return api ? captureViewerCamera(api) : Promise.resolve(null);
  }, []);

  const restoreCamera = useCallback((camera: Promise<ViewerCamera | null>) => {
    const api = apiRef.current;
    const request = ++focusRequestRef.current;
    setIsFocusing(false);
    void subsetFocusQueueRef.current.then(() => camera).then((snapshot) => {
      if (snapshot && api && apiRef.current === api && focusRequestRef.current === request) {
        api.setCameraLookAt?.(snapshot.position, snapshot.target, 0.7);
      }
    });
  }, []);

  const setAnatomicalView = useCallback(async (orientation: 'superior' | 'profile', zoomScale = 1) => {
    const api = apiRef.current;
    const request = focusRequestRef.current;
    if (!api?.setCameraLookAt) return;
    const current = await captureViewerCamera(api);
    if (!current || apiRef.current !== api || request !== focusRequestRef.current) return;
    const camera = orientation === 'profile' ? profileViewerCamera(current) : superiorViewerCamera(current, zoomScale);
    api.setCameraLookAt(camera.position, camera.target, 0.7);
  }, []);

  const focusVisibleNodes = useCallback(async (
    instanceIDs: number[], cameraReady: Promise<ViewerCamera | null>, targetsOnly = false,
  ) => {
    const api = apiRef.current;
    if (!api) return;
    const request = ++focusRequestRef.current;
    const isCurrent = () => apiRef.current === api && focusRequestRef.current === request;
    setFocusError(null);
    if (!api.focusOnVisibleGeometries) {
      setFocusError('This viewer does not support zooming to an isolated collection.');
      return;
    }
    setIsFocusing(true);
    await cameraReady;
    // A prior target-only fit must restore its temporary masks before any new
    // collection fit, including a return to a non-brachial section.
    await subsetFocusQueueRef.current;
    if (!isCurrent()) return;
    const ready = await waitForViewerVisibility(
      isCurrent,
      () => pendingVisibilityRef.current.size,
      () => visibilityFrameRef.current !== null,
    );
    if (!isCurrent()) return;
    if (!ready) {
      setIsFocusing(false);
      setFocusError('The collection is isolated, but camera preparation timed out.');
      return;
    }
    // Hide can run while the camera is preparing. Never fit an empty scene or
    // reintroduce structures the user has just hidden.
    const ids = new Set(instanceIDs);
    if (!nodesRef.current.some((node) => ids.has(node.instanceID) && node.visible)) {
      setIsFocusing(false);
      return;
    }
    if (targetsOnly) {
      const geometry = (nodes: readonly SceneNode[]) => nodes.flatMap(node =>
        getGeometryDescendants(node.instanceID).map(geo => geo.instanceID));
      const run = subsetFocusQueueRef.current.then(() => focusVisibleSubset(
        api, geometry(nodesRef.current.filter(node => ids.has(node.instanceID))),
        () => geometry(nodesRef.current.filter(node => node.visible)), isCurrent,
      ));
      subsetFocusQueueRef.current = run.catch(() => {});
      try {
        await run;
      } catch {
        if (isCurrent()) setFocusError('Could not zoom to the selected structures.');
      } finally {
        if (isCurrent()) setIsFocusing(false);
      }
      return;
    }
    api.focusOnVisibleGeometries((error) => {
      if (!isCurrent()) return;
      setIsFocusing(false);
      if (error) setFocusError('The collection is isolated, but could not be zoomed into.');
    });
  }, [getGeometryDescendants]);

  const focusWithContext = useCallback(async (instanceID: number, withContext = true) => {
    const api = apiRef.current;
    const selected = nodesRef.current.find((node) => node.instanceID === instanceID);
    if (!api || !selected) return;
    if (!api.focusOnVisibleGeometries) {
      setFocusError('This viewer does not support zooming to a structure.');
      return;
    }
    exitIsolation();
    const request = ++focusRequestRef.current;
    setFocusError(null);
    await subsetFocusQueueRef.current;
    if (apiRef.current !== api || request !== focusRequestRef.current) return;

    // Favor structures in the same model branch and on the same side. When
    // usable transform positions are available, use their distance as well.
    const isDescendantOf = (id: number, ancestorId: number) => {
      let parent = parentMapRef.current.get(id);
      const visited = new Set<number>();
      while (parent !== undefined && !visited.has(parent)) {
        if (parent === ancestorId) return true;
        visited.add(parent);
        parent = parentMapRef.current.get(parent);
      }
      return false;
    };
    const selectedGroup = selectionGroupForId(instanceID)?.memberIds ?? null;
    const targetIds = new Set(selectedGroup ??
      nodesRef.current
        .filter((node) => node.instanceID === instanceID || isDescendantOf(node.instanceID, instanceID))
        .map((node) => node.instanceID),
    );
    const side = selected.name.match(/\((Left|Right)\)$/)?.[1];
    const parentId = parentMapRef.current.get(instanceID);
    const tokens = new Set(selected.name.toLowerCase().match(/[a-z]{4,}/g) ?? []);
    const candidates = nodesRef.current
      .filter((node) =>
        withContext && node.visible
        && !targetIds.has(node.instanceID)
        && node.instanceID !== instanceID
        && !isDescendantOf(node.instanceID, instanceID)
        && !isDescendantOf(instanceID, node.instanceID)
        && (node.systemId ?? 'nervous') === (selected.systemId ?? 'nervous')
        && getGeometryDescendants(node.instanceID).length > 0,
      )
      .map((node) => ({
        node,
        score: (parentId != null && parentMapRef.current.get(node.instanceID) === parentId ? 5 : 0)
          + (side && node.name.endsWith(`(${side})`) ? 3 : 0)
          + (node.name.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((word) => tokens.has(word)).length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 24);

    let contextIds = candidates.slice(0, 4).map(({ node }) => node.instanceID);
    if (api.getMatrix && candidates.length > 0) {
      const matrixPosition = (value: unknown): number[] | null => {
        const options: unknown[] = [value];
        if (value !== null && typeof value === 'object') {
          const result = value as Record<string, unknown>;
          options.push(result.world, result.matrix, result.local, result.elements, result.data);
        }
        for (const option of options) {
          const numbers = Array.isArray(option)
            ? option
            : ArrayBuffer.isView(option) && 'length' in option
              ? Array.from(option as Float32Array)
              : null;
          if (!numbers || numbers.length < 15) continue;
          const position = [numbers[12], numbers[13], numbers[14]];
          if (position.every((n) => typeof n === 'number' && Number.isFinite(n))) return position;
        }
        return null;
      };
      const getPosition = (id: number) => new Promise<number[] | null>((resolve) => {
        try {
          api.getMatrix!(id, (err, matrix) => resolve(err ? null : matrixPosition(matrix)));
        } catch {
          resolve(null);
        }
      });
      const positions = await Promise.race([
        Promise.all([getPosition(instanceID), ...candidates.map(({ node }) => getPosition(node.instanceID))]),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);
      if (positions?.[0]) {
        const origin = positions[0];
        const ranked = candidates.map(({ node, score }, index) => {
          const point = positions[index + 1];
          const distance = point ? Math.hypot(...point.map((value, axis) => value - origin[axis])) : Infinity;
          return { id: node.instanceID, distance, score };
        });
        if (ranked.some(({ distance }) => distance > 0 && Number.isFinite(distance))) {
          contextIds = ranked.sort((a, b) => a.distance - b.distance || b.score - a.score).slice(0, 4).map(({ id }) => id);
        }
      }
    }
    if (apiRef.current !== api || request !== focusRequestRef.current || selectionRef.current?.instanceID !== instanceID) return;

    const isolation: IsolationState = {
      instanceID,
      visibility: new Map(nodesRef.current.map((node) => [node.instanceID, node.visible])),
      originalMaterials: new Map(),
      camera: null,
    };
    isolationRef.current = isolation;
    setIsolatedNodeId(instanceID);
    setIsolatedWithContext(withContext);
    setIsFocusing(true);
    if (api.getCameraLookAt) {
      const camera = await Promise.race([
        new Promise<IsolationState['camera']>((resolve) =>
          api.getCameraLookAt!((err, current) => resolve(err ? null : current))),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 500)),
      ]);
      if (isolationRef.current !== isolation) return;
      isolation.camera = camera;
    }

    setNodesVisibility(nodesRef.current.filter((node) => !targetIds.has(node.instanceID)).map((node) => node.instanceID), false, false);
    setNodesVisibility([...targetIds], true, false);

    // Visibility is queued in small batches. Large models can take more than
    // three seconds, so fail only when the queue stops making progress.
    const waitForVisibility = () => new Promise<boolean>((resolve) => {
      let previousRemaining = pendingVisibilityRef.current.size;
      let lastProgress = Date.now();
      const check = () => {
        if (isolationRef.current !== isolation) return resolve(false);
        if (visibilityFrameRef.current === null && pendingVisibilityRef.current.size === 0) return resolve(true);
        if (pendingVisibilityRef.current.size < previousRemaining) {
          previousRemaining = pendingVisibilityRef.current.size;
          lastProgress = Date.now();
        }
        if (Date.now() - lastProgress > 10000) return resolve(false);
        requestAnimationFrame(check);
      };
      check();
    });
    if (!await waitForVisibility()) {
      if (isolationRef.current === isolation) {
        exitIsolation();
        setFocusError('Could not finish preparing the focused view. Please try again.');
      }
      return;
    }
    api.focusOnVisibleGeometries((err) => {
      if (isolationRef.current !== isolation) return;
      setIsFocusing(false);
      if (err) {
        exitIsolation();
        setFocusError('Could not zoom to this structure.');
        return;
      }
      // Strict isolation keeps only the selected structure and its geometry.
      // Do not reintroduce faded neighbours in this mode.
      if (!withContext) return;
      setNodesVisibility(contextIds, true, false);
      if (contextIds.length === 0) {
        setFocusError('No nearby context structures were available for this mesh.');
      }
      const protectedGeometryIds = new Set(
        nodesRef.current.filter(node => modelUid !== 'ec502e9febdd4a4c91cb52a45ac2fa98'
          && (isAlwaysOpaqueStructure(node)
            || (collectionContextRef.current?.foregroundProtected && isBasalForebrainOpaqueStructure(node))))
          .flatMap(node => getGeometryDescendants(node.instanceID).map(geo => geo.instanceID)),
      );
      contextIds.forEach((id) => {
        getGeometryDescendants(id).forEach((geo) => {
          if (protectedGeometryIds.has(geo.instanceID)) return;
          const materialId = geo.materialID as string | undefined;
          const base = materialsRef.current.find((material) => material.id === materialId);
          if (!base || !materialId) return;
          isolation.originalMaterials.set(geo.instanceID, materialId);
          const faded: SketchfabMaterial = JSON.parse(JSON.stringify(base));
          delete (faded as Partial<SketchfabMaterial>).id;
          faded.name = `__context_${instanceID}_${geo.instanceID}`;
          faded.channels.Opacity = (refractionContextNodesRef.current.has(id) ? refractionContextOpacity(base) : undefined)
            ?? skullBaseOpacity(modelUid, base)
            ?? brachialPlexusOpacity(modelUid, base)
            ?? cranialNerveOpacity(modelUid, base)
            ?? autonomicNerveOpacity(modelUid, base)
            ?? lumbosacralPlexusOpacity(modelUid, base)
            ?? longTractOpacity(modelUid, base)
            ?? brainstemCerebellumOpacity(modelUid, base)
            ?? brainMenuOpacity(modelUid, base) ?? temporalAssociationOpacity(modelUid, base)
            ?? { ...BRAINSTEM_TRANSPARENCY };
          api.createMaterial(faded, (createErr, created) => {
            if (isolationRef.current !== isolation) return;
            if (createErr || !created?.id) {
              setFocusError('Some context structures could not be faded.');
              return;
            }
            const raw = getRawNode(geo.instanceID);
            if (raw) api.assignMaterial(raw, created.id, () => {
              if (isolationRef.current !== isolation) api.assignMaterial(raw, materialId, () => {});
            });
          });
        });
      });
    });
  }, [exitIsolation, getGeometryDescendants, getRawNode, setNodesVisibility, modelUid]);

  const canUndoHide = useMemo(() => {
    const hidden = new Set(nodes.filter(node => !node.visible).map(node => node.instanceID));
    return hiddenHistoryRef.current.some(entry => entry.some(id => hidden.has(id)));
  }, [nodes]);

  return {
    iframeRef,
    isViewerReady,
    materialsReady,
    nodes,
    annotations,
    error,
    apiMode,
    selectedNodeId,
    fadedNodeIds: new Set([...fadedNodeIds, ...contextFadedNodeIds]),
    isolatedNodeId,
    isolatedWithContext,
    isFocusing,
    focusError,
    toggleNodeVisibility,
    setNodesVisibility,
    showAllNodes,
    undoLastHide,
    canUndoHide,
    hideAllNodes,
    goToAnnotation,
    selectNode,
    clearSelection,
    toggleNodeFade,
    unfadeAllNodes,
    setCollectionContext,
    setBoneTransparency,
    setSelectionGroup,
    focusWithContext,
    captureCamera,
    restoreCamera,
    focusVisibleNodes,
    retainCurrentIsolation,
    setAnatomicalView,
    exitIsolation,
  };
}
