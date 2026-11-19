import type { UpperLimbMembership } from './upperLimbReferenceTopography';

/** Adapt the shared musculoskeletal paths only for the dedicated regional atlas. */
export function upperLimbDistalPath(path: readonly string[]): string[] {
  if (path[0] === 'hand') return ['hand-wrist', ...path.slice(1)];
  if (path[0] === 'wrist') return ['hand-wrist', 'wrist', ...path.slice(1)];
  return [...path];
}

export const HAND_WRIST_REGIONS = [
  'thenar', 'hypothenar', 'adductor', 'central', 'interosseous', 'dorsal', 'digital',
] as const;

export function upperLimbHandWristMemberships(
  memberships: readonly UpperLimbMembership[], name: string,
): UpperLimbMembership[] {
  const result = memberships.filter(m => {
    const distal = /^(?:hand|wrist)(?:\/|$)/.test(m.region);
    if (!distal) return true;
    if (name === 'antebrachial fascia') return false;
    return name !== 'palmar aponeurosis' || (m.region === 'hand' && m.tissue === 'fasciae');
  }).map(m => ({ ...m, region: upperLimbDistalPath(m.region.split('/')).join('/') }));
  if (name === 'palmar aponeurosis')
    result.push({ region: 'hand-wrist', tissue: 'fasciae' });
  const handBone = /^(?:(?:scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate) bone|(?:first|second|third|fourth|fifth) metacarpal bone|(?:proximal|middle|distal) phalanx of (?:first|second|third|fourth|fifth) finger of hand)$/.test(name);
  if (handBone) {
    for (const region of ['', ...HAND_WRIST_REGIONS])
      result.push({ region: `hand-wrist${region ? `/${region}` : ''}`, tissue: 'bones' });
    // Retain the complete hand/wrist scaffold in both wrist surfaces as well.
    for (const region of ['wrist', 'wrist/palmar', 'wrist/dorsal'])
      result.push({ region: `hand-wrist/${region}`, tissue: 'bones' });
  }
  if (/^(?:(?:superficial|deep)(?: venous)? palmar arch|(?:radial|ulnar) artery)$/.test(name))
    for (const region of ['dorsal', 'digital', 'wrist/dorsal'])
      result.push({ region: `hand-wrist/${region}`, tissue: /venous/.test(name) ? 'veins' : 'arteries' });
  return result;
}
