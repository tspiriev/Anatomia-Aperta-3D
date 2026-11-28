import { classifyMusculoskeletalNode, MUSCULOSKELETAL_SOURCE_ENTRIES } from './musculoskeletalTaxonomy';
import { upperLimbTopographicPaths, upperLimbTopographyGroup } from './upperLimbTopography';
import { upperLimbRegionalMemberships } from './upperLimbTopographyRules';
import { BRACHIAL_GROUPS, brachialPathForGroup } from './brachialPlexusTaxonomy';
import { upperLimbDistalPath, upperLimbHandWristMemberships } from './upperLimbHandWrist';
import type { NervousGroup } from './nervousTaxonomy';
import type { SceneNode } from '../types/sketchfab';

export interface UpperLimbMembership { region: string; tissue: string; part?: string }
export const UPPER_LIMB_REFERENCE_TISSUES = [
  ['muscles', 'Muscles', 'muscular'], ['fasciae', 'Fasciae, intermuscular septa and tendon sheaths', 'joints'],
  ['bones', 'Bones', 'skeletal'], ['joints-ligaments', 'Joints and ligaments (including capsules)', 'joints'],
  ['bursae', 'Bursae', 'joints'], ['attachments', 'Muscle attachment sites', 'attachments'],
  ['nerves', 'Nerves', 'nervous'], ['arteries', 'Arteries', 'vascular'], ['veins', 'Veins', 'vascular'],
] as const;
const tissueAliases: Record<string, string> = {
  'bones-joints': 'bones', 'muscles-tendons': 'muscles', 'fasciae-ligaments-bursae': 'fasciae',
};

/** Reuse the established regional memberships, not a second muscle taxonomy. */
export function upperLimbReferenceMemberships(rawName: string, normalized: string): UpperLimbMembership[] {
  const reference = classifyMusculoskeletalNode(rawName).flatMap(entry =>
    upperLimbTopographicPaths(entry).map(path => ({
      region: path.slice(0, -1).join('/'), tissue: path.at(-1)!,
    })));
  const additional = upperLimbRegionalMemberships(normalized);
  const memberships: UpperLimbMembership[] = [...reference];
  // Revised-model digital pulleys and synovial sheaths are connective tissues,
  // not digital muscles. Keep the established palm memberships as well.
  if (/fibrous sheath of digit of hand|synovial sheaths? of digits? of hand/.test(normalized))
    for (const region of ['hand', 'hand/digital'])
      memberships.push({ region, tissue: 'fasciae' });
  if (/ligament/.test(normalized))
    for (const membership of reference.filter(m => m.tissue === 'fasciae'))
      memberships.push({ ...membership, tissue: 'joints-ligaments' });
  if (/metacarpophalangeal|interphalangeal/.test(normalized)
    && /capsul|ligament/.test(normalized))
    memberships.push({ region: 'hand/digital', tissue: 'joints-ligaments' });
  if (/^superficial transverse metacarpal ligament$/.test(normalized))
    memberships.push({ region: 'hand/digital', tissue: 'joints-ligaments' });
  // Shared musculoskeletal joints have broad regional paths. Also expose the
  // loaded structures in this atlas's existing, more specific teaching views.
  if (memberships.some(m => m.tissue === 'joints-ligaments')) {
    const joint = (region: string) => memberships.push({ region, tissue: 'joints-ligaments' });
    if (/sternoclavicular|costoclavicular|interclavicular|acromioclavicular|conoid|^trapezoid ligament/.test(normalized))
      joint('shoulder/clavicular');
    if (/glenohumeral|glenoid|coracohumeral|coraco-acromial|acromioclavicular|transverse humeral/.test(normalized))
      joint('shoulder/deltoid');
    if (/glenohumeral|glenoid|coracohumeral|coraco-acromial|transverse scapular|conoid|^trapezoid ligament/.test(normalized))
      joint('shoulder/scapular');
    if (/of elbow|annular ligament of radius|^ulnar collateral ligament$|^radial collateral ligament$|quadrate ligament/.test(normalized)) {
      joint('elbow/anterior');
      joint('elbow/posterior');
      if (/of elbow|^ulnar collateral ligament$/.test(normalized)) joint('elbow/medial');
      if (/of elbow|^radial collateral ligament$|annular ligament of radius|quadrate ligament/.test(normalized))
        joint('elbow/lateral');
    }
  }
  for (const membership of additional) {
    // Existing musculoskeletal locations are authoritative; axillary anatomy
    // and neurovascular structures extend that same organisation.
    if (reference.length && !['arteries', 'veins', 'nerves'].includes(membership.tissue)
      && !membership.region.startsWith('axillary/') && membership.region !== 'elbow/cubital-fossa') continue;
    memberships.push({ ...membership, region: membership.region.replace(/^shoulder-girdle\b/, 'shoulder')
      .replace(/^wrist\/carpal-tunnel$/, 'wrist/palmar/carpal-tunnel'),
      tissue: tissueAliases[membership.tissue] ?? membership.tissue });
  }
  if (additional.some(m => m.tissue === 'nerves')) {
    const node = { rawName, name: rawName, instanceID: 0, type: 'MatrixTransform', visible: true } as SceneNode;
    for (const group of BRACHIAL_GROUPS) {
      if (group.id.endsWith('/overview')) continue;
      const path = brachialPathForGroup(node, group.id.split('/'));
      if (path) memberships.push({ region: 'axillary/brachial-plexus', tissue: 'nerves',
        part: path.slice(2).join('/') });
    }
  }
  // Creator-reviewed extensions of the three shoulder teaching regions.
  if (/^(?:scapula|humerus|clavicle)$/.test(normalized))
    for (const region of ['clavicular', 'deltoid', 'scapular'])
      memberships.push({ region: `shoulder/${region}`, tissue: 'bones' });
  if (/^(?:subclavian artery|subclavian vein|brachiocephalic vein)$/.test(normalized))
    for (const region of ['clavicular', 'deltoid'])
      memberships.push({ region: `shoulder/${region}`, tissue: /vein/.test(normalized) ? 'veins' : 'arteries' });
  if (/^axillary (?:artery|vein)$/.test(normalized))
    memberships.push({ region: 'shoulder/deltoid', tissue: /vein/.test(normalized) ? 'veins' : 'arteries' });
  if (/^(?:lateral|medial|posterior) cord(?: of)? brachial plexus$/.test(normalized) || normalized === 'axillary nerve')
    memberships.push({ region: 'shoulder/deltoid', tissue: 'nerves' });
  if (/^posterior cord(?: of)? brachial plexus$/.test(normalized) || normalized === 'axillary nerve')
    memberships.push({ region: 'shoulder/deltoid', tissue: 'nerves', part: 'posterior-cord-axillary-nerve' });
  const muscle = !/arter|vein|venous|nerve|plexus|bursa|fascia|sheath|ligament|septum/.test(normalized)
    && !/\.[oe]\d*[lr](?:\.\d+)?$/i.test(rawName);
  if (muscle && /deltoid|supraspinatus|infraspinatus|subscapularis|teres (?:major|minor)/.test(normalized))
    memberships.push({ region: 'shoulder/deltoid', tissue: 'muscles' });
  if (muscle && /supraspinatus|infraspinatus|subscapularis|teres (?:major|minor)|levator scapulae|omohyoid|rhomboid|serratus anterior|trapezius|pectoralis minor|coracobrachialis|(?:long head|short head) of (?:biceps|triceps) brachii|deltoid/.test(normalized))
    memberships.push({ region: 'shoulder/scapular', tissue: 'muscles' });
  for (const membership of [...memberships])
    if (membership.region === 'axillary/brachial-plexus' && membership.part && !membership.part.includes('/'))
      memberships.push({ ...membership, region: 'shoulder/scapular' });
  // Shared proximal vessel trunks orient all three arm teaching views.
  if (/^(?:subclavian|axillary|brachial) (?:artery|veins?)$/.test(normalized))
    for (const region of ['anterior', 'posterior', 'medial'])
      memberships.push({ region: `arm/${region}`, tissue: /vein/.test(normalized) ? 'veins' : 'arteries' });
  if (/^median (?:cubital|antebrachial) vein$/.test(normalized))
    memberships.push({ region: 'arm/anterior', tissue: 'veins' });
  if (normalized === 'median nerve')
    memberships.push({ region: 'arm/anterior', tissue: 'nerves' });
  const forearmRegions = ['anterior', 'posterior', 'mobile-wad', 'radial', 'ulnar', 'median'];
  // Whole proximal trunks and the forearm arterial division are deliberate
  // context in these teaching views, rather than cropped or invented geometry.
  if (/^(?:(?:subclavian|axillary|brachial|radial|ulnar|common interosseous|anterior interosseous|posterior interosseous|recurrent interosseous|radial recurrent|ulnar recurrent) artery|(?:subclavian|axillary|brachial|radial|ulnar) veins?)$/.test(normalized))
    for (const region of forearmRegions)
      memberships.push({ region: `forearm/${region}`, tissue: /vein/.test(normalized) ? 'veins' : 'arteries' });
  if (/^(?:median|ulnar) nerve$/.test(normalized))
    memberships.push({ region: 'forearm/anterior', tissue: 'nerves' });
  if (/^(?:radial nerve|(?:deep|superficial) branch of radial nerve|posterior interosseous nerve of forearm|muscular branches of radial nerve)$/.test(normalized))
    for (const region of ['posterior', 'mobile-wad'])
      memberships.push({ region: `forearm/${region}`, tissue: 'nerves' });
  if (/^(?:median nerve|anterior interosseous nerve of forearm|muscular branches of median nerve|palmar branch of median nerve)$/.test(normalized))
    memberships.push({ region: 'forearm/median', tissue: 'nerves' });
  if (/^median (?:antebrachial|cubital) vein$/.test(normalized))
    memberships.push({ region: 'forearm/median', tissue: 'veins' });
  if (normalized === 'antebrachial fascia')
    memberships.push({ region: 'forearm', tissue: 'fasciae' });
  const scoped = memberships.filter(m => {
    if (m.region !== 'forearm' && !m.region.startsWith('forearm/')) return true;
    // The fascia remains available only at Forearm → Fasciae, not in the
    // combined compartments, muscle layers or neurovascular views.
    if (normalized === 'antebrachial fascia') return m.region === 'forearm' && m.tissue === 'fasciae';
    if (normalized === 'brachiocephalic vein') return false;
    return true;
  });
  const distal = upperLimbHandWristMemberships(scoped, normalized);
  return [...new Map(distal.map(m => [`${m.region}/${m.tissue}/${m.part ?? ''}`, m])).values()];
}

export function upperLimbReferenceGroups(root: readonly string[], paths: readonly (readonly string[])[]): NervousGroup[] {
  const has = (path: readonly string[]) => paths.some(candidate => path.every((part, i) => candidate[i] === part));
  const reference = upperLimbTopographyGroup([], MUSCULOSKELETAL_SOURCE_ENTRIES).children ?? [];
  const copy = (group: NervousGroup, prefix: readonly string[], strip: number): NervousGroup => ({
    ...group, id: [...prefix, ...group.id.split('/').slice(strip)].join('/'),
    children: group.children?.map(child => copy(child, prefix, strip)),
  });
  const copyReference = (group: NervousGroup): NervousGroup => ({
    ...group, id: [...root, ...upperLimbDistalPath(group.id.split('/').slice(1))].join('/'),
    children: group.children?.map(copyReference),
  });
  const base = reference.filter(group => !['hand', 'wrist'].includes(group.id.split('/').at(-1)!))
    .map(copyReference);
  const hand = reference.find(group => group.id.endsWith('/hand'))!;
  const wrist = reference.find(group => group.id.endsWith('/wrist'))!;
  const distal = copyReference(hand);
  base.push({ ...distal, label: 'Hand and wrist',
    children: [...(distal.children ?? []), copyReference(wrist)] });
  const axillary = { id: [...root, 'axillary'].join('/'), label: 'Axillary region', children: [
    { id: [...root, 'axillary', 'walls'].join('/'), label: 'Axillary walls and muscular boundaries' },
    { id: [...root, 'axillary', 'vessels'].join('/'), label: 'Axillary arteries and veins' },
    { id: [...root, 'axillary', 'brachial-plexus'].join('/'), label: 'Brachial plexus' },
  ] };
  base.splice(1, 0, axillary);
  // Include source-backed neurovascular subregions alongside the shared tree.
  for (const candidate of paths) {
    const tissueIndex = candidate.findIndex(part => UPPER_LIMB_REFERENCE_TISSUES.some(([id]) => id === part));
    if (tissueIndex < root.length + 1) continue;
    let siblings = base;
    for (let depth = root.length; depth < tissueIndex; depth++) {
      const id = candidate.slice(0, depth + 1).join('/');
      let group = siblings.find(g => g.id === id);
      if (!group) {
        group = { id, label: ({ medial: 'Medial neurovascular structures', radial: 'Radial neurovascular structures',
          ulnar: 'Ulnar neurovascular structures', median: 'Median neurovascular structures',
          dorsal: 'Dorsal region', digital: 'Digital anatomy',
          'cubital-fossa': 'Cubital fossa', 'carpal-tunnel': 'Carpal tunnel region',
          clavicular: 'Clavicular and infraclavicular region', deltoid: 'Deltoid region', scapular: 'Scapular region',
          lateral: 'Lateral region', posterior: 'Posterior region' } as Record<string, string>)[candidate[depth]] ?? candidate[depth],
          children: [] };
        siblings.push(group);
      }
      group.children ??= [];
      siblings = group.children as NervousGroup[];
    }
  }
  const finish = (group: NervousGroup): NervousGroup | null => {
    const path = group.id.split('/');
    const isTissue = UPPER_LIMB_REFERENCE_TISSUES.some(([id]) => path.at(-1) === id);
    const children = (group.children ?? []).map(finish).filter((g): g is NervousGroup => !!g);
    if (!isTissue) for (const [id, label] of UPPER_LIMB_REFERENCE_TISSUES) {
      const tissuePath = [...path, id];
      if (!has(tissuePath) || children.some(child => child.id === tissuePath.join('/'))) continue;
      const plexus = ['brachial-plexus', 'scapular'].includes(path.at(-1)!) && id === 'nerves';
      const branches = plexus ? BRACHIAL_GROUPS.filter(g => !g.id.endsWith('/overview'))
        .map(g => copy(g, tissuePath, 2)).map(finish).filter((g): g is NervousGroup => !!g) : [];
      if (plexus && has([...tissuePath, 'collateral']))
        branches.push({ id: [...tissuePath, 'collateral'].join('/'), label: 'Collateral branches' });
      if (id === 'nerves' && path[2] === 'shoulder' && path[3] === 'deltoid'
        && has([...tissuePath, 'posterior-cord-axillary-nerve']))
        branches.push({ id: [...tissuePath, 'posterior-cord-axillary-nerve'].join('/'),
          label: 'Posterior cord → axillary nerve' });
      children.push({ id: tissuePath.join('/'), label, ...(branches.length ? { children: branches } : {}) });
    }
    return has(path) ? { ...group,
      ...(isTissue ? { label: UPPER_LIMB_REFERENCE_TISSUES.find(([id]) => id === path.at(-1))![1] } : {}),
      children: children.length ? children : undefined } : null;
  };
  return base.map(finish).filter((g): g is NervousGroup => !!g);
}
