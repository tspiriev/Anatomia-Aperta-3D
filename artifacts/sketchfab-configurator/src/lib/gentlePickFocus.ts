import type { ViewerCamera } from './viewerCamera';

function vector(value: unknown): number[] | null {
  if (!Array.isArray(value) && !(ArrayBuffer.isView(value) && 'length' in value)) return null;
  const items = Array.from(value as ArrayLike<unknown>);
  return items.length === 3 && items.every(item => typeof item === 'number' && Number.isFinite(item))
    ? items as number[] : null;
}

/** Frame the actual world-space click, not the bounds of a long tract or the
 * origin of its parent transform. Never changes geometry or material state. */
export function gentlePickCamera(camera: ViewerCamera, point: unknown, minimumDistance = 0): ViewerCamera | null {
  const target = vector(point), position = vector(camera?.position), previousTarget = vector(camera?.target);
  if (!target || !position || !previousTarget) return null;
  const offset = position.map((value, i) => value - previousTarget[i]);
  const distance = Math.hypot(...offset);
  if (distance < 0.000001) return null;
  const nextDistance = Math.min(distance, Math.max(distance * 0.92, minimumDistance));
  return { target, position: target.map((value, i) => value + offset[i] * nextDistance / distance) };
}

/** Each viewer gets its own zoom floor: repeated picks recenter without
 * progressively zooming into an unusably small region. Manual closer zoom
 * is respected. Late camera callbacks cannot override a newer selection. */
export function createGentlePickFocus(
  api: Pick<SketchfabAPI, 'getCameraLookAt' | 'setCameraLookAt'>,
  isCurrent: () => boolean,
): (point: unknown) => void {
  let minimumDistance: number | null = null;
  let request = 0;
  return (point) => {
    const ticket = ++request;
    const target = vector(point);
    if (!target || !isCurrent() || !api.getCameraLookAt || !api.setCameraLookAt) return;
    try {
      api.getCameraLookAt((error, camera) => {
        if (error || ticket !== request || !isCurrent()) return;
        const next = gentlePickCamera(camera, target, minimumDistance ?? 0);
        if (!next) return;
        if (minimumDistance === null)
          minimumDistance = Math.hypot(...next.position.map((value, i) => value - next.target[i]));
        try {
          api.setCameraLookAt!(next.position, next.target, 0.55);
        } catch (error) {
          console.warn('[camera] Could not center the selected structure.', error);
        }
      });
    } catch (error) {
      console.warn('[camera] Could not read the current camera.', error);
    }
  };
}
