import type { AnatomicalSystemId } from './anatomicalSystems';

/** Creator-requested system assignments take precedence over source exports. */
export function systemOverrideForMeshName(rawName: string): AnatomicalSystemId | null {
  // Both real muscle meshes are filed in the nervous-system export. Correct
  // their ownership before that source assignment can override muscle aliases.
  if (/^tensor[\s_]+(?:tympani|typmani)[\s_]+muscle(?:\.\d+|_\d+)*(?:\.[lr])?(?:\.\d+|_\d+)*$/i.test(rawName.trim()))
    return 'muscular';
  // Include both sides and Blender/Sketchfab duplicate suffixes, but not
  // ligaments, muscles, or other structures whose names mention these bones.
  return /^(?:incus|malleus|stapes)(?:\.\d+|_\d+)*(?:\.[lr])?(?:\.\d+|_\d+)*$/i.test(rawName.trim())
    ? 'nervous'
    : null;
}
