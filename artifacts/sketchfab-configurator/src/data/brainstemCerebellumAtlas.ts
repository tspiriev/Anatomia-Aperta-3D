import { BRAINSTEM_CEREBELLUM_SOURCE_OBJECTS } from './brainstemCerebellumSourceRows';
import { normalizeAdvancedObjectName } from './advancedCollection';
import { brainstemFocusedName, classifyFocusedBrainstem, focusedBrainstemGroup, isFocusedMollaretFiber } from './brainstemFocusedTaxonomy';
import { classifyBrainGrossAnatomy } from './brainGrossAnatomy';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';

export const BRAINSTEM_CEREBELLUM_ROOT = ['advanced-neuroanatomy', 'brainstem-and-cerebellum'] as const;
export const CEREBELLAR_HEMISPHERES_NAME = 'Cerebellar hemispheres (combined)';
export const CEREBELLAR_VERMIS_NAME = 'Vermis (combined)';
const key = normalizeAdvancedObjectName;
const root = BRAINSTEM_CEREBELLUM_ROOT;
const within = (path: readonly string[], requested: readonly string[]) => requested.every((p, i) => path[i] === p);
const leaf = (parent: readonly string[], id: string, label: string): NervousGroup => ({
  id: [...parent, id].join('/'), label,
});
function rebase(group: NervousGroup): NervousGroup {
  const children = group.children?.map(rebase);
  return { ...group, id: [...root, 'brainstem', ...group.id.split('/').slice(2)].join('/'),
    ...(children ? { children } : {}) };
}
const cerebellum = [...root, 'cerebellum'];
const gross = [...root, 'gross-anatomy'];
export const BRAINSTEM_CEREBELLUM_GROUPS: readonly NervousGroup[] = [
  { id: gross.join('/'), label: 'Brainstem and cerebellum gross anatomy', children: [
    { ...leaf(gross, 'brainstem', 'Brainstem gross anatomy'), children: [
      leaf([...gross, 'brainstem'], 'midbrain', 'Midbrain'),
      leaf([...gross, 'brainstem'], 'pons', 'Pons'),
      leaf([...gross, 'brainstem'], 'medulla-oblongata', 'Medulla oblongata'),
      leaf([...gross, 'brainstem'], 'cerebral-crus', 'Cerebral crus'),
    ] },
    { ...leaf(gross, 'cerebellum', 'Cerebellum gross anatomy'), children: [
      leaf([...gross, 'cerebellum'], 'cerebellar-hemispheres', 'Cerebellar hemispheres'),
      leaf([...gross, 'cerebellum'], 'vermis', 'Vermis'),
    ] },
  ] },
  { ...rebase(focusedBrainstemGroup()), children: [...(rebase(focusedBrainstemGroup()).children ?? []),
    leaf([...root, 'brainstem'], 'orientation', 'Orientation (semitransparent)'),
  ] },
  { id: cerebellum.join('/'), label: 'Cerebellum', children: [
    { ...leaf(cerebellum, 'nuclei', 'Cerebellar, brainstem and thalamic nuclei'), children: [
      { ...leaf([...cerebellum, 'nuclei'], 'cerebellar', 'Cerebellar nuclei'), children: [
        leaf([...cerebellum, 'nuclei', 'cerebellar'], 'dentate', 'Dentate nuclei'),
        leaf([...cerebellum, 'nuclei', 'cerebellar'], 'interposed', 'Interposed nuclei — globose and emboliform'),
        leaf([...cerebellum, 'nuclei', 'cerebellar'], 'fastigial', 'Fastigial nuclei'),
      ] },
      { ...leaf([...cerebellum, 'nuclei'], 'brainstem', 'Brainstem nuclei'), children: [
        leaf([...cerebellum, 'nuclei', 'brainstem'], 'vestibular', 'Vestibular nuclei'),
        leaf([...cerebellum, 'nuclei', 'brainstem'], 'red', 'Red nuclei'),
        leaf([...cerebellum, 'nuclei', 'brainstem'], 'inferior-olivary', 'Inferior olivary nuclei'),
      ] },
      { ...leaf([...cerebellum, 'nuclei'], 'thalamic', 'Thalamic nuclei'), children: [
        leaf([...cerebellum, 'nuclei', 'thalamic'], 'ventral-lateral', 'Ventral lateral nuclei (VL)'),
        leaf([...cerebellum, 'nuclei', 'thalamic'], 'ventral-anterior', 'Ventral anterior nuclei (VA)'),
      ] },
    ] },
    { ...leaf(cerebellum, 'white-matter', 'Cerebellar white matter and peduncles'), children: [
      leaf([...cerebellum, 'white-matter'], 'afferents', 'Afferent pathways'),
      leaf([...cerebellum, 'white-matter'], 'efferents', 'Efferent pathways'),
      leaf([...cerebellum, 'white-matter'], 'peduncles', 'Cerebellar peduncles'),
      leaf([...cerebellum, 'white-matter'], 'rubro-olivary', 'Rubro-olivary / central tegmental connections'),
    ] },
    { ...leaf(cerebellum, 'mollaret', 'Guillain–Mollaret triangle'), children: [
      leaf([...cerebellum, 'mollaret'], 'nuclei', 'Dentate, red and inferior olivary nuclei'),
      leaf([...cerebellum, 'mollaret'], 'central-tegmental', 'Central tegmental limb'),
      leaf([...cerebellum, 'mollaret'], 'olivocerebellar', 'Olivocerebellar / source olivodentate fibers'),
    ] },
    { ...leaf(cerebellum, 'orientation', 'Orientation (semitransparent)'), children: [
      leaf([...cerebellum, 'orientation'], 'hemispheres', CEREBELLAR_HEMISPHERES_NAME),
      leaf([...cerebellum, 'orientation'], 'vermis', CEREBELLAR_VERMIS_NAME),
      leaf([...cerebellum, 'orientation'], 'brainstem-thalamus', 'Brainstem and thalamus'),
    ] },
  ] },
];

/** Updated live meshes may supply subdivisions not present in the saved CSV. */
export function brainstemCerebellumGroupsForNodes(nodes: readonly SceneNode[]): readonly NervousGroup[] {
  const brainstem = rebase(focusedBrainstemGroup(nodes));
  return BRAINSTEM_CEREBELLUM_GROUPS.map(group => group.id === brainstem.id
    ? { ...brainstem, children: [...(brainstem.children ?? []),
      ...(group.children?.filter(child => child.id.endsWith('/orientation')) ?? [])] }
    : group);
}

// Use this dedicated model's export, not the independent Brain atlas inventory.
const cerebellarObjects = new Set(BRAINSTEM_CEREBELLUM_SOURCE_OBJECTS.filter(row => row.collection_name === 'NS_01_CEREBELLUM'
  || row.collection_name === 'Cerebellar' || /corticopontine/i.test(row.collection_name)).map(row => key(row.object_name)));
export function cerebellarSurfacePart(rawName: string): 'hemispheres' | 'vermis' | null {
  const k = key(rawName);
  if (k === key(CEREBELLAR_HEMISPHERES_NAME)) return 'hemispheres';
  if (k === key(CEREBELLAR_VERMIS_NAME)) return 'vermis';
  const path = classifyBrainGrossAnatomy(rawName);
  return path?.[2] === 'cerebellum' ? path[3] === 'vermis' ? 'vermis' : 'hemispheres' : null;
}
function surface(rawName: string): string | null {
  const k = key(rawName);
  if (cerebellarSurfacePart(rawName)) return cerebellarSurfacePart(rawName);
  if (['midbrain', 'pons', 'medulla oblongata', 'base of cerebral peduncle (midbrain)', 'cerebral crus', 'crus cerebri',
    'thalamus', 'thalamic capsule', 'capsule of thalamus'].includes(k)) return 'brainstem-thalamus';
  return null;
}
function thalamicRole(rawName: string): 'body' | 'face' | 'auditory' | 'cerebellar' | null {
  const k = key(rawName);
  if (/ventral posterolateral|\bvpl\b/.test(k)) return 'body';
  if (/ventral posteromedial|\bvpm\b/.test(k)) return 'face';
  if (k === 'medial geniculate body' || /medial geniculate nucleus/.test(k)) return 'auditory';
  if (/ventral lateral|\bvl\b|ventral anterior|\bva\b/.test(k)) return 'cerebellar';
  return null;
}
function includesSensoryThalamicNuclei(requested: readonly string[], role?: string): boolean {
  if (requested.length === 3) return true;
  if (requested[3] !== 'white-matter') return false;
  const branch = requested[4];
  const part = requested[5];
  return !branch || branch === 'associated-thalamic-nuclei'
    || (branch === 'auditory' && (!role || role === 'auditory'))
    || (branch === 'ascending-sensory' && (!role
      || (!part && ['body', 'face'].includes(role))
      || (part === 'trigeminal' ? role === 'face' : role === 'body')))
    || (branch === 'trigeminal' && (!role || role === 'face'));
}
function isAuditory(path: readonly string[], rawName = ''): boolean {
  return path.includes('auditory') || /auditory fibers|auditory radiation/.test(key(rawName));
}
function cerebellarNucleus(k: string): string | null {
  if (/^dentate nucleus$/.test(k)) return 'dentate';
  if (/^nucleus (globosus|emboliformis)$/.test(k)) return 'interposed';
  if (/^nucleus fastigii$/.test(k)) return 'fastigial';
  return null;
}
function cerebellarTract(rawName: string): string | null {
  const k = key(rawName);
  if (/spinocerebellar/.test(k) && classifyFocusedBrainstem(rawName)?.[2] !== 'white-matter') return null;
  if (/central tegmental tract.*(?:molla|molle|mollaret)/.test(k)) return 'rubro-olivary';
  if (/cerebellar peduncle|peduncle of flocculus/.test(k)) return 'peduncles';
  if (/dentatorubro|interpositothalamic|fastigiovestibular/.test(k)
    || /thalamocortical fibers to vl and va/.test(k)) return 'efferents';
  if (cerebellarObjects.has(k) && !cerebellarNucleus(k) && !cerebellarSurfacePart(rawName)) return 'afferents';
  if (/pontocerebellar|spinocerebellar|cuneocerebellar|olivocerebellar|vestibuloolivary|olivodentate|temporoponne|temporopontine/.test(k)) return 'afferents';
  return null;
}
function mollaretPart(rawName: string): string | null {
  const k = key(rawName);
  if (cerebellarNucleus(k) === 'dentate' || ['red nucleus', 'olive', 'inferior olivary nucleus'].includes(k)) return 'nuclei';
  if (/central tegmental tract.*(?:molla|molle|mollaret)/.test(k)) return 'central-tegmental';
  if (/olivodentate|olivocerebellar/.test(k)) return 'olivocerebellar';
  return null;
}
function associatedNucleusPath(rawName: string): readonly string[] | null {
  const k = key(rawName);
  if (k === 'vestibular nuclei') return ['brainstem', 'vestibular'];
  if (k === 'red nucleus') return ['brainstem', 'red'];
  if (['olive', 'inferior olivary nucleus'].includes(k)) return ['brainstem', 'inferior-olivary'];
  if (thalamicRole(rawName) === 'cerebellar')
    return ['thalamic', /ventral lateral|\bvl\b/.test(k) ? 'ventral-lateral' : 'ventral-anterior'];
  return null;
}

function canonicalRequest(path: readonly string[]): readonly string[] {
  if (path[2] === 'cerebellum' && path[3] === 'nuclei'
    && ['dentate', 'interposed', 'fastigial'].includes(path[4]))
    return [...path.slice(0, 4), 'cerebellar', ...path.slice(4)];
  if (path[2] !== 'brainstem' || path[3] !== 'white-matter') return path;
  const replacements: Record<string, readonly string[]> = {
    'ascending-cerebellar': ['cerebellar-connections', 'ascending-cerebellar'],
    trigeminal: ['ascending-sensory', 'trigeminal'],
    'medial-longitudinal-fascicle': ['vestibular-oculomotor', 'medial-longitudinal-fascicle'],
  };
  return replacements[path[4]] ? [...path.slice(0, 4), ...replacements[path[4]], ...path.slice(5)] : path;
}

function brainstemGrossPath(rawName: string): readonly string[] | null {
  const classified = classifyFocusedBrainstem(rawName);
  if (classified?.[2] === 'gross-anatomy') return classified.slice(3);
  const k = key(rawName);
  if (/^(?:superior colliculus|inferior colliculus|aqueduct of midbrain|interpeduncular fossa)$/.test(k)) return ['midbrain'];
  if (k === 'pyramid of medulla oblongata') return ['medulla-oblongata'];
  return null;
}

/** Resolve overlapping connections in the requested collection, not by first match. */
export function brainstemCerebellumPathForGroup(node: SceneNode, requestedPath: readonly string[]): readonly string[] | null {
  const requested = canonicalRequest(requestedPath);
  if (!within(requested, root) || (node.systemId && node.systemId !== 'nervous')) return null;
  const k = key(node.rawName), section = requested[2], shell = surface(node.rawName);
  const grossPath = classifyBrainGrossAnatomy(node.rawName);
  if (section === 'gross-anatomy') {
    const stem = brainstemGrossPath(node.rawName);
    if (stem) {
      const p = [...gross, 'brainstem', ...stem];
      return within(p, requested) ? p : null;
    }
    if (!grossPath || !['brainstem', 'cerebellum'].includes(grossPath[2])) return null;
    const p = [...gross, ...grossPath.slice(2)];
    return within(p, requested) ? p : null;
  }
  const brainstem = classifyFocusedBrainstem(node.rawName);
  const thalamicShell = ['thalamus', 'thalamic capsule', 'capsule of thalamus'].includes(k);
  if (section === 'brainstem') {
    // Resolve editable gross collections before the same meshes become orientation.
    if (requested[3] === 'gross-anatomy') {
      const stem = brainstemGrossPath(node.rawName);
      const p = stem ? [...root, 'brainstem', 'gross-anatomy', ...stem] : null;
      return p && within(p, requested) ? p : null;
    }
    // Keep thalamic orientation only alongside the corresponding relay nuclei.
    if (thalamicShell && !includesSensoryThalamicNuclei(requested)) return null;
    if (shell) return [...root, 'brainstem', 'orientation'];
    if (requested[3] === 'white-matter') {
      const branch = requested[4], part = requested[5];
      const medial = branch === 'ascending-sensory' && (!part || part === 'medial-lemniscus');
      const ascendingCerebellar = branch === 'cerebellar-connections' && (!part || part === 'ascending-cerebellar');
      // These are retained gray-matter partners, never classified as fibers.
      if ((medial && ['gracile nucleus', 'cuneate nucleus'].includes(k))
        || (ascendingCerebellar && k === 'accessory cuneate nucleus')) {
        return brainstem ? [...root, 'brainstem', ...brainstem.slice(2)] : null;
      }
      const cerebellar = cerebellarNucleus(k);
      if (ascendingCerebellar && cerebellar) return [...cerebellum, 'nuclei', 'cerebellar', cerebellar];
      if (branch === 'cerebellar-connections' && part === 'mollaret' && isFocusedMollaretFiber(node.rawName))
        return [...root, 'brainstem', 'white-matter', branch, part];
      if (branch === 'vestibular-oculomotor' && part === 'medial-longitudinal-fascicle'
        && brainstemFocusedName(node.rawName).startsWith('medial longitudinal fascicle'))
        return [...root, 'brainstem', 'white-matter', branch, part];
    }
    if (thalamicRole(node.rawName) && thalamicRole(node.rawName) !== 'cerebellar'
      && includesSensoryThalamicNuclei(requested, thalamicRole(node.rawName)!)) {
      return [...root, 'brainstem', 'associated-thalamic-nuclei', thalamicRole(node.rawName)!];
    }
    if (k === 'transverse temporal gyri' && (requested.length === 3
      || (requested[3] === 'white-matter' && requested.length === 4) || isAuditory(requested)))
      return [...root, 'brainstem', 'white-matter', 'auditory'];
    if (brainstem) {
      const p = [...root, 'brainstem', ...brainstem.slice(2)];
      return within(p, requested) ? p : null;
    }
    const remainingGross = brainstemGrossPath(node.rawName);
    if (remainingGross) {
      const p = [...root, 'brainstem', 'gross-anatomy', ...remainingGross];
      return within(p, requested) ? p : null;
    }
    if (/auditory radiation/.test(k) && (requested.length <= 4 || isAuditory(requested)))
      return [...root, 'brainstem', 'white-matter', 'auditory'];
    return null;
  }
  if (section === 'cerebellum') {
    if (requested[3] === 'mollaret' && thalamicShell) return null;
    if (shell) return [...cerebellum, 'orientation', shell];
    if (requested[3] === 'mollaret') {
      const part = mollaretPart(node.rawName);
      if (!part) return null;
      const p = [...cerebellum, 'mollaret', part];
      if (part === 'nuclei' && requested[4] && requested[4] !== 'nuclei') {
        const related = requested[4] === 'central-tegmental' ? /^(red nucleus|olive|inferior olivary nucleus)$/.test(k)
          : requested[4] === 'olivocerebellar' ? /dentate nucleus|^(olive|inferior olivary nucleus)$/.test(k) : false;
        return related ? p : null;
      }
      return within(p, requested) ? p : null;
    }
    const nucleus = cerebellarNucleus(k), associated = associatedNucleusPath(node.rawName);
    const nuclearPath = nucleus ? [...cerebellum, 'nuclei', 'cerebellar', nucleus]
      : associated ? [...cerebellum, 'nuclei', ...associated] : null;
    // Each nuclear subgroup controls only its own meshes. The same nuclei remain
    // retained context when browsing the existing cerebellar pathways.
    if (requested[3] === 'nuclei')
      return nuclearPath && within(nuclearPath, requested) ? nuclearPath : null;
    if (requested[3] === 'associated-nuclei') return associated ? nuclearPath : null;
    if (associated || (nucleus && requested[3] === 'white-matter')) return nuclearPath;
    const tract = cerebellarTract(node.rawName);
    const p = nuclearPath ?? (tract ? [...cerebellum, 'white-matter', tract] : null);
    return p && within(p, requested) ? p : null;
  }
  if (!section) {
    // Opening overview: every admitted source nucleus/tract plus the envelopes.
    return brainstemCerebellumPathForGroup(node, [...root, 'brainstem'])
      ?? brainstemCerebellumPathForGroup(node, cerebellum);
  }
  return null;
}
export function isBrainstemCerebellumNode(node: SceneNode): boolean {
  return brainstemCerebellumPathForGroup(node, root) !== null;
}
export function isBrainstemCerebellumRetained(node: SceneNode, requested: readonly string[]): boolean {
  const path = brainstemCerebellumPathForGroup(node, requested);
  return path !== null && !within(path, canonicalRequest(requested));
}
export function brainstemCerebellumContextIds(nodes: readonly SceneNode[], requested: readonly string[]): number[] {
  return nodes.filter(node => brainstemCerebellumPathForGroup(node, requested)
    && ((requested[2] !== 'gross-anatomy' && (surface(node.rawName) || key(node.rawName) === 'transverse temporal gyri'))
      || /^(superior|inferior) colliculus$/.test(key(node.rawName))))
    .map(node => node.instanceID);
}
