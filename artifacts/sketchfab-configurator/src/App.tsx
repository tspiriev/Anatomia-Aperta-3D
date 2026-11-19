import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { brachialCameraTargets } from './data/brachialCameraFocus';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelGroupHandle } from 'react-resizable-panels';
import { useSketchfabViewer } from './hooks/useSketchfabViewer';
import { brainstemContextIds, brainstemShowContextIds } from './data/brainstemTaxonomy';
import { petrosalAutonomicShowSupportIds, petrosalAutonomicShowContextIds } from './data/skullBasePetrosalAutonomic';
import { headNeckPetrosalSettings, headNeckContextArguments } from './data/headNeckPetrosalSettings';
import { anteriorNeckHiddenLayerIds } from './data/headNeckAnteriorTriangle';
import { neckAnteriorHiddenLayerIds } from './data/neckAnteriorTriangle';
import { lateralNeckHiddenLayerIds } from './data/headNeckLateralNeck';
import { LongTractMenu } from './components/LongTractMenu';
import { HeadNeckTopographyMenu } from './components/HeadNeckTopographyMenu';
import { NeckTopographyMenu } from './components/NeckTopographyMenu';
import { neckTopographyPathForGroup, neckTopographySettings, neckTopographySystemForNode } from './data/neckTopography';
import { UpperLimbTopographyMenu } from './components/UpperLimbTopographyMenu';
import { UPPER_LIMB_TOPOGRAPHY_ROOT, upperLimbPathForGroup, upperLimbSystemForNode,
  upperLimbSettings, type UpperLimbSide } from './data/upperLimbRegionalAtlas';
import { LowerLimbTopographyMenu } from './components/LowerLimbTopographyMenu';
import { LOWER_LIMB_TOPOGRAPHY_ROOT, lowerLimbPathForGroup, lowerLimbSystemForNode,
  lowerLimbSettings, withLowerLimbRootContributions, type LowerLimbSide } from './data/lowerLimbTopography';
import { headNeckTopographySystemForNode } from './data/headNeckTopography';
import { headTopographyPathForGroup, headTopographySettings } from './data/headTopography';
import { SkullBaseMenu } from './components/SkullBaseMenu';
import { skullBaseSystemForNode, skullBaseContextIds, isSkullBaseContext } from './data/skullBaseTaxonomy';
import { isSellarTransparentContext } from './data/skullBaseSellarCavernous';
import { ThalamusCapsuleMenu } from './components/ThalamusCapsuleMenu';
import { TemporalAssociationMenu } from './components/TemporalAssociationMenu';
import { BrainstemCerebellumMenu } from './components/BrainstemCerebellumMenu';
import { BRAINSTEM_CEREBELLUM_ROOT, brainstemCerebellumContextIds, brainstemCerebellumPathForGroup } from './data/brainstemCerebellumAtlas';
import { brainstemCerebellumDisplay, expandCerebellarDisplayIds } from './lib/brainstemCerebellumDisplay';
import { isTemporalBrainContext, isTemporalBrainContextPath, TEMPORAL_BRAIN_CONTEXT_NAME, temporalAssociationContextIds } from './data/temporalAssociationTaxonomy';
import { THALAMUS_CAPSULE_ROOT_PATH, thalamusCapsuleContextIds } from './data/thalamusCapsuleTaxonomy';
import { LONG_TRACT_ROOT_PATH, longTractContextIds, isLongTractExcludedNode } from './data/longTractTaxonomy';
import { MeshPanel } from './components/MeshPanel';
import { SystemToolbar } from './components/SystemToolbar';
import type { SystemGroupId } from './data/anatomicalSystems';
import type { SceneNode } from './types/sketchfab';
import { classifyNervousObject } from './data/nervousTaxonomy';
import { ADVANCED_NEUROANATOMY_ROOT, advancedNeuroanatomyPathForGroup, type NeuroanatomyMode } from './data/advancedNeuroanatomy';
import { classifyVisceraObject } from './data/visceraTaxonomy';
import { classifyCardiovascularObject } from './data/cardiovascularTaxonomy';
import { classifyAttachmentObject } from './data/attachmentTaxonomy';
import { classifyMuscularObject } from './data/muscularTaxonomy';
import { classifyLymphaticObject } from './data/lymphaticTaxonomy';
import { captureRegionIsolation, type RegionIsolationSnapshot, isNodeInRegion, planRegionIsolation, restorePreviousIsolation } from './lib/regionIsolation';
import { HotkeyReference } from './components/HotkeyReference';
import { FullscreenAnatomyMenu } from './components/FullscreenAnatomyMenu';
import { MobileViewerControls, MobileSheet, type MobileSheetId } from './components/MobileViewerControls';
import { ANATOMICAL_SYSTEMS } from './data/anatomicalSystems';
import { useViewerFullscreen } from './hooks/useViewerFullscreen';
import { Loader2, WifiOff, GripVertical, Maximize, Minimize, X } from 'lucide-react';
import { SiteNav } from './components/SiteNav';
import { usePageMeta } from './components/PageShell';
import { getSeoPage } from './lib/seo';
import Home from './pages/Home';
import { MusculoskeletalMenu } from './components/MusculoskeletalMenu';
import {
  classifyMusculoskeletalNode, matchedMuscleAttachmentIds, musculoskeletalSide,
  musculoskeletalIsolationPathForGroup, cleanMusculoskeletalPath,
  previousAttachmentSitesToHide,
} from './data/musculoskeletalTaxonomy';
import About from './pages/About';
import Sources from './pages/Sources';
import Contact from './pages/Contact';
import Legal from './pages/Legal';
import { LegalLinks } from './components/LegalLinks';
import { legalPolicies } from './data/legalPolicies';
import { ATLAS_VIEWS, SPINAL_REFERENCE_VIEWS, FULL_ANATOMY_VIEW, isNodeAllowedInAtlasView, atlasMenuGroupExclusions, type AtlasView } from './data/atlasViews';
import { SpinalCordMenu } from './components/SpinalCordMenu';
import { SPINAL_TOPOGRAPHIC_PATH, SPINAL_NERVE_PATH, spinalReferencePath, spinalCordPathForGroup, spinalCordInitialPath, spinalRootContextIds, spinalRootCameraTargets } from './data/spinalCordAtlas';
import { BRAIN_GROSS_ANATOMY_PATH } from './data/brainGrossAnatomy';
import { ADVANCED_ATLAS_COLLECTIONS, MENINGES_ATLAS_COLLECTION, LIMBIC_ATLAS_COLLECTION, BASAL_FOREBRAIN_ATLAS_COLLECTION, VENTRICULAR_ATLAS_COLLECTION, type AdvancedCollectionRequest } from './data/advancedAtlasCollections';
import { isBasalForebrainContext } from './data/basalForebrainTaxonomy';
import { isWhiteMatterBrainContext, isWhiteMatterPath, whiteMatterContextIds } from './data/whiteMatterContext';
import { basalWholeBrainDisplay, expandWholeBrainIds } from './lib/basalWholeBrain';
import { isThalamusBrainOverviewPath, thalamusWholeBrainDisplay } from './lib/thalamusWholeBrain';
import { skullBaseCerebellumDisplay, WHOLE_CEREBELLUM_NAME } from './lib/skullBaseCerebellumDisplay';
import { isOlfactoryBrainContext, OLFACTORY_BRAIN_CONTEXT_NAME } from './data/olfactoryBasalForebrain';
import type { ViewerCamera } from './lib/viewerCamera';
import { MixCategoriesToggle } from './components/MixCategoriesToggle';
import { CranialNerveMenu } from './components/CranialNerveMenu';
import { AutonomicNerveMenu } from './components/AutonomicNerveMenu';
import { BrachialPlexusMenu, type BrachialSide } from './components/BrachialPlexusMenu';
import { LumbosacralPlexusMenu } from './components/LumbosacralPlexusMenu';
import { lumbosacralContextIds, lumbosacralForegroundIds } from './data/lumbosacralPlexusTaxonomy';
import { brachialContextIds, brachialForegroundIds, brachialTrunkColorNodes, brachialDivisionColorNodes, brachialCordColorNodes } from './data/brachialPlexusTaxonomy';
import { isBrachialTrunkName, brachialTrunkContextPart } from './data/brachialTrunkContext';
import { isBrachialWholeBrainNode, BRACHIAL_WHOLE_BRAIN_NAME } from './data/brachialOverview';
import { cranialNervePathForGroup, cranialNerveContextIds, cranialNerveForegroundIds } from './data/cranialNerveTaxonomy';
import { autonomicContextIds, autonomicForegroundIds } from './data/autonomicTaxonomy';
import { isPlexusHeartNode, PLEXUS_HEART_CONTEXT_NAME } from './data/autonomicPlexusContext';
import { cochlearBasalGangliaName } from './data/cochlearTaxonomy';
import { isOpticOccipitalContext, OPTIC_OCCIPITAL_CONTEXT_NAME } from './data/opticVisualContext';

const regionPathForNode = (node: SceneNode): readonly string[] | null => {
  if (node.systemId === 'nervous') return classifyNervousObject(node.rawName);
  if (node.systemId === 'organs') return classifyVisceraObject(node.rawName);
  if (node.systemId === 'vascular') return classifyCardiovascularObject(node.rawName);
  if (node.systemId === 'attachments') return classifyAttachmentObject(node.rawName);
  if (node.systemId === 'muscular') return classifyMuscularObject(node.rawName);
  if (node.systemId === 'lymphatic') return classifyLymphaticObject(node.rawName);
  return null;
};

function ViewerPage({ view = FULL_ANATOMY_VIEW }: { view?: AtlasView }) {
  const isTopographicAtlas = Boolean(view.headNeckTopography || view.neckTopography || view.upperLimbTopography || view.lowerLimbTopography);
  const limbTopography = Boolean(view.upperLimbTopography || view.lowerLimbTopography);
  const [lowerLimbSide, setLowerLimbSide] = useState<LowerLimbSide>('both');
  const [upperLimbSide, setUpperLimbSide] = useState<UpperLimbSide>('both');
  const [upperLimbMuscles, setUpperLimbMuscles] = useState(false);
  const topographicPathForGroup = useCallback((node: SceneNode, path: readonly string[]) =>
    view.lowerLimbTopography ? lowerLimbPathForGroup(node, path, lowerLimbSide)
      : view.upperLimbTopography ? upperLimbPathForGroup(node, path, upperLimbSide)
      : view.neckTopography ? neckTopographyPathForGroup(node, path)
      : headTopographyPathForGroup(node, path), [view.lowerLimbTopography, view.upperLimbTopography, view.neckTopography, upperLimbSide, lowerLimbSide]);
  const topographicSettings = useCallback((all: readonly SceneNode[], ids: readonly number[], path: readonly string[]): ReturnType<typeof headNeckPetrosalSettings> =>
    view.lowerLimbTopography ? lowerLimbSettings(all, ids, path, lowerLimbSide)
      : view.upperLimbTopography ? upperLimbSettings(all, ids, path, upperLimbSide, upperLimbMuscles)
      : view.neckTopography ? neckTopographySettings(all, ids, path)
      : view.headNeckTopography ? headTopographySettings(all, ids, path)
        : headNeckPetrosalSettings(all, ids, path), [view.lowerLimbTopography, view.upperLimbTopography, view.neckTopography, view.headNeckTopography, upperLimbSide, upperLimbMuscles, lowerLimbSide]);
  const [neuroanatomyMode, setNeuroanatomyMode] = useState<NeuroanatomyMode>('standard');
  const [advancedCollectionRequest, setAdvancedCollectionRequest] = useState<AdvancedCollectionRequest | null>(null);
  const [mixCategories, setMixCategories] = useState(false);
  const handleNeuroanatomyModeChange = useCallback((mode: NeuroanatomyMode) => {
    setNeuroanatomyMode(mode);
    if (mode === 'standard') setAdvancedCollectionRequest(null);
  }, []);
  usePageMeta(
    view.id === FULL_ANATOMY_VIEW.id
      ? 'Explore Atlas — Anatomia Aperta 3D'
      : `${view.label} — Anatomia Aperta 3D`,
    view.systemIds
      ? `${view.description}. Interactive 3D anatomy with collection, structure, and fullscreen controls.`
      : 'Interactive 3D human anatomy viewer with system, region, and structure controls.',
  );
  const [stackedLayout, setStackedLayout] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  );
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const [mobileSheet, setMobileSheet] = useState<MobileSheetId | null>(null);
  const toggleMobileSheet = useCallback((id: MobileSheetId) => setMobileSheet(open => open === id ? null : id), []);
  const closeMobileSheet = useCallback(() => setMobileSheet(null), []);
  const { containerRef: viewerContainerRef, isFullscreen, isNativeFullscreen, toggleFullscreen } = useViewerFullscreen();

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const updateLayout = () => setStackedLayout(media.matches);
    updateLayout();
    media.addEventListener('change', updateLayout);
    return () => media.removeEventListener('change', updateLayout);
  }, []);

  useEffect(() => {
    panelGroupRef.current?.setLayout(stackedLayout ? [100, 0] : [65, 35]);
  }, [stackedLayout]);

  const {
    iframeRef,
    isViewerReady,
    materialsReady,
    nodes: modelNodes,
    error,
    apiMode,
    selectedNodeId,
    fadedNodeIds,
    toggleNodeVisibility: toggleRawNodeVisibility,
    setNodesVisibility,
    showAllNodes,
    undoLastHide,
    canUndoHide,
    selectNode: selectRawNode,
    clearSelection,
    toggleNodeFade,
    unfadeAllNodes,
    setCollectionContext,
    setBoneTransparency,
    setSelectionGroup,
    isolatedNodeId,
    isolatedWithContext,
    isFocusing,
    focusError,
    focusWithContext,
    captureCamera,
    restoreCamera,
    focusVisibleNodes,
    setAnatomicalView,
    annotations: sourceAnnotations,
    goToAnnotation: onSourceAnnotation,
    retainCurrentIsolation,
    exitIsolation,
  } = useSketchfabViewer(view.modelUid, Boolean(view.cranialNerves),
    Boolean(isTopographicAtlas || view.spinalCord || view.longTracts || view.thalamusCapsule || view.temporalAssociation || view.brainstemCerebellum), Boolean(view.preserveAnnotations),
    Boolean(view.spinalCord || view.longTracts), limbTopography);

  const isNerveAtlas = Boolean(isTopographicAtlas || view.skullBase || view.spinalCord || view.musculoskeletal || view.cranialNerves || view.autonomicNerves || view.brachialPlexus || view.lumbosacralPlexus || view.longTracts || view.thalamusCapsule || view.temporalAssociation || view.brainstemCerebellum);
  const FocusedNerveMenu = view.lowerLimbTopography ? LowerLimbTopographyMenu : view.upperLimbTopography ? UpperLimbTopographyMenu : view.neckTopography ? NeckTopographyMenu : view.headNeckTopography ? HeadNeckTopographyMenu : view.brainstemCerebellum ? BrainstemCerebellumMenu : view.skullBase ? SkullBaseMenu : view.spinalCord ? SpinalCordMenu : view.musculoskeletal ? MusculoskeletalMenu : view.temporalAssociation ? TemporalAssociationMenu : view.thalamusCapsule ? ThalamusCapsuleMenu : view.longTracts ? LongTractMenu : view.lumbosacralPlexus ? LumbosacralPlexusMenu : view.brachialPlexus ? BrachialPlexusMenu : view.autonomicNerves ? AutonomicNerveMenu : CranialNerveMenu;
  const initialSpinalPath = useRef<readonly string[] | null>(view.spinalCord
    ? spinalCordInitialPath(window.location.search, view.spinalReferenceModelUid) : null);
  const [activeNerveId, setActiveNerveId] = useState<string | null>(() => initialSpinalPath.current?.slice(0, 3).join('/') ?? null);
  const [thalamusIndividualSelection, setThalamusIndividualSelection] = useState(false);
  const [brachialSide, setBrachialSide] = useState<BrachialSide>('both');
  const [boneTransparency, setBoneTransparencyState] = useState(true);
  const handleBoneTransparencyChange = useCallback((enabled: boolean) => {
    setBoneTransparencyState(enabled);
    setBoneTransparency(enabled);
  }, [setBoneTransparency]);
  const [brachialCordMuscles, setBrachialCordMuscles] = useState(true);
  const [lumbosacralSide, setLumbosacralSide] = useState<BrachialSide>('both');
  const [lumbosacralMuscles, setLumbosacralMuscles] = useState(true);
  const [musculoskeletalFilterSide, setMusculoskeletalFilterSide] = useState<BrachialSide>('both');
  const [musculoskeletalAttachments, setMusculoskeletalAttachments] = useState(false);
  const [isolatedRegionPath, setIsolatedRegionPath] = useState<readonly string[] | null>(null);
  const brachialMenuProps = {
    boneTransparency, onBoneTransparencyChange: handleBoneTransparencyChange,
    brachialSide, onBrachialSideChange: setBrachialSide,
    brachialCordMuscles, onBrachialCordMusclesChange: setBrachialCordMuscles,
    lumbosacralSide, onLumbosacralSideChange: setLumbosacralSide,
    lumbosacralMuscles, onLumbosacralMusclesChange: setLumbosacralMuscles,
    musculoskeletalSide: musculoskeletalFilterSide, onMusculoskeletalSideChange: setMusculoskeletalFilterSide,
    musculoskeletalAttachments, onMusculoskeletalAttachmentsChange: setMusculoskeletalAttachments,
    spinalReferenceModelUid: view.spinalReferenceModelUid, sourceAnnotations, onSourceAnnotation,
    upperLimbSide, onUpperLimbSideChange: setUpperLimbSide,
    upperLimbMuscles, onUpperLimbMusclesChange: setUpperLimbMuscles,
    lowerLimbSide, onLowerLimbSideChange: setLowerLimbSide,
  };
  const cranialOverview = Boolean(isNerveAtlas && activeNerveId === null);
  const nodes = useMemo(
    () => {
      const scoped = cranialOverview && !view.musculoskeletal && !view.brainstemCerebellum && !isTopographicAtlas ? modelNodes
        : modelNodes.filter(node => isNodeAllowedInAtlasView(node, view));
      return view.lowerLimbTopography ? withLowerLimbRootContributions(scoped.map(node => ({ ...node, systemId: lowerLimbSystemForNode(node) })))
        : view.upperLimbTopography ? scoped.map(node => ({ ...node, systemId: upperLimbSystemForNode(node) }))
        : view.neckTopography ? scoped.map(node => ({ ...node, systemId: neckTopographySystemForNode(node) }))
        : view.headNeckTopography ? scoped.map(node => ({ ...node, systemId: headNeckTopographySystemForNode(node) }))
        : view.skullBase ? scoped.map(node => ({ ...node, systemId: skullBaseSystemForNode(node) }))
        : view.musculoskeletal ? scoped.map(node => {
        const category = classifyMusculoskeletalNode(node.rawName)[0]?.category;
        const systemId: SystemGroupId = category === 'attachments' ? 'attachments'
          : category === 'bones' || category === 'joints-ligaments' ? 'skeletal' : 'muscular';
        return { ...node, systemId };
      }) : scoped;
    },
    [modelNodes, view, cranialOverview, isTopographicAtlas],
  );
  const headPetrosalSupportRef = useRef(new Set<number>());
  // Enforce targeted-view scope in the scene as well as in its menus. This also
  // prevents Show all or temporary context from reintroducing other systems.
  useEffect(() => {
    if ((cranialOverview && !view.brainstemCerebellum && !isTopographicAtlas) || !view.systemIds || apiMode !== 'api') return;
    const outside = modelNodes.filter((node) => node.visible
      && (!isNodeAllowedInAtlasView(node, view)
        || (view.upperLimbTopography && !upperLimbPathForGroup(node, UPPER_LIMB_TOPOGRAPHY_ROOT, upperLimbSide))
        || (view.lowerLimbTopography && !lowerLimbPathForGroup(node, LOWER_LIMB_TOPOGRAPHY_ROOT, lowerLimbSide)))
      && !(view.headNeckTopography && headPetrosalSupportRef.current.has(node.instanceID)));
    if (outside.length) setNodesVisibility(outside.map((node) => node.instanceID), false, false);
  }, [view, modelNodes, apiMode, setNodesVisibility, cranialOverview, isTopographicAtlas, upperLimbSide, lowerLimbSide]);

  const [selectedSystemId, setSelectedSystemId] = useState<SystemGroupId>(view.initialSystemId);
  const musculoskeletalInitialized = useRef(false);
  useEffect(() => {
    if (!view.musculoskeletal || !materialsReady || apiMode !== 'api' || musculoskeletalInitialized.current) return;
    musculoskeletalInitialized.current = true;
    setNodesVisibility(modelNodes.filter(node =>
      !isNodeAllowedInAtlasView(node, view)
      || classifyMusculoskeletalNode(node.rawName).some(entry => entry.category === 'attachments'))
      .map(node => node.instanceID), false, false);
  }, [view, materialsReady, apiMode, modelNodes, setNodesVisibility]);
  const selectedMusculoskeletalNode = view.musculoskeletal ? nodes.find(node => node.instanceID === selectedNodeId) : undefined;
  const matchingMusculoskeletalSites = view.musculoskeletal && musculoskeletalAttachments && selectedMusculoskeletalNode
    ? matchedMuscleAttachmentIds(selectedMusculoskeletalNode, nodes).filter(id => {
      const side = musculoskeletalSide(nodes.find(node => node.instanceID === id)?.rawName ?? '');
      return musculoskeletalFilterSide === 'both' || side === 'bilateral' || side === musculoskeletalFilterSide;
    }) : [];
  const matchingMusculoskeletalKey = matchingMusculoskeletalSites.join(',');
  const previousMusculoskeletalSites = useRef<number[]>([]);
  useEffect(() => {
    if (!view.musculoskeletal) return;
    if (previousMusculoskeletalSites.current.length) {
      const hide = previousAttachmentSitesToHide(previousMusculoskeletalSites.current, nodes, isolatedRegionPath);
      if (hide.length) setNodesVisibility(hide, false, false);
    }
    if (matchingMusculoskeletalSites.length) setNodesVisibility(matchingMusculoskeletalSites, true, false);
    previousMusculoskeletalSites.current = matchingMusculoskeletalSites;
  // Visibility edits must not continuously re-enable a user-hidden attachment.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.musculoskeletal, matchingMusculoskeletalKey, isolatedRegionPath, setNodesVisibility]);
  const previousSelectedId = useRef<number | null>(null);
  const regionIsolationRef = useRef<RegionIsolationSnapshot<Promise<ViewerCamera | null>> | null>(null);
  useEffect(() => {
    if (!view.longTracts || apiMode !== 'api' || !isViewerReady || mixCategories) return;
    const section = isolatedRegionPath?.[2] ?? activeNerveId?.split('/')[2];
    // Superior colliculi belong to the gaze collection and descending
    // tectospinal pathway. Mixing intentionally preserves combined structures.
    setNodesVisibility(modelNodes.filter(node => isLongTractExcludedNode(node, section))
      .map(node => node.instanceID), false, false);
  }, [view.longTracts, apiMode, isViewerReady, modelNodes, setNodesVisibility, isolatedRegionPath, activeNerveId, mixCategories]);
  const olfactoryBrainActive = Boolean(view.cranialNerves && activeNerveId === 'advanced-neuroanatomy/cranial-nerves/i');
  const opticOccipitalActive = Boolean(view.cranialNerves && activeNerveId === 'advanced-neuroanatomy/cranial-nerves/ii');
  const plexusHeartActive = Boolean(view.autonomicNerves && activeNerveId === 'advanced-neuroanatomy/autonomic-nervous-system/plexuses');
  const brachialOverviewActive = Boolean(view.brachialPlexus && activeNerveId === 'advanced-neuroanatomy/brachial-plexus/overview');
  const temporalBrainActive = Boolean(view.temporalAssociation && isTemporalBrainContextPath(activeNerveId?.split('/') ?? []));
  const thalamusBrainPath = isolatedRegionPath ?? activeNerveId?.split('/') ?? [];
  const thalamusBrainActive = Boolean(view.thalamusCapsule && !thalamusIndividualSelection
    && isThalamusBrainOverviewPath(thalamusBrainPath));
  const whiteMatterActive = Boolean(view.brainGrossAnatomy && neuroanatomyMode === 'advanced'
    && ((advancedCollectionRequest?.id ?? '').startsWith('advanced-neuroanatomy/white-matter')
      || (!advancedCollectionRequest && (!isolatedRegionPath || isWhiteMatterPath(isolatedRegionPath)))));
  const wholeBrainActive = olfactoryBrainActive || Boolean(view.brainGrossAnatomy && neuroanatomyMode === 'advanced'
    && (advancedCollectionRequest?.id === BASAL_FOREBRAIN_ATLAS_COLLECTION.id
      || advancedCollectionRequest?.id === VENTRICULAR_ATLAS_COLLECTION.id
      || (!advancedCollectionRequest && ['basal-forebrain', 'ventricular-system'].includes(isolatedRegionPath?.[1] ?? ''))));
  const wholeBrain = useMemo(() => view.skullBase
    ? skullBaseCerebellumDisplay(nodes, activeNerveId?.split('/') ?? [], isolatedRegionPath ?? [])
    : thalamusBrainActive
    ? thalamusWholeBrainDisplay(nodes, isolatedRegionPath ?? activeNerveId?.split('/') ?? [])
    : whiteMatterActive
    ? basalWholeBrainDisplay(nodes, true, isWhiteMatterBrainContext)
    : temporalBrainActive
    ? basalWholeBrainDisplay(nodes, true, isTemporalBrainContext, TEMPORAL_BRAIN_CONTEXT_NAME, TEMPORAL_BRAIN_CONTEXT_NAME)
    : brachialOverviewActive
    ? basalWholeBrainDisplay(nodes, true, isBrachialWholeBrainNode, BRACHIAL_WHOLE_BRAIN_NAME, BRACHIAL_WHOLE_BRAIN_NAME)
    : plexusHeartActive
    ? basalWholeBrainDisplay(nodes, true, isPlexusHeartNode, PLEXUS_HEART_CONTEXT_NAME, PLEXUS_HEART_CONTEXT_NAME)
    : olfactoryBrainActive
    ? basalWholeBrainDisplay(nodes, true, isOlfactoryBrainContext, OLFACTORY_BRAIN_CONTEXT_NAME, OLFACTORY_BRAIN_CONTEXT_NAME)
    : opticOccipitalActive
      ? basalWholeBrainDisplay(nodes, true, isOpticOccipitalContext, OPTIC_OCCIPITAL_CONTEXT_NAME, OPTIC_OCCIPITAL_CONTEXT_NAME)
      : basalWholeBrainDisplay(nodes, wholeBrainActive), [nodes, wholeBrainActive, whiteMatterActive, olfactoryBrainActive, opticOccipitalActive, plexusHeartActive, brachialOverviewActive, temporalBrainActive, thalamusBrainActive, view.skullBase, activeNerveId, isolatedRegionPath]);
  const wholeBrainMemberIds = wholeBrain.memberIds;
  const cerebellarDisplay = useMemo(() => brainstemCerebellumDisplay(view.brainstemCerebellum ? nodes : [],
    activeNerveId?.split('/') ?? isolatedRegionPath ?? BRAINSTEM_CEREBELLUM_ROOT),
  [view.brainstemCerebellum, nodes, activeNerveId, isolatedRegionPath]);
  // Thalamus grouping is for 3D picking, never a replacement for advanced rows.
  const menuNodes = view.thalamusCapsule ? nodes : view.brainstemCerebellum ? cerebellarDisplay.nodes : wholeBrain.nodes;
  const expandDisplayIds = useCallback((ids: readonly number[]) =>
    expandWholeBrainIds(expandCerebellarDisplayIds(ids, cerebellarDisplay.groups), wholeBrainMemberIds),
  [cerebellarDisplay.groups, wholeBrainMemberIds]);
  const selectNode = useCallback((id: number) => {
    if (view.thalamusCapsule) {
      if (thalamusBrainActive) clearSelection();
      setThalamusIndividualSelection(true);
      // Apply immediately so this very first sidebar pick is already individual.
      setSelectionGroup([]);
    }
    if (view.brainstemCerebellum) {
      const group = cerebellarDisplay.groups.find(g => g.memberIds.includes(id));
      setSelectionGroup(group?.memberIds ?? [], group?.name, cerebellarDisplay.groups);
    }
    selectRawNode(id);
    const path = isolatedRegionPath ?? activeNerveId?.split('/') ?? [];
    if (view.spinalCord && !view.spinalReferenceModelUid && path[2] === SPINAL_NERVE_PATH[2]) {
      // Menu selection frames only this structure without isolating it or
      // letting the long cord shell/context dictate the camera distance.
      void focusVisibleNodes([id], captureCamera(), true);
    }
  }, [view.thalamusCapsule, thalamusBrainActive, clearSelection, view.brainstemCerebellum, cerebellarDisplay.groups, setSelectionGroup, selectRawNode,
    view.spinalCord, view.spinalReferenceModelUid, isolatedRegionPath, activeNerveId, focusVisibleNodes, captureCamera]);
  const menuFadedNodeIds = useMemo(() => {
    const ids = new Set(fadedNodeIds);
    if (wholeBrain.representativeId !== null && wholeBrainMemberIds.some(id => ids.has(id))) {
      ids.add(wholeBrain.representativeId);
    }
    return ids;
  }, [fadedNodeIds, wholeBrain, wholeBrainMemberIds]);
  useEffect(() => {
    if (view.brainstemCerebellum) setSelectionGroup([], undefined, cerebellarDisplay.groups);
    else setSelectionGroup(wholeBrainMemberIds, view.skullBase ? WHOLE_CEREBELLUM_NAME : undefined);
  }, [setSelectionGroup, wholeBrainMemberIds, view.skullBase, view.brainstemCerebellum, cerebellarDisplay.groups]);

  const toggleNodeVisibility = useCallback((id: number, visible: boolean) => {
    if (isTopographicAtlas && visible) {
      const path = isolatedRegionPath ?? activeNerveId?.split('/') ?? [];
      const settings = topographicSettings(modelNodes, [id], path);
      settings.supportIds.forEach(id => headPetrosalSupportRef.current.add(id));
      setNodesVisibility([...new Set([id, ...settings.supportIds])], true, true, true);
      setCollectionContext(...headNeckContextArguments(settings, [id], true));
      return;
    }
    if ((limbTopography || view.neckTopography) && !visible) {
      // Explicitly hide in the renderer even if a parent command left its
      // actual visibility different from the local state.
      setNodesVisibility([id], false, true, true);
      return;
    }
    const cerebellarGroup = cerebellarDisplay.groups.find(g => g.memberIds.includes(id));
    if (cerebellarGroup) setNodesVisibility(cerebellarGroup.memberIds, visible, true);
    else if (wholeBrainMemberIds.includes(id)) {
      setNodesVisibility(wholeBrainMemberIds, visible, true, Boolean(view.skullBase && visible));
      if (view.skullBase && visible)
        setCollectionContext(wholeBrainMemberIds, true, false, undefined, wholeBrainMemberIds);
    }
    else if ((view.musculoskeletal || view.skullBase || view.autonomicNerves) && visible) {
      const path = isolatedRegionPath ?? activeNerveId?.split('/') ?? [];
      const supportIds = view.skullBase ? petrosalAutonomicShowSupportIds(nodes, [id], path) : [];
      const shownIds = [...new Set([id, ...supportIds])];
      setNodesVisibility(shownIds, true, true, true);
      if (view.skullBase) {
        const node = nodes.find(node => node.instanceID === id);
        if (supportIds.length) {
          const retainedContext = new Set(petrosalAutonomicShowContextIds(nodes, [id], path));
          const contextIds = nodes.filter(n => shownIds.includes(n.instanceID)
            && (isSkullBaseContext(n) || retainedContext.has(n.instanceID))).map(n => n.instanceID);
          setCollectionContext(contextIds, true, true, shownIds.filter(shown => !contextIds.includes(shown)), contextIds);
        } else if (node && (isSkullBaseContext(node) || isSellarTransparentContext(node, path)))
          setCollectionContext([id], true, false, undefined, [id]);
      }
    }
    else toggleRawNodeVisibility(id, visible);
  }, [isTopographicAtlas, topographicSettings, modelNodes, limbTopography, view.neckTopography, view.musculoskeletal, view.skullBase, view.autonomicNerves, nodes, setCollectionContext, wholeBrainMemberIds, cerebellarDisplay.groups, setNodesVisibility,
    toggleRawNodeVisibility, activeNerveId, isolatedRegionPath]);

  const thalamusSelectionProps = view.thalamusCapsule ? {
    selectedDisplayNode: wholeBrain.nodes.find(node => node.instanceID === selectedNodeId),
    onSetSelectedVisibility: toggleNodeVisibility,
  } : {};

  const handleMixCategoriesChange = useCallback((enabled: boolean) => {
    if (enabled) {
      const focused = retainCurrentIsolation();
      if (focused && !regionIsolationRef.current) {
        regionIsolationRef.current = { path: [], ...focused };
        setIsolatedRegionPath([]);
      }
    }
    // Turning mixing off leaves the current composition untouched. The next
    // isolation replaces it as usual; only explicit Restore restores a scene.
    setMixCategories(enabled);
  }, [retainCurrentIsolation]);

  const restoreRegionIsolation = useCallback(() => {
    const isolation = regionIsolationRef.current;
    if (!isolation) {
      setCollectionContext(view.brainstemCerebellum ? brainstemCerebellumContextIds(nodes, BRAINSTEM_CEREBELLUM_ROOT)
        : view.skullBase ? nodes.filter(isSkullBaseContext).map(node => node.instanceID) : [], false, false, undefined, [], [], Boolean(view.brainstemCerebellum));
      return false;
    }
    // Explicitly leaving a collection must unwind any nested mesh focus first.
    exitIsolation();
    if (view.brachialPlexus && ['trunks', 'divisions', 'cords'].includes(activeNerveId?.split('/').at(-1) ?? '')) clearSelection();
    setCollectionContext(view.brainstemCerebellum ? brainstemCerebellumContextIds(nodes, BRAINSTEM_CEREBELLUM_ROOT)
      : view.skullBase ? nodes.filter(isSkullBaseContext).map(node => node.instanceID) : [], false, false, undefined, [], [], Boolean(view.brainstemCerebellum));
    const parent = view.musculoskeletal ? isolation.parent ?? null : null;
    regionIsolationRef.current = parent;
    setIsolatedRegionPath(parent?.path ?? null);
    if (view.musculoskeletal) setActiveNerveId(parent?.path.slice(0, 3).join('/') ?? null);
    if (isTopographicAtlas || view.skullBase || view.brachialPlexus || view.lumbosacralPlexus || view.longTracts || view.thalamusCapsule || view.temporalAssociation || view.brainstemCerebellum) setActiveNerveId(null);
    const show: number[] = [];
    const hide: number[] = [];
    isolation.visibility.forEach((visible, id) => (visible ? show : hide).push(id));
    setNodesVisibility(show, true, false);
    setNodesVisibility(hide, false, false);
    restoreCamera(isolation.camera);
    return true;
  }, [exitIsolation, setNodesVisibility, restoreCamera, setCollectionContext, view.skullBase, nodes, view.musculoskeletal, view.brachialPlexus, view.lumbosacralPlexus, view.longTracts, view.thalamusCapsule, view.temporalAssociation, view.brainstemCerebellum, isTopographicAtlas, activeNerveId, clearSelection]);

  const isolateRegion = useCallback((path: readonly string[]) => {
    const isolationNodes = isTopographicAtlas ? modelNodes
      : view.musculoskeletal || view.brachialPlexus || view.lumbosacralPlexus || view.longTracts || view.thalamusCapsule || view.temporalAssociation || view.brainstemCerebellum ? modelNodes : nodes;
    const planPath = view.musculoskeletal ? cleanMusculoskeletalPath(path) : path;
    const pathForNode = isTopographicAtlas
      ? (node: SceneNode) => topographicPathForGroup(node, path)
      : view.spinalCord
      ? (node: SceneNode) => view.spinalReferenceModelUid ? spinalReferencePath(view.spinalReferenceModelUid) : spinalCordPathForGroup(node, path)
      : view.musculoskeletal
      ? (node: SceneNode) => musculoskeletalIsolationPathForGroup(node, path)
      : path[1] === 'cranial-nerves'
      ? (node: SceneNode) => cranialNervePathForGroup(node, path)
      : path[0] === ADVANCED_NEUROANATOMY_ROOT
      ? (node: SceneNode) => advancedNeuroanatomyPathForGroup(node, path)
      : regionPathForNode;
    const plan = planRegionIsolation(isolationNodes,
      path[0] === ADVANCED_NEUROANATOMY_ROOT ? 'nervous' : selectedSystemId, planPath, pathForNode,
      view.upperLimbTopography ? node => Boolean(topographicPathForGroup(node, UPPER_LIMB_TOPOGRAPHY_ROOT))
        : view.lowerLimbTopography ? node => Boolean(topographicPathForGroup(node, LOWER_LIMB_TOPOGRAPHY_ROOT)) : undefined);
    if (!plan) return;
    const headSettings = topographicSettings(isolationNodes, plan.show, path);
    headPetrosalSupportRef.current = new Set([
      ...(mixCategories ? headPetrosalSupportRef.current : []), ...headSettings.supportIds,
    ]);
    const retainedHead = new Set(headSettings.supportIds);
    plan.show = [...new Set([...plan.show, ...retainedHead])];
    plan.hide = plan.hide.filter(id => !retainedHead.has(id));
    // A newly chosen collection must not retain a selection from outside it.
    // Clear it here, during navigation, rather than on later visibility edits.
    const selected = nodes.find((node) => node.instanceID === selectedNodeId);
    // Drop selection's saved purple material before another category changes
    // that segment to its original color (possibly as transparent context).
    const coloredCategory = activeNerveId?.split('/').at(-1);
    if (view.brachialPlexus && path[2] !== coloredCategory && selected
      && ((coloredCategory === 'trunks' && isBrachialTrunkName(selected.rawName))
        || (coloredCategory === 'divisions' && brachialTrunkContextPart(selected.rawName) === 'divisions')
        || (coloredCategory === 'cords' && brachialTrunkContextPart(selected.rawName) === 'cords'))) clearSelection();
    if (!mixCategories && selected && !(view.spinalCord || isTopographicAtlas
      ? pathForNode(selected)?.slice(0, path.length).join('/') === path.join('/')
      : isNodeInRegion(selected, planPath, view.musculoskeletal || isTopographicAtlas ? pathForNode : regionPathForNode))) clearSelection();
    if (!mixCategories) exitIsolation();
    const previous = regionIsolationRef.current;
    const camera = view.musculoskeletal ? captureCamera() : previous?.camera ?? captureCamera();
    regionIsolationRef.current = view.musculoskeletal
      ? captureRegionIsolation(isolationNodes, path, camera, previous) : {
      path: [...path],
      visibility: new Map(plan.affected.map((node) =>
        [node.instanceID, previous?.visibility.get(node.instanceID) ?? node.visible])),
      camera,
    };
    if (mixCategories) {
      regionIsolationRef.current.visibility = new Map(isolationNodes.map((node) =>
        [node.instanceID, previous?.visibility.get(node.instanceID) ?? node.visible]));
    }
    setIsolatedRegionPath([...path]);
    if (!mixCategories) setNodesVisibility(plan.hide, false, false, Boolean(limbTopography || view.neckTopography));
    if (isTopographicAtlas && mixCategories)
      setNodesVisibility([...anteriorNeckHiddenLayerIds(isolationNodes, path),
        ...neckAnteriorHiddenLayerIds(isolationNodes, path),
        ...lateralNeckHiddenLayerIds(isolationNodes, path)], false, false);
    // Panel flags default to visible even when source geometry or its parent
    // groups are masked. Explicitly synchronize focused atlases, including
    // brainstem meshes such as the source-hidden right MLF, with the renderer.
    setNodesVisibility(plan.show, true, false, view.musculoskeletal
       || ['skull-base', 'head-neck-topography', 'neck-topography', 'upper-limb-topography', 'lower-limb-topography', 'brachial-plexus', 'lumbar-sacral-plexuses', 'long-tracts', 'thalamus-internal-capsule', 'white-matter', 'brainstem-and-cerebellum'].includes(path[1]));
    if (view.musculoskeletal && path[2] === 'neck') {
      const boneIds = new Set(isolationNodes.filter(node => classifyMusculoskeletalNode(node.rawName)
        .some(entry => entry.category === 'bones' && entry.regions.includes('neck'))).map(node => node.instanceID));
      setCollectionContext(plan.show.filter(id => boneIds.has(id)), mixCategories, true,
        plan.show.filter(id => !boneIds.has(id)), [], [], false, [...boneIds]);
    } else if (isTopographicAtlas) {
      setCollectionContext(...headNeckContextArguments(headSettings, plan.show, mixCategories));
    } else if (path[1] === 'skull-base') {
      const contextIds = skullBaseContextIds(nodes, path);
      setCollectionContext(contextIds, mixCategories, true, plan.show.filter(id => !contextIds.includes(id)),
        contextIds);
    } else if (path[1] === 'cranial-nerves') {
      const contextIds = cranialNerveContextIds(nodes, path);
      if (path[2] === 'viii') {
        setCollectionContext(contextIds, mixCategories, true, cranialNerveForegroundIds(nodes, path),
          nodes.filter(node => contextIds.includes(node.instanceID) && cochlearBasalGangliaName(node.rawName)).map(node => node.instanceID));
      } else {
        setCollectionContext(contextIds, mixCategories, true, cranialNerveForegroundIds(nodes, path));
      }
    } else if (path[1] === 'autonomic-nervous-system') {
      setCollectionContext(autonomicContextIds(nodes, path), mixCategories, true, autonomicForegroundIds(nodes, path));
    } else if (path[1] === 'brachial-plexus') {
      setCollectionContext(brachialContextIds(nodes, path), mixCategories, true, brachialForegroundIds(nodes, path),
        [], [...brachialTrunkColorNodes(nodes, path), ...brachialDivisionColorNodes(nodes, path), ...brachialCordColorNodes(nodes, path)]);
    } else if (path[1] === 'lumbar-sacral-plexuses') {
      setCollectionContext(lumbosacralContextIds(nodes, path), mixCategories, true, lumbosacralForegroundIds(nodes, path));
    } else if (view.brainstemCerebellum && path[1] === BRAINSTEM_CEREBELLUM_ROOT[1]) {
      setCollectionContext(brainstemCerebellumContextIds(isolationNodes, path), mixCategories, false, undefined, [], [], true);
    } else if (view.brainGrossAnatomy && path[1] === 'brainstem') {
      setCollectionContext(brainstemContextIds(nodes, path), mixCategories, false, undefined, [], [], true);
    } else if (path[1] === 'thalamus-internal-capsule') {
      setCollectionContext(thalamusCapsuleContextIds(isolationNodes, path), mixCategories, false, undefined, [], [], true);
    } else if (path[1] === 'temporal-stem-sagittal-stratum') {
      setCollectionContext(temporalAssociationContextIds(isolationNodes, path), mixCategories, false, undefined, [], [], true);
    } else if (view.spinalCord && path[2] === SPINAL_NERVE_PATH[2]) {
      // Opt in only the cord's white-matter shell to the shared transparent
      // context clones. Roots, gray matter and source colors remain unchanged.
      setCollectionContext(spinalRootContextIds(nodes, path), mixCategories, false, undefined, [], [], true);
    } else if (path[1] === 'long-tracts') {
      // Only the explicitly requested brainstem surfaces may change opacity;
      // all pathway/nuclear source materials remain untouched.
      setCollectionContext(longTractContextIds(nodes, path), mixCategories, false, undefined, [], [], true);
    } else if (isWhiteMatterPath(path)) {
      const contextIds = whiteMatterContextIds(nodes, path);
      setCollectionContext(contextIds, mixCategories, true, plan.show.filter(id => !contextIds.includes(id)));
    } else {
      const contextIds = ['basal-forebrain', 'ventricular-system'].includes(path[1])
        ? nodes.filter(node => plan.show.includes(node.instanceID) && isBasalForebrainContext(node)).map(node => node.instanceID)
        : [];
      setCollectionContext(contextIds, mixCategories);
    }
    const brachialTargets = brachialCameraTargets(nodes, path);
    const spinalTopographic = view.spinalCord && !view.spinalReferenceModelUid
      && path[2] === SPINAL_TOPOGRAPHIC_PATH[2];
    const rootTargets = view.spinalCord && !view.spinalReferenceModelUid
      ? spinalRootCameraTargets(nodes, path) : null;
    const focusIds = rootTargets ?? (spinalTopographic ? plan.show : brachialTargets ?? (mixCategories
      ? [...new Set([...nodes.filter((node) => node.visible).map((node) => node.instanceID), ...plan.show])]
      : plan.show));
    const preserveBackArrangement = view.musculoskeletal && planPath[2] === 'back'
      && planPath[3] === 'muscles' && ['superficial', 'intermediate', 'deep'].includes(planPath[4]);
    if (!preserveBackArrangement && (view.musculoskeletal || mixCategories || path[0] === ADVANCED_NEUROANATOMY_ROOT)) void focusVisibleNodes(focusIds, camera, brachialTargets !== null || spinalTopographic || rootTargets !== null).then(() => {
      if (view.spinalCord && regionIsolationRef.current?.path.join('/') === path.join('/')) {
        // Always start from a fresh collection fit, so revisiting any topographic
        // subcategory cannot accumulate zoom. Other mixed categories do not
        // enlarge the fit of the spinal section.
        if (spinalTopographic) void setAnatomicalView('superior', 0.65);
        else if (path[2] === SPINAL_NERVE_PATH[2]) void setAnatomicalView('profile');
      }
    });
  }, [nodes, modelNodes, view.spinalCord, view.spinalReferenceModelUid, view.musculoskeletal, view.brainGrossAnatomy, view.brachialPlexus, view.lumbosacralPlexus, view.longTracts, view.thalamusCapsule, view.temporalAssociation, view.brainstemCerebellum, isTopographicAtlas, topographicPathForGroup, topographicSettings, activeNerveId, selectedSystemId, selectedNodeId, clearSelection, exitIsolation, captureCamera, focusVisibleNodes, setAnatomicalView, setNodesVisibility, mixCategories, setCollectionContext]);

  const lastUpperLimbOptions = useRef({ side: upperLimbSide, muscles: upperLimbMuscles });
  useEffect(() => {
    const previous = lastUpperLimbOptions.current;
    lastUpperLimbOptions.current = { side: upperLimbSide, muscles: upperLimbMuscles };
    if (!view.upperLimbTopography || (previous.side === upperLimbSide && previous.muscles === upperLimbMuscles)) return;
    if (previous.side !== upperLimbSide) {
      const opposite = modelNodes.filter(node => isNodeAllowedInAtlasView(node, view)
        && !upperLimbPathForGroup(node, UPPER_LIMB_TOPOGRAPHY_ROOT, upperLimbSide));
      if (opposite.length) setNodesVisibility(opposite.map(node => node.instanceID), false, false);
    }
    if (previous.muscles && !upperLimbMuscles)
      setCollectionContext([], false, false, undefined, [], [], true, []);
    isolateRegion(isolatedRegionPath ?? activeNerveId?.split('/') ?? UPPER_LIMB_TOPOGRAPHY_ROOT);
  }, [view, upperLimbSide, upperLimbMuscles, isolatedRegionPath, activeNerveId, isolateRegion, modelNodes, setNodesVisibility, setCollectionContext]);
  const lastLowerLimbSide = useRef(lowerLimbSide);
  useEffect(() => {
    const previous = lastLowerLimbSide.current;
    lastLowerLimbSide.current = lowerLimbSide;
    if (!view.lowerLimbTopography || previous === lowerLimbSide) return;
    const outside = modelNodes.filter(node => node.visible
      && !lowerLimbPathForGroup(node, LOWER_LIMB_TOPOGRAPHY_ROOT, lowerLimbSide));
    if (outside.length) setNodesVisibility(outside.map(node => node.instanceID), false, false, true);
    isolateRegion(isolatedRegionPath ?? activeNerveId?.split('/') ?? LOWER_LIMB_TOPOGRAPHY_ROOT);
  }, [view, lowerLimbSide, isolatedRegionPath, activeNerveId, isolateRegion, modelNodes, setNodesVisibility]);

  const initialSpinalViewDone = useRef(false);
  useEffect(() => {
    const requested = initialSpinalPath.current;
    if (!view.spinalCord || view.spinalReferenceModelUid || initialSpinalViewDone.current
      || !requested || !isViewerReady || !materialsReady || apiMode !== 'api' || !modelNodes.length) return;
    initialSpinalViewDone.current = true;
    isolateRegion(requested);
  }, [view.spinalCord, view.spinalReferenceModelUid, isViewerReady, materialsReady, apiMode, modelNodes.length, isolateRegion]);

  // Selection and browsing never restore visibility. Users may inspect hidden
  // nuclei and Show them alongside their current isolated structures; only an
  // explicit Restore or a new isolation changes the composition.
  const synchronizeSelection = useCallback(() => {
    if (selectedNodeId === null) {
      previousSelectedId.current = null;
      return;
    }
    if (previousSelectedId.current === selectedNodeId) return;
    const selected = nodes.find((node) => node.instanceID === selectedNodeId);
    if (selected) {
      previousSelectedId.current = selectedNodeId;
      setSelectedSystemId(selected.systemId ?? 'nervous');
    }
  }, [selectedNodeId, nodes]);

  useEffect(synchronizeSelection, [synchronizeSelection]);

  const handleSystemSelect = useCallback((id: SystemGroupId) => {
    setAdvancedCollectionRequest(null);
    if (id === selectedSystemId && !advancedCollectionRequest) return;
    if (advancedCollectionRequest) setNeuroanatomyMode('standard');
    if (!mixCategories) {
      restoreRegionIsolation();
      exitIsolation();
    }
    clearSelection();
    setSelectedSystemId(id);
  }, [selectedSystemId, advancedCollectionRequest, restoreRegionIsolation, exitIsolation, clearSelection, mixCategories]);

  const handleAdvancedCollectionSelect = useCallback((id: string) => {
    const collection = ADVANCED_ATLAS_COLLECTIONS.find((entry) => entry.id === id)
      ?? (id === MENINGES_ATLAS_COLLECTION.id ? MENINGES_ATLAS_COLLECTION
        : id === LIMBIC_ATLAS_COLLECTION.id ? LIMBIC_ATLAS_COLLECTION
          : id === BASAL_FOREBRAIN_ATLAS_COLLECTION.id ? BASAL_FOREBRAIN_ATLAS_COLLECTION
            : id === VENTRICULAR_ATLAS_COLLECTION.id ? VENTRICULAR_ATLAS_COLLECTION : undefined);
    if (!collection) return;
    clearSelection();
    setSelectedSystemId('nervous');
    setNeuroanatomyMode('advanced');
    setAdvancedCollectionRequest((current) => ({ id, revision: (current?.revision ?? 0) + 1 }));
    // In a mixed view, image cards only choose which menu to browse. Adding a
    // whole collection is an explicit Add/Show action, never a navigation side effect.
    if (!mixCategories) isolateRegion(collection.path);
  }, [clearSelection, isolateRegion, mixCategories]);

  const handleAtlasSystemSelect = useCallback((id: SystemGroupId) => {
    if (!view.brainGrossAnatomy || id !== 'nervous') {
      handleSystemSelect(id);
      return;
    }
    clearSelection();
    setSelectedSystemId('nervous');
    setAdvancedCollectionRequest(null);
    setNeuroanatomyMode('standard');
    // Browsing must not change a mixed composition. Normal category selection
    // focuses precisely the gross brain models, not all nervous structures.
    if (!mixCategories) isolateRegion(BRAIN_GROSS_ANATOMY_PATH);
  }, [view, handleSystemSelect, clearSelection, mixCategories, isolateRegion]);

  const handleActivateNerve = useCallback((path: readonly string[]) => {
    if (view.thalamusCapsule) {
      clearSelection();
      setSelectionGroup([]);
      setThalamusIndividualSelection(false);
    }
    // Release grouped context highlights when leaving their teaching view.
    if (((olfactoryBrainActive && path[2] !== 'i') || (opticOccipitalActive && path[2] !== 'ii')
      || (plexusHeartActive && path[2] !== 'plexuses') || (brachialOverviewActive && path[2] !== 'overview')
      || (temporalBrainActive && !isTemporalBrainContextPath(path))) && selectedNodeId !== null
      && wholeBrainMemberIds.includes(selectedNodeId)) clearSelection();
    setActiveNerveId(path.slice(0, view.headNeckTopography ? 4 : 3).join('/'));
    // Mixing keeps the prior composition; activation adds the nerve via the shared isolation path.
    isolateRegion(path);
  }, [isolateRegion, view.thalamusCapsule, setSelectionGroup, view.headNeckTopography, olfactoryBrainActive, opticOccipitalActive, plexusHeartActive, brachialOverviewActive, temporalBrainActive, selectedNodeId, wholeBrainMemberIds, clearSelection]);
  const initialCranialFrameDone = useRef(false);
  const initialSkullBaseContextDone = useRef(false);
  useEffect(() => {
    if (!view.skullBase || initialSkullBaseContextDone.current || apiMode !== 'api'
      || !isViewerReady || !materialsReady || !nodes.length) return;
    initialSkullBaseContextDone.current = true;
    const contextIds = nodes.filter(isSkullBaseContext).map(node => node.instanceID);
    setCollectionContext(contextIds, false, true,
      nodes.filter(node => !isSkullBaseContext(node)).map(node => node.instanceID), contextIds);
  }, [view.skullBase, apiMode, isViewerReady, materialsReady, nodes, setCollectionContext]);
  const initialLongTractContextDone = useRef(false);
  const initialBrainstemCerebellumDone = useRef(false);
  useEffect(() => {
    if (!view.brainstemCerebellum || initialBrainstemCerebellumDone.current || apiMode !== 'api'
      || !isViewerReady || !materialsReady || !modelNodes.length) return;
    initialBrainstemCerebellumDone.current = true;
    const shown = modelNodes.filter(n => brainstemCerebellumPathForGroup(n, BRAINSTEM_CEREBELLUM_ROOT)).map(n => n.instanceID);
    const showSet = new Set(shown);
    setNodesVisibility(modelNodes.filter(n => !showSet.has(n.instanceID)).map(n => n.instanceID), false, false);
    setNodesVisibility(shown, true, false);
    setCollectionContext(brainstemCerebellumContextIds(modelNodes, BRAINSTEM_CEREBELLUM_ROOT), false, false, undefined, [], [], true);
    void focusVisibleNodes(shown, captureCamera());
  }, [view.brainstemCerebellum, apiMode, isViewerReady, materialsReady, modelNodes, setNodesVisibility, setCollectionContext, focusVisibleNodes, captureCamera]);
  const initialHeadNeckDone = useRef(false);
  useEffect(() => {
    // Strict startup scope: hide all geometry outside source-backed head and
    // neck anatomy (including meshes absent from the scoped menu nodes).
    if (!isTopographicAtlas || initialHeadNeckDone.current || apiMode !== 'api'
      || !isViewerReady || !materialsReady || !modelNodes.length) return;
    initialHeadNeckDone.current = true;
    const excluded = modelNodes.filter(node => !isNodeAllowedInAtlasView(node, view)).map(node => node.instanceID);
    if (excluded.length) setNodesVisibility(excluded, false, false);
    const included = modelNodes.filter(node => isNodeAllowedInAtlasView(node, view)).map(node => node.instanceID);
    setNodesVisibility(included, true, false, true);
    // Default bone-only refraction is also retained by the shared context
    // setter when changing regions, restoring a view or showing all anatomy.
    setCollectionContext([]);
  }, [view, isTopographicAtlas, apiMode, isViewerReady, materialsReady, modelNodes, setNodesVisibility, setCollectionContext]);
  const initialThalamusContextDone = useRef(false);
  useEffect(() => {
    if (!view.thalamusCapsule || initialThalamusContextDone.current || apiMode !== 'api'
      || !isViewerReady || !materialsReady || !modelNodes.length) return;
    initialThalamusContextDone.current = true;
    setCollectionContext(thalamusCapsuleContextIds(modelNodes, THALAMUS_CAPSULE_ROOT_PATH), false, false, undefined, [], [], true);
  }, [view.thalamusCapsule, apiMode, isViewerReady, materialsReady, modelNodes, setCollectionContext]);
  useEffect(() => {
    // Spinal startup leaves the source opening untouched unless the user chose
    // a collection. Never apply the separate whole-pathway overview here.
    if (!view.longTracts || view.spinalCord || initialLongTractContextDone.current || apiMode !== 'api'
      || !isViewerReady || !materialsReady || !modelNodes.length) return;
    initialLongTractContextDone.current = true;
    const contextIds = longTractContextIds(modelNodes, LONG_TRACT_ROOT_PATH);
    setNodesVisibility(contextIds, true, false, true);
    setCollectionContext(contextIds, false, false, undefined, [], [], true);
  }, [view.longTracts, view.spinalCord, apiMode, isViewerReady, materialsReady, modelNodes, setNodesVisibility, setCollectionContext]);
  useEffect(() => {
    // Autonomic startup keeps Sketchfab's full-model opening camera animation.
    if (!view.cranialNerves || !cranialOverview || initialCranialFrameDone.current || apiMode !== 'api'
      || !isViewerReady || !materialsReady || !modelNodes.length) return;
    initialCranialFrameDone.current = true;
    // No startup isolation or opacity changes: fit the complete visible model.
    // The shared fitter waits for viewer commands and cancels on a later nerve focus.
    void focusVisibleNodes(modelNodes.filter(node => node.visible).map(node => node.instanceID), Promise.resolve(null));
  }, [view.cranialNerves, cranialOverview, apiMode, isViewerReady, materialsReady, modelNodes, focusVisibleNodes]);

  const handleClearSelection = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const handleRestorePreviousView = useCallback(() => {
    restorePreviousIsolation(isolatedNodeId !== null, exitIsolation, restoreRegionIsolation);
  }, [isolatedNodeId, exitIsolation, restoreRegionIsolation]);

  const handleFocusStructure = useCallback((id: number, withContext = true) => {
    if (view.brainstemCerebellum) {
      const group = cerebellarDisplay.groups.find(g => g.memberIds.includes(id));
      setSelectionGroup(group?.memberIds ?? [], group?.name, cerebellarDisplay.groups);
    }
    if (!mixCategories) {
      if (isTopographicAtlas) {
        const path = isolatedRegionPath ?? activeNerveId?.split('/') ?? [];
        const settings = topographicSettings(modelNodes, [id], path);
        settings.supportIds.forEach(id => headPetrosalSupportRef.current.add(id));
        void focusWithContext(id, withContext).then(() => {
          if (!settings.supportIds.length && !settings.contextIds.length) return;
          if (settings.supportIds.length) setNodesVisibility(settings.supportIds, true, false, true);
          setCollectionContext(...headNeckContextArguments(settings, [id], true));
        });
      } else void focusWithContext(id, withContext);
      return;
    }
    if (!nodes.some((node) => node.instanceID === id)) return;
    const previous = regionIsolationRef.current;
    const camera = previous?.camera ?? captureCamera();
    regionIsolationRef.current = {
      path: previous?.path ?? [],
      visibility: new Map(nodes.map((node) =>
        [node.instanceID, previous?.visibility.get(node.instanceID) ?? node.visible])),
      camera,
    };
    setIsolatedRegionPath(regionIsolationRef.current.path);
    const ids = expandDisplayIds([id]);
    const settings = isTopographicAtlas
      ? topographicSettings(modelNodes, ids, isolatedRegionPath ?? activeNerveId?.split('/') ?? [])
      : { supportIds: [], contextIds: [] };
    settings.supportIds.forEach(id => headPetrosalSupportRef.current.add(id));
    ids.push(...settings.supportIds.filter(id => !ids.includes(id)));
    setNodesVisibility(ids, true, false, Boolean(isTopographicAtlas || view.brainstemCerebellum));
    if (isTopographicAtlas)
      setCollectionContext(...headNeckContextArguments(settings, ids, true));
    const visible = [...new Set([...nodes.filter((node) => node.visible).map((node) => node.instanceID), ...ids])];
    void focusVisibleNodes(visible, camera);
  }, [mixCategories, nodes, captureCamera, setNodesVisibility, focusVisibleNodes, focusWithContext, wholeBrainMemberIds, expandDisplayIds, view.brainstemCerebellum, cerebellarDisplay.groups, setSelectionGroup, isTopographicAtlas, topographicSettings, modelNodes, isolatedRegionPath, activeNerveId, setCollectionContext]);

  const handleIsolateSelected = useCallback(() => {
    if (selectedNodeId === null || isFocusing) return;
    if (!mixCategories && isolatedNodeId === selectedNodeId && !isolatedWithContext) {
      exitIsolation();
    } else {
      // The viewer snapshots the current collection, not the full system.
      handleFocusStructure(selectedNodeId, false);
    }
  }, [selectedNodeId, isFocusing, isolatedNodeId, isolatedWithContext, exitIsolation, handleFocusStructure, mixCategories]);

  const handleSystemVisibility = useCallback((ids: number[], visible: boolean, requestedPath?: readonly string[]) => {
    const petrosalPath = requestedPath ?? isolatedRegionPath ?? activeNerveId?.split('/')
      ?? advancedCollectionRequest?.id.split('/') ?? [];
    const skullBaseActive = Boolean(view.skullBase || petrosalPath[1] === 'skull-base');
    const headSettings = topographicSettings(modelNodes, visible ? ids : [], petrosalPath);
    if (visible) headSettings.supportIds.forEach(id => headPetrosalSupportRef.current.add(id));
    const supportIds = visible && skullBaseActive ? petrosalAutonomicShowSupportIds(nodes, ids, petrosalPath) : headSettings.supportIds;
    const hiddenLayers = visible && isTopographicAtlas
      ? [...anteriorNeckHiddenLayerIds(modelNodes, petrosalPath),
        ...neckAnteriorHiddenLayerIds(modelNodes, petrosalPath),
        ...lateralNeckHiddenLayerIds(modelNodes, petrosalPath)] : [];
    const hiddenLayerSet = new Set(hiddenLayers);
    const shownIds = [...new Set([...ids, ...supportIds])].filter(id => !hiddenLayerSet.has(id));
    if (hiddenLayers.length) setNodesVisibility(hiddenLayers, false, false);
    setNodesVisibility(shownIds, visible, true, Boolean((skullBaseActive || isTopographicAtlas || view.musculoskeletal || view.autonomicNerves || whiteMatterActive || view.brainstemCerebellum) && visible));
    if (visible && isTopographicAtlas)
      setCollectionContext(...headNeckContextArguments(headSettings, shownIds, true));
    if (visible && skullBaseActive) {
      const retainedContext = new Set(petrosalAutonomicShowContextIds(nodes, ids, petrosalPath));
      const contextIds = nodes.filter(node => shownIds.includes(node.instanceID)
        && (isSkullBaseContext(node) || isSellarTransparentContext(node, petrosalPath)
          || retainedContext.has(node.instanceID))).map(node => node.instanceID);
      setCollectionContext(contextIds, true, true, shownIds.filter(id => !contextIds.includes(id)), contextIds);
    }
    if (visible && whiteMatterActive) {
      const contextIds = whiteMatterContextIds(nodes, ['advanced-neuroanatomy', 'white-matter']).filter(id => ids.includes(id));
      if (contextIds.length) setCollectionContext(contextIds, true, true, ids.filter(id => !contextIds.includes(id)));
    }
    if (visible && (advancedCollectionRequest?.id === 'advanced-neuroanatomy/brainstem'
      || (!advancedCollectionRequest && isolatedRegionPath?.[1] === 'brainstem'))) {
      const contextIds = brainstemShowContextIds(nodes, ids);
      if (contextIds.length) {
        setNodesVisibility(contextIds, true);
        setCollectionContext(contextIds, true, false, undefined, [], [], true);
      }
    }
    if (visible && ['advanced-neuroanatomy/basal-forebrain', 'advanced-neuroanatomy/ventricular-system'].includes(advancedCollectionRequest?.id ?? '')) {
      const contextIds = nodes.filter(node => ids.includes(node.instanceID) && isBasalForebrainContext(node)).map(node => node.instanceID);
      if (contextIds.length) setCollectionContext(contextIds, true);
    }
  }, [modelNodes, view.skullBase, isTopographicAtlas, topographicSettings, view.musculoskeletal, view.autonomicNerves, view.brainstemCerebellum, setNodesVisibility, nodes, advancedCollectionRequest, activeNerveId, isolatedRegionPath, setCollectionContext, whiteMatterActive]);

  const handleRegionVisibility = useCallback((ids: number[], visible: boolean, path?: readonly string[]) => {
    handleSystemVisibility(view.thalamusCapsule ? ids : expandDisplayIds(ids), visible, path);
    if (visible && view.brainstemCerebellum) {
      const requested = path ?? isolatedRegionPath ?? activeNerveId?.split('/') ?? BRAINSTEM_CEREBELLUM_ROOT;
      setCollectionContext(brainstemCerebellumContextIds(nodes, requested), true, false, undefined, [], [], true);
    }
  }, [handleSystemVisibility, expandDisplayIds, view.thalamusCapsule, view.brainstemCerebellum, isolatedRegionPath, activeNerveId, nodes, setCollectionContext]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't fire when typing in an input / search box
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return;
      // Non-Latin layouts can report "я"/"з" rather than "z". Use the
      // physical key only in that case; do not turn AZERTY Cmd+W into undo.
      const key = /^[a-z]$/i.test(e.key) || e.key === 'Escape'
        ? e.key.toLowerCase()
        : e.code?.match(/^Key([A-Z])$/)?.[1].toLowerCase() ?? e.key.toLowerCase();
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey
        && (key === 'f' || (key === 'escape' && isFullscreen))) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        if (!e.repeat) void toggleFullscreen();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && key === 'z') {
        // Own this shortcut even with empty history or a repeated keydown.
        // Otherwise it can reach browser/embedded-host shortcuts.
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        if (!e.repeat) {
          undoLastHide(view.musculoskeletal || view.skullBase || isTopographicAtlas ? undefined : selectedSystemId);
        }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (key) {
        case 'i':
          if (!e.repeat) handleIsolateSelected();
          break;
        case 'r':
          if (!e.repeat) handleRestorePreviousView();
          break;
        case 'h':
          if (!e.repeat && selectedNodeId !== null) {
            const node = nodes.find((n) => n.instanceID === selectedNodeId);
            if ((node && (node.visible || limbTopography || view.neckTopography)) || (wholeBrainMemberIds.includes(selectedNodeId)
              && nodes.some(member => wholeBrainMemberIds.includes(member.instanceID) && member.visible))) {
              toggleNodeVisibility(selectedNodeId, false);
            }
          }
          break;
        case 'a':
          if (e.repeat) break;
          restoreRegionIsolation();
          exitIsolation();
          if (view.systemIds) setNodesVisibility(nodes.filter(node => !view.musculoskeletal
            || !classifyMusculoskeletalNode(node.rawName).some(entry => entry.category === 'attachments'))
            .map((node) => node.instanceID), true);
          else showAllNodes();
          unfadeAllNodes();
          break;
        default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
    },
    [selectedNodeId, selectedSystemId, isolatedNodeId, nodes, wholeBrainMemberIds, view, isTopographicAtlas, setNodesVisibility, toggleNodeVisibility, showAllNodes, unfadeAllNodes, undoLastHide, exitIsolation, restoreRegionIsolation, handleRestorePreviousView, isFullscreen, toggleFullscreen, handleIsolateSelected],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  const selectedDisplay = menuNodes.find(node => node.instanceID === selectedNodeId);
  const selectedSystemLabel = ANATOMICAL_SYSTEMS.find(system => system.id === selectedDisplay?.systemId)?.label;
  const collectionNav = isNerveAtlas
    ? <FocusedNerveMenu {...brachialMenuProps} variant="strip" nodes={nodes} activeNerveId={activeNerveId} onActivateNerve={handleActivateNerve}
        mixCategories={mixCategories} disabled={!isViewerReady || !materialsReady || apiMode !== 'api'} isolatedRegionPath={isolatedRegionPath}
        onIsolateRegion={isolateRegion} onRestoreRegion={restoreRegionIsolation} onSetRegionVisibility={handleRegionVisibility}
        selectedNodeId={selectedNodeId} />
    : <SystemToolbar
                  nodes={nodes}
                  systemIds={view.systemIds}
                  showAdvancedCollections={Boolean(view.showAdvancedCollections)}
                  excludedNeuroanatomyGroupIds={atlasMenuGroupExclusions(view)}
                  brainGrossAnatomy={view.brainGrossAnatomy}
                  selectedCollectionId={advancedCollectionRequest?.id}
                  onSelectCollection={handleAdvancedCollectionSelect}
                  selectedSystemId={selectedSystemId}
                  onSelect={handleAtlasSystemSelect}
                  onSetVisibility={handleSystemVisibility}
                />;
  const mobileCollectionNav = React.cloneElement(collectionNav, { compact: true });
  const fullscreenMenus = <>
            {isNerveAtlas && (
              <FocusedNerveMenu {...brachialMenuProps} {...thalamusSelectionProps} variant="fullscreen" nodes={menuNodes} activeNerveId={activeNerveId} onActivateNerve={handleActivateNerve}
                mixCategories={mixCategories} disabled={!isViewerReady || !materialsReady || apiMode !== 'api' || isFocusing}
                isolatedRegionPath={isolatedRegionPath} onIsolateRegion={isolateRegion} onRestoreRegion={restoreRegionIsolation}
                onSetRegionVisibility={handleRegionVisibility} selectedNodeId={selectedNodeId}
                isIsolated={isolatedNodeId === selectedNodeId && selectedNodeId !== null && !isolatedWithContext}
                isFocusing={isFocusing} focusError={focusError} onIsolateSelected={handleIsolateSelected} onRestoreSelected={handleRestorePreviousView}
                  onIsolateSelectedWithContext={() => { if (selectedNodeId !== null && !isFocusing) handleFocusStructure(selectedNodeId, true); }} />
            )}
            {!isNerveAtlas && (
              <FullscreenAnatomyMenu
                brainGrossAnatomy={view.brainGrossAnatomy}
                excludedNeuroanatomyGroupIds={atlasMenuGroupExclusions(view)}
                mixCategories={mixCategories}
                nodes={menuNodes}
                selectedSystemId={selectedSystemId}
                neuroanatomyMode={neuroanatomyMode}
                onNeuroanatomyModeChange={handleNeuroanatomyModeChange}
                advancedCollectionRequest={advancedCollectionRequest}
                selectedNodeId={selectedNodeId}
                regionPathForNode={regionPathForNode}
                onSetRegionVisibility={handleRegionVisibility}
                onIsolateRegion={isolateRegion}
                isolatedRegionPath={isolatedRegionPath}
                onRestoreRegion={restoreRegionIsolation}
                isIsolated={isolatedNodeId === selectedNodeId && selectedNodeId !== null && !isolatedWithContext}
                isFocusing={isFocusing}
                focusError={focusError}
                controlsAvailable={isViewerReady && apiMode === 'api'}
                onIsolate={handleIsolateSelected}
                onRestore={handleRestorePreviousView}
              />
            )}
  </>;

  return (
    <div data-atlas-view={view.id} className="flex flex-col h-[100dvh] min-h-0 w-full bg-background overflow-hidden font-sans">
      <div className="sr-only">
        <h1>{getSeoPage(view.href).heading}</h1>
        <p>{view.description}</p>
      </div>
      <SiteNav />

      {!isFullscreen && !stackedLayout && isNerveAtlas && <FocusedNerveMenu {...brachialMenuProps} variant="strip" nodes={nodes} activeNerveId={activeNerveId} onActivateNerve={handleActivateNerve}
        mixCategories={mixCategories} disabled={!isViewerReady || !materialsReady || apiMode !== 'api'} isolatedRegionPath={isolatedRegionPath}
        onIsolateRegion={isolateRegion} onRestoreRegion={restoreRegionIsolation} onSetRegionVisibility={handleRegionVisibility}
        selectedNodeId={selectedNodeId} />}
      {!isFullscreen && !stackedLayout && !isNerveAtlas && <SystemToolbar
        nodes={nodes}
        systemIds={view.systemIds}
        showAdvancedCollections={Boolean(view.showAdvancedCollections)}
        excludedNeuroanatomyGroupIds={atlasMenuGroupExclusions(view)}
        brainGrossAnatomy={view.brainGrossAnatomy}
        selectedCollectionId={advancedCollectionRequest?.id}
        onSelectCollection={handleAdvancedCollectionSelect}
        selectedSystemId={selectedSystemId}
        onSelect={handleAtlasSystemSelect}
        onSetVisibility={handleSystemVisibility}
      />}

      {/* Keep a single viewer instance while switching between desktop side-by-side
          and touch-friendly stacked layouts. */}
      <PanelGroup ref={panelGroupRef} direction={stackedLayout ? 'vertical' : 'horizontal'} className="flex-1 min-h-0 overflow-hidden">
        {/* Sketchfab Viewer Panel */}
        <Panel defaultSize={stackedLayout ? 100 : 65} minSize={stackedLayout ? 100 : 40}>
          <div
            ref={viewerContainerRef}
            tabIndex={-1}
            aria-label="3D anatomy viewer"
            data-testid="anatomy-viewer-container"
            data-viewer-fullscreen={isFullscreen ? 'true' : undefined}
            className="relative flex flex-col h-full min-h-0 w-full overflow-hidden bg-black outline-none"
          >
            {isFullscreen && !stackedLayout && <div className="shrink-0">{collectionNav}</div>}
            {error && (
              <div role="alert" className="absolute top-3 right-3 z-20 text-xs text-destructive px-3 py-2 rounded border border-destructive/30 bg-background/95 max-w-xs">
                {error}
              </div>
            )}
            {!isViewerReady && !error && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground animate-pulse font-mono tracking-widest">
                  LOADING MODEL...
                </p>
              </div>
            )}
            <div className="relative flex-1 min-h-0" tabIndex={-1}>
            <MixCategoriesToggle enabled={mixCategories} onChange={handleMixCategoriesChange} />
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen (F / Esc)' : 'Fullscreen (F)'}
              data-testid="button-viewer-fullscreen"
              className="absolute right-3 top-3 z-30 inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 bg-black/75 px-3 py-2 text-xs text-white backdrop-blur-md hover:bg-black/90 focus-visible:outline focus-visible:outline-primary"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </button>
            <iframe
              ref={iframeRef}
              className="w-full h-full border-none outline-none"
              allow="autoplay; xr-spatial-tracking"
              title={`Anatomia Aperta 3D — ${view.label} Viewer`}
            />
            {isFullscreen && !stackedLayout && fullscreenMenus}
            {stackedLayout && (
              <MobileViewerControls open={mobileSheet} onToggle={toggleMobileSheet}
                selectedName={selectedDisplay?.name} selectedSystem={selectedSystemLabel}
                selectedVisible={selectedDisplay?.visible ?? false}
                controlsAvailable={isViewerReady && materialsReady && apiMode === 'api' && !isFocusing}
                canUndo={canUndoHide}
                canRestore={isolatedNodeId !== null || isolatedRegionPath !== null}
                isIsolated={isolatedNodeId === selectedNodeId && selectedNodeId !== null && !isolatedWithContext}
                onToggleVisibility={() => {
                  if (selectedNodeId !== null && selectedDisplay)
                    toggleNodeVisibility(selectedNodeId, !selectedDisplay.visible);
                }}
                onIsolate={handleIsolateSelected}
                onUndo={() => { undoLastHide(); }}
                onRestore={handleRestorePreviousView} />
            )}
            {stackedLayout && mobileSheet === 'collections' && (
              <MobileSheet id="collections" title="Collections" onClose={closeMobileSheet}
                className="atlas-mobile-collections absolute inset-x-0 bottom-0 z-40 max-h-[62%]">
                {mobileCollectionNav}
              </MobileSheet>
            )}
            {stackedLayout && isFullscreen && mobileSheet === 'anatomy' && (
              <MobileSheet id="anatomy" title="Anatomy" onClose={closeMobileSheet}
                className="atlas-mobile-fullscreen-menu absolute inset-x-0 bottom-0 z-40 max-h-[70%]">
                {fullscreenMenus}
              </MobileSheet>
            )}
            {isFullscreen && !isNativeFullscreen && !stackedLayout && (
              <p role="status" className="pointer-events-none absolute bottom-1 left-3 right-3 z-20 text-[10px] text-white/60">
                Browser fullscreen is unavailable here; using an expanded viewer. Press F or Esc to return.
              </p>
            )}
            {isViewerReady && apiMode === 'api' && !stackedLayout && (
              <HotkeyReference hasSelection={selectedNodeId !== null} />
            )}
            </div>
          </div>
        </Panel>

        {/* Drag handle */}
        <PanelResizeHandle
          disabled={stackedLayout}
          aria-label={stackedLayout ? 'Resize 3D viewer and anatomy menu vertically' : 'Resize 3D viewer and anatomy menu horizontally'}
          className={`${stackedLayout ? 'hidden' : 'w-1.5 h-full cursor-col-resize bg-border'} ${stackedLayout ? 'h-6 w-full cursor-row-resize border-y border-border bg-card/90' : 'w-1.5 h-full cursor-col-resize bg-border'} touch-none hover:bg-primary/20 active:bg-primary/30 transition-colors relative group flex items-center justify-center`}
        >
          <GripVertical className={`text-muted-foreground group-hover:text-primary absolute pointer-events-none ${stackedLayout ? 'w-5 h-5 rotate-90' : 'w-3 h-3'}`} />
        </PanelResizeHandle>

        {/* Sidebar Panel */}
        <Panel defaultSize={stackedLayout ? 0 : 35} minSize={stackedLayout ? 0 : 28} maxSize={stackedLayout ? 0 : 60}>
          <div id={stackedLayout ? 'mobile-sheet-anatomy' : undefined}
            role={stackedLayout ? 'dialog' : undefined}
            aria-label={stackedLayout ? 'Anatomy' : undefined}
            className={stackedLayout
            ? (mobileSheet === 'anatomy' && !isFullscreen ? 'atlas-mobile-sheet atlas-mobile-anatomy fixed inset-x-0 bottom-0 z-[110] flex flex-col h-[72dvh] rounded-t-2xl border border-white/15 bg-sidebar shadow-2xl overflow-hidden' : 'hidden')
            : 'h-full min-h-0 flex border-l border-border bg-sidebar overflow-hidden'}>
            {stackedLayout && (
              <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-1.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Anatomy</h2>
                <button type="button" onClick={closeMobileSheet} aria-label="Close anatomy" data-testid="button-close-mobile-anatomy"
                  className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10 focus-visible:outline focus-visible:outline-primary">
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </header>
            )}
            <div className="flex-1 overflow-hidden h-full min-h-0 min-w-0">
              {apiMode === 'embed' ? (
                <div className="h-full flex flex-col items-center justify-center px-6 text-center gap-3">
                  <WifiOff className="w-8 h-8 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Viewer API unavailable in this context. The model renders in
                    embed mode — mesh and annotation controls require the API.
                  </p>
                </div>
              ) : isNerveAtlas ? (
                <FocusedNerveMenu {...brachialMenuProps} {...thalamusSelectionProps} variant="sidebar" nodes={menuNodes} activeNerveId={activeNerveId} onActivateNerve={handleActivateNerve}
                  mixCategories={mixCategories} disabled={!isViewerReady || !materialsReady || apiMode !== 'api'}
                  isLoading={!isViewerReady || !materialsReady} isolatedRegionPath={isolatedRegionPath}
                  onIsolateRegion={isolateRegion} onRestoreRegion={restoreRegionIsolation} onSetRegionVisibility={handleRegionVisibility}
                  selectedNodeId={selectedNodeId} fadedNodeIds={menuFadedNodeIds} onSelect={selectNode} onClearSelection={handleClearSelection}
                  toggleVisibility={view.thalamusCapsule ? toggleRawNodeVisibility : toggleNodeVisibility} onToggleFade={toggleNodeFade}
                  isIsolated={isolatedNodeId === selectedNodeId && selectedNodeId !== null && !isolatedWithContext}
                  isFocusing={isFocusing} focusError={focusError} onIsolateSelected={handleIsolateSelected} onRestoreSelected={handleRestorePreviousView}
                  onIsolateSelectedWithContext={() => { if (selectedNodeId !== null && !isFocusing) handleFocusStructure(selectedNodeId, true); }} />
              ) : (
                <MeshPanel
                  brainGrossAnatomy={view.brainGrossAnatomy}
                  excludedNeuroanatomyGroupIds={atlasMenuGroupExclusions(view)}
                  mixCategories={mixCategories}
                  nodes={menuNodes}
                  selectedSystemId={selectedSystemId}
                  neuroanatomyMode={neuroanatomyMode}
                  onNeuroanatomyModeChange={handleNeuroanatomyModeChange}
                  advancedCollectionRequest={advancedCollectionRequest}
                  toggleVisibility={toggleNodeVisibility}
                  onSetRegionVisibility={handleRegionVisibility}
                  onIsolateRegion={isolateRegion}
                  isolatedRegionPath={isolatedRegionPath}
                  onRestoreRegion={restoreRegionIsolation}
                  regionPathForNode={regionPathForNode}
                  isLoading={!isViewerReady}
                  selectedNodeId={selectedNodeId}
                  fadedNodeIds={menuFadedNodeIds}
                  onSelect={selectNode}
                  onClearSelection={handleClearSelection}
                  onToggleFade={toggleNodeFade}
                  isolatedNodeId={isolatedNodeId}
                  isFocusing={isFocusing}
                  focusError={focusError}
                  onFocusWithContext={handleFocusStructure}
                  onExitIsolation={handleRestorePreviousView}
                />
              )}
            </div>
          </div>
        </Panel>
      </PanelGroup>
      {!isFullscreen && <footer className="atlas-legal"><LegalLinks /></footer>}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {SPINAL_REFERENCE_VIEWS.map(view => <Route key={view.id} path={view.href}>
        <ViewerPage key={view.id} view={view} />
      </Route>)}
      {ATLAS_VIEWS.map((view) => (
        <Route key={view.id} path={view.href}>
          {/* Separate model instances prevent focus/visibility state leaking
              between the complete model and a targeted atlas. */}
          <ViewerPage key={view.id} view={view} />
        </Route>
      ))}
      <Route path="/about" component={About} />
      <Route path="/sources" component={Sources} />
      <Route path="/contact" component={Contact} />
      {legalPolicies.map((policy) => (
        <Route key={policy.slug} path={`/${policy.slug}`}>
          <Legal slug={policy.slug} />
        </Route>
      ))}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, '') || ''}>
        <Router />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
