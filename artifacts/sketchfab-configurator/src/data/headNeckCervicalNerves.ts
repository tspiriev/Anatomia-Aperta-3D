import { skullBaseName, skullBaseNervousSource } from './skullBaseSources';
import type { NervousGroup } from './nervousTaxonomy';

type Family = 'spinal-roots' | 'spinal-nerves' | 'cervical-plexus' | 'brachial-plexus';
export function cervicalNerveName(rawName: string): string {
  return skullBaseName(rawName).replace(/^fj\d+ bp\d+ fma\d+ /, '')
    .replace(/\b(?:left|right)\b/g, '').replace(/\s+/g, ' ').trim()
    .replace(/auriculo[- ]temporal/g, 'auriculotemporal')
    .replace(/^(?:nervus )?(?:transversus coll?i|transverse colli)(?: nerve)?$/, 'transverse cervical nerve')
    .replace(/ansa cervicali$/, 'ansa cervicalis');
}
const sourcePlexuses = new Map<string, Family>();
const cervicalSympatheticSource = new Set<string>();
for (const [rawName, collections] of skullBaseNervousSource) {
  const name = cervicalNerveName(rawName);
  if (collections.has('Sympathetic trunk Cervical')) cervicalSympatheticSource.add(name);
  // The source files this V3 branch under Cervical plexus. Keep the nerve,
  // but do not teach it as a cervical-plexus branch.
  if (/mylohyoid|mandibular nerve/.test(name)) continue;
  if (collections.has('NS_02_BRACHIAL_PLEXUS')) sourcePlexuses.set(name, 'brachial-plexus');
  else if (collections.has('NS_01_CERVICAL_PLEXUS')) sourcePlexuses.set(name, 'cervical-plexus');
}

export function isCervicalAutonomicNerve(rawName: string): boolean {
  const name = cervicalNerveName(rawName);
  return cervicalSympatheticSource.has(name)
    || /^(?:superior|middle|inferior) cervical (?:sympathetic )?ganglion$|^cervicothoracic ganglion(?: \(stellatum\))?$|^ansa subclavia$/.test(name);
}

/** Peripheral source memberships plus explicit live nerve/root identities.
 * Never infer a nerve from a bare level name such as "C5". */
export function headNeckCervicalNerveFamily(rawName: string): Family | null {
  const name = cervicalNerveName(rawName);
  if (/nucle|neucle|tract|fascicl|fiber|gyrus|sulcus/.test(name)
    || (/arter|vein|venous|muscle|fascia|fat|ligament|bone/.test(name) && !/nerve/.test(name))) return null;
  const source = sourcePlexuses.get(name);
  if (source) return source;
  if (/sympathetic/.test(name)) return null;
  if (/brachial plexus/.test(name)) return 'brachial-plexus';
  if (/^(?:(?:superior|middle|inferior|upper|lower) trunk|(?:lateral|medial|posterior) cord|(?:anterior|posterior) division of (?:superior|middle|inferior|upper|lower) trunk)$/.test(name))
    return 'brachial-plexus';
  if (/cervical plexus|ansa cervical|phrenic nerve|great auricular nerve|lesser occipital nerve|transverse cervical nerve|supraclavicular nerve/.test(name))
    return 'cervical-plexus';
  if (/\bc[1-8]\b|\bcervical\b/.test(name)) {
    if (/root|^c[12] anterior posterior$/.test(name)
      || (/\bc[1-8]\b/.test(name) && /gangli/.test(name))) return 'spinal-roots';
    if (/spinal nerve|cervical nerve|ramus|rami|^(?:trunk of )?c[1-8] nerve$/.test(name)) return 'spinal-nerves';
  }
  return null;
}

export const NECK_NERVE_DETAILS = {
  'spinal-roots': [
    ['cervical-dorsal', 'Cervical dorsal / posterior roots'],
    ['cervical-ventral', 'Cervical ventral / anterior roots'],
    ['cervical-ganglia', 'Cervical dorsal-root ganglia'],
    ['combined-c1-c2', 'Combined C1–C2 root components'],
    ['other', 'Other modeled spinal roots and ganglia'],
  ],
  'spinal-nerves': [
    ['cervical-spinal', 'Cervical spinal nerves'],
    ['cervical-dorsal-rami', 'Cervical dorsal / posterior rami'],
    ['cervical-ventral-rami', 'Cervical ventral / anterior rami'],
    ['other', 'Other modeled spinal nerves and rami'],
  ],
  'cervical-plexus': [
    ['roots', 'C1–C4 modeled anterior rami / plexus roots'],
    ['cutaneous', 'Cutaneous branches'],
    ['ansa', 'Ansa cervicalis'],
    ['phrenic', 'Phrenic nerves'],
    ['other', 'Other modeled cervical-plexus components'],
  ],
  'brachial-plexus': [
    ['roots', 'C5–T1 plexus roots / anterior rami (whole modeled meshes)'],
    ['trunks', 'Trunks'],
    ['divisions', 'Divisions'],
    ['cords', 'Cords'],
    ['branches', 'Terminal and collateral branches'],
  ],
} as const;

export function cervicalNerveDetail(rawName: string, family: string): string | null {
  const name = cervicalNerveName(rawName);
  if (family === 'brachial-plexus')
    return /root|ramus|rami/.test(name) ? 'roots' : /division/.test(name) ? 'divisions'
      : /cord/.test(name) ? 'cords' : /trunk/.test(name) ? 'trunks' : 'branches';
  if (family === 'cervical-plexus')
    return /ansa/.test(name) ? 'ansa' : /phrenic/.test(name) ? 'phrenic'
      : /supraclavicular|transverse cervical|great auricular|lesser occipital/.test(name) ? 'cutaneous'
      : /root|ramus|rami|^(?:trunk of )?c[1-4] nerve$|^cervical plexus$/.test(name) ? 'roots' : 'other';
  if (family !== 'spinal-roots' && family !== 'spinal-nerves') return null;
  if (!/\bc[1-8]\b|\bcervical\b/.test(name)) return 'other';
  if (family === 'spinal-roots')
    return /gangli/.test(name) ? 'cervical-ganglia' : /^c[12] anterior posterior$/.test(name) ? 'combined-c1-c2'
      : /dorsal|posterior/.test(name) ? 'cervical-dorsal' : /ventral|anterior/.test(name) ? 'cervical-ventral' : 'other';
  return /ramus|rami/.test(name)
    ? /dorsal|posterior/.test(name) ? 'cervical-dorsal-rami'
      : /ventral|anterior/.test(name) ? 'cervical-ventral-rami' : 'other'
    : 'cervical-spinal';
}

const cutaneousBranches = [
  ['great-auricular', 'Great auricular nerves', /great auricular/],
  ['lesser-occipital', 'Lesser occipital nerves', /lesser occipital/],
  ['transverse-cervical', 'Transverse cervical nerves', /transverse cervical/],
  ['supraclavicular', 'Supraclavicular nerves', /supraclavicular/],
] as const;
export function cervicalNerveLeaf(rawName: string, family: string, detail: string): string | null {
  const name = cervicalNerveName(rawName);
  const level = name.match(/\bc([1-8])\b/);
  if (['spinal-roots', 'spinal-nerves'].includes(family) && detail !== 'other') return level ? `c${level[1]}` : null;
  if (family !== 'cervical-plexus') return null;
  if (detail === 'roots' && level && Number(level[1]) <= 4) return `c${level[1]}`;
  if (detail === 'cutaneous') return cutaneousBranches.find(([, , pattern]) => pattern.test(name))?.[0] ?? null;
  if (detail === 'ansa') return /inferior/.test(name) ? 'inferior-root' : /superior/.test(name) ? 'superior-root' : 'ansa';
  return null;
}
export function cervicalNerveLeafGroups(path: readonly string[], family: string, detail: string): NervousGroup[] {
  const groups: readonly (readonly [string, string])[] =
    ['spinal-roots', 'spinal-nerves'].includes(family) && detail !== 'other'
      ? Array.from({ length: 8 }, (_, i) => [`c${i + 1}`, `C${i + 1}`] as const)
      : family === 'cervical-plexus' && detail === 'roots'
        ? Array.from({ length: 4 }, (_, i) => [`c${i + 1}`, `C${i + 1} anterior ramus / plexus contribution`] as const)
        : family === 'cervical-plexus' && detail === 'cutaneous'
          ? cutaneousBranches.map(([id, label]) => [id, label] as const)
          : family === 'cervical-plexus' && detail === 'ansa'
            ? [['superior-root', 'Superior root (C1 via XII)'], ['inferior-root', 'Inferior root (C2–C3)'], ['ansa', 'Ansa cervicalis loop, when modeled']] : [];
  return groups.map(([id, label]) => ({ id: [...path, id].join('/'), label }));
}

/** Reviewed topographic relationships of the CSV's cervical PNS components.
 * Spinal roots and dorsal rami remain context, never relabeled plexus branches. */
export function cervicalNerveRegions(rawName: string): readonly string[] {
  const family = headNeckCervicalNerveFamily(rawName);
  const name = cervicalNerveName(rawName);
  if (isCervicalAutonomicNerve(rawName)) return [
    'anterior-triangle/carotid', 'lateral-neck/sternocleidomastoid',
    'deep-neck/prevertebral', 'deep-neck/root-of-neck',
  ];
  if (!family || family === 'brachial-plexus') return [];
  const regions = new Set<string>();
  if (family === 'spinal-roots' || family === 'spinal-nerves') {
    regions.add('deep-neck/prevertebral');
    regions.add('posterior-neck/posterior-cervical');
    const level = Number(name.match(/\bc([1-8])\b/)?.[1]);
    if (level && level <= 4) regions.add('cervical-plexus/spinal-context');
    if (level && level <= 3) regions.add('posterior-neck/suboccipital');
  } else {
    const detail = cervicalNerveDetail(rawName, family);
    regions.add(`cervical-plexus/${detail === 'ansa' ? 'ansa' : detail === 'other' ? 'roots' : detail}`);
    regions.add('lateral-neck/sternocleidomastoid');
    if (detail === 'roots' || detail === 'other') {
      regions.add('deep-neck/prevertebral');
      regions.add('lateral-neck/occipital-triangle');
    }
    if (detail === 'ansa') {
      regions.add('anterior-triangle/carotid');
      regions.add('anterior-triangle/muscular');
      regions.add(/inferior/.test(name) ? 'ansa-cervicalis/inferior-root' : 'ansa-cervicalis/superior-root');
    }
    if (detail === 'phrenic') {
      regions.add('deep-neck/prevertebral'); regions.add('deep-neck/root-of-neck');
      regions.add('lateral-neck/omoclavicular');
    }
    if (detail === 'cutaneous') {
      regions.add('lateral-neck/occipital-triangle');
      if (/supraclavicular/.test(name)) {
        regions.add('lateral-neck/omoclavicular'); regions.add('deep-neck/root-of-neck');
      }
      if (/transverse cervical/.test(name)) {
        regions.add('anterior-triangle/carotid'); regions.add('anterior-triangle/muscular');
      }
      if (/great auricular|lesser occipital/.test(name)) {
        regions.add('head/scalp-face'); regions.add('head/ear');
      }
      if (/great auricular/.test(name)) regions.add('head/parotid');
    }
  }
  return [...regions];
}

/** Additional relationships in the existing cervical-plexus menu. These rules
 * classify loaded meshes, never generate geometry or turn CN XII into a root. */
export function cervicalPlexusSupplementalMemberships(rawName: string): readonly {
  region: string; tissue: 'nerves' | 'muscles' | 'bones' | 'joints' | 'arteries' | 'veins';
}[] {
  const name = cervicalNerveName(rawName);
  if (/^(?:trunk of )?hypoglossal nerve(?: \(xii\))?$/.test(name))
    return [{ region: 'cervical-plexus/relations', tissue: 'nerves' }];
  if (/^(?:c[1-4] (?:spinal cord )?segment|spinal cord segment c[1-4]|cervical (?:spinal )?cord|spinal cord cervical(?: part| region)?)$/.test(name))
    return [{ region: 'cervical-plexus/spinal-context', tissue: 'nerves' }];
  if (/^(?:c1 (?:fibers|fibres) (?:accompanying|via|with) (?:the )?hypoglossal nerve(?: \(xii\))?|c[1-4] (?:muscular )?branches? to .+|muscular branches? (?:of|from) (?:the )?cervical plexus)$/.test(name))
    return [{ region: 'cervical-plexus/motor', tissue: 'nerves' }];
  if (/^(?:atlas(?: \(c1\))?|axis(?: \(c2\))?|(?:cervical )?vertebra c[1-7](?: \(cervical\))?)$/.test(name))
    return [{ region: 'cervical-plexus/relations', tissue: 'bones' }];
  if (/^(?:intervertebral disc|nucleus pulposus|annulus fibrosus) c[1-6][-–]c[2-7]$/.test(name))
    return [{ region: 'cervical-plexus/relations', tissue: 'joints' }];
  if (/^(?:sternocleidomastoid|scalenus (?:anterior|medius|posterior)|(?:anterior|middle|posterior) scalene|longus colli|longus capitis|rectus capitis (?:anterior|lateralis)|levator scapulae)(?: muscle)?$/.test(name))
    return [{ region: 'cervical-plexus/relations', tissue: 'muscles' }];
  if (/^(?:trunk of )?(?:vertebral|subclavian|ascending cervical|deep cervical|transverse cervical|suprascapular|internal jugular|external jugular|anterior jugular|common carotid|internal carotid) (?:artery|vein)$/.test(name))
    return [{ region: 'cervical-plexus/relations', tissue: name.endsWith('vein') ? 'veins' : 'arteries' }];
  return [];
}
