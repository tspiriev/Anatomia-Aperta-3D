import { cervicalNerveName } from './headNeckCervicalNerves';
import type { NeckTissue } from './neckTopographyRegions';
import type { SceneNode } from '../types/sketchfab';

const name = (rawName: string) => cervicalNerveName(rawName.replace(/_\d+$/, ''));
const platysma = (rawName: string) => /^platysma(?: muscle)?$/.test(name(rawName));
const investing = (rawName: string) => /^superficial investing (?:cervical )?fascia$/.test(name(rawName));
const trunk = (rawName: string) =>
  /^(?:(?:common|external|internal) carotid artery|internal jugular vein)$/.test(name(rawName));
type Membership = { region: string; tissue: NeckTissue };

/** Creator-reviewed changes apply to the anterior triangle, not other regions. */
export function neckAnteriorMemberships(rawName: string, memberships: readonly Membership[]): Membership[] {
  const result = memberships.filter(m =>
    !(platysma(rawName) && m.region.startsWith('anterior-triangle/submental'))
    && !(investing(rawName) && m.region.startsWith('anterior-triangle')));
  if (investing(rawName)) result.push({ region: 'anterior-triangle/muscular', tissue: 'fasciae' });
  if (trunk(rawName)) result.push({
    region: 'anterior-triangle/submandibular', tissue: /vein$/.test(name(rawName)) ? 'veins' : 'arteries',
  });
  return result;
}

export function isNeckAnteriorHiddenLayer(node: Pick<SceneNode, 'rawName'>, path: readonly string[]): boolean {
  if (path[0] !== 'advanced-neuroanatomy' || path[1] !== 'neck-topography'
    || path[2] !== 'anterior-triangle') return false;
  return (investing(node.rawName) && path[3] !== 'muscular')
    || (platysma(node.rawName) && (path.length === 3 || path[3] === 'submental'));
}
export function neckAnteriorHiddenLayerIds(nodes: readonly SceneNode[], path: readonly string[]): number[] {
  return nodes.filter(node => isNeckAnteriorHiddenLayer(node, path)).map(node => node.instanceID);
}

/** Keep both arterial origins and venous drainage when browsing branch vessels. */
export function neckSubmandibularSupportIds(
  nodes: readonly SceneNode[], ids: readonly number[], path: readonly string[],
): number[] {
  if (path[0] !== 'advanced-neuroanatomy' || path[1] !== 'neck-topography'
    || path[2] !== 'anterior-triangle' || path[3] !== 'submandibular') return [];
  const selected = new Set(ids);
  return nodes.some(node => selected.has(node.instanceID)
    && /^(?:lingual vein|facial artery|common facial vein)$/.test(name(node.rawName)))
    ? nodes.filter(node => trunk(node.rawName)).map(node => node.instanceID) : [];
}
