import { cervicalNerveName, headNeckCervicalNerveFamily } from './headNeckCervicalNerves';
import type { NeckTissue } from './neckTopographyRegions';
import type { SceneNode } from '../types/sketchfab';

type Membership = { region: string; tissue: NeckTissue };
const root = 'cervical-plexus';
const nameOf = (raw: string) => cervicalNerveName(raw.replace(/_\d+$/, ''));
const cervicalBones = /^(?:atlas \(c1\)|axis \(c2\)|vertebra c[1-7])$/;
const hypoglossal = /^(?:trunk of )?hypoglossal nerve(?: \(xii\))?$/;
const posteriorBranches = /^(?:greater occipital|third occipital|suboccipital) nerve$/;
const ansaTargets = /^(?:sternohyoid|sternothyroid|omohyoid)(?: muscle)?$/;
const c1Targets = /^(?:geniohyoid|thyrohyoid)(?: muscle)?$/;
const tongueTargets = /^(?:genioglossus|hyoglossus|styloglossus)(?: muscle)?$/;
const brainstem = /^(?:pons|medulla oblongata)$/;
const subclavianArteries = /^(?:(?:subclavian|vertebral|inferior thyroid|ascending cervical|transverse cervical|suprascapular|dorsal scapular|deep cervical|internal thoracic|supreme intercostal|(?:first|second) posterior intercostal) artery|(?:thyrocervical|costocervical) trunk|(?:superficial|deep) branch of transverse cervical artery)$/;

export function isNeckPeripheralDisc(raw: string): boolean {
  // There is no C1–C2 intervertebral disc. Preserve partial/duplicate source meshes.
  return /^(?:intervertebral disc|nucleus pulposus|annulus fibrosus) c[2-7][-–](?:c[3-7]|t1)$/.test(nameOf(raw));
}

/** Reorganize only the independent Neck atlas, not the shared Head taxonomy. */
export function neckPeripheralMemberships(raw: string, memberships: readonly Membership[]): Membership[] {
  const name = nameOf(raw), family = headNeckCervicalNerveFamily(raw);
  const result = memberships.map(m => ({
    ...m, region: m.region.replace(/^cervical-plexus\/(?:roots|cutaneous)(?=\/|$)/, `${root}/plexus`),
  }));
  const add = (tissue: NeckTissue, regions: readonly string[]) => {
    regions.forEach(region => result.push({ region: `${root}/${region}`, tissue }));
  };
  const level = Number(name.match(/\bc([1-8])\b/)?.[1]);
  const spinal = family === 'spinal-roots' || family === 'spinal-nerves';
  if ((spinal && level >= 1 && level <= 4) || posteriorBranches.test(name))
    add('nerves', ['plexus', 'ansa']);
  if ((spinal && level >= 1 && level <= 3)
    || (family === 'spinal-roots' && level >= 3 && level <= 5) || posteriorBranches.test(name))
    add('nerves', ['phrenic']);
  if (family === 'cervical-plexus') add('nerves', ['plexus']);
  if (hypoglossal.test(name)) add('nerves', ['ansa', 'c1-via-xii']);
  if (brainstem.test(name)) add('nerves', ['ansa']);
  if (ansaTargets.test(name)) add('muscles', ['ansa']);
  if (c1Targets.test(name) || tongueTargets.test(name)) add('muscles', ['c1-via-xii']);
  if (/^scalenus (?:anterior|posterior)(?: muscle)?$/.test(name)) add('muscles', ['phrenic']);
  if (cervicalBones.test(name))
    add('bones', ['plexus', 'ansa', 'phrenic', 'spinal-context', 'relations']);
  if (name === 'clavicle') add('bones', ['phrenic']);
  if (isNeckPeripheralDisc(raw))
    add('joints', ['plexus', 'ansa', 'phrenic', 'spinal-context', 'relations']);
  if (subclavianArteries.test(name.replace(/[()]/g, '')))
    add('arteries', ['relations']);
  return result;
}

function peripheralScope(path: readonly string[]): boolean {
  return path[0] === 'advanced-neuroanatomy' && path[1] === 'neck-topography' && path[2] === root;
}

/** Nerve selections retain requested teaching references, not unrelated nerves.
 * Empty selections (Hide) never reintroduce support, and bone-only views stay so.
 */
export function neckPeripheralSupportIds(
  nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[],
): number[] {
  if (!peripheralScope(path) || !ids.length) return [];
  const selected = new Set(ids), scope = path[3];
  const names = nodes.filter(node => selected.has(node.instanceID)).map(node => nameOf(node.rawName));
  const wanted = scope === 'plexus' ? names.some(name =>
    /\bnerve\b|ansa cervical|^c[1-4] |root|ganglion/.test(name))
    : scope === 'ansa' ? names.some(name => /ansa cervical/.test(name))
    : scope === 'phrenic' ? names.some(name => /phrenic nerve/.test(name))
    : scope === 'c1-via-xii' ? names.some(name => hypoglossal.test(name)) : false;
  if (!wanted) return [];
  return nodes.filter(node => neckPeripheralMemberships(node.rawName, []).some(m =>
    m.region === `${root}/${scope}` && (scope !== 'plexus' || m.tissue === 'bones' || m.tissue === 'joints')))
    .map(node => node.instanceID);
}

export function neckPeripheralContextIds(
  nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[],
): number[] {
  if (!peripheralScope(path)) return [];
  const visible = new Set(ids);
  return nodes.filter(node => visible.has(node.instanceID)
    && (isNeckPeripheralDisc(node.rawName) || brainstem.test(nameOf(node.rawName))))
    .map(node => node.instanceID);
}
