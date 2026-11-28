import { cervicalNerveLeaf } from './headNeckCervicalNerves';
import { neckInventorySubpath } from './headNeckNeurovascularInventory';
import { headNeckSubclavianArteryPath, headNeckSubclavianVeinPath } from './headNeckSubclavianVessels';
import { headNeckMuscleFamily } from './headNeckMuscleGroups';

/** Preserve existing parent paths and add drill-down memberships. The same
 * resolver powers sidebar, fullscreen, isolation, Show all and catalogue search. */
export function headNeckDetailedPaths(
  paths: readonly (readonly string[])[], rawName: string, canonicalName: string,
): readonly (readonly string[])[] {
  const result = [...paths];
  for (const path of paths) {
    const index = path.findIndex(part => ['nerves', 'arteries', 'veins', 'muscles'].includes(part));
    if (index < 0 || path[index + 1] === 'mandibular-pathway') continue;
    const base = path.slice(0, index + 1);
    const tissue = path[index];
    if (tissue === 'muscles') {
      result.push([...base, headNeckMuscleFamily(canonicalName)]);
      continue;
    }
    const subpath = neckInventorySubpath(rawName, tissue as 'nerves' | 'arteries' | 'veins');
    result.push([...base, ...subpath]);
    if (tissue === 'nerves') {
      const leaf = cervicalNerveLeaf(rawName, subpath[0], subpath[1]);
      if (leaf) result.push([...base, ...subpath, leaf]);
    } else {
      const branch = tissue === 'arteries' ? headNeckSubclavianArteryPath(rawName) : headNeckSubclavianVeinPath(rawName);
      if (branch) result.push([...base, 'subclavian', ...branch]);
    }
  }
  return [...new Map(result.map(path => [path.join('/'), path])).values()];
}
