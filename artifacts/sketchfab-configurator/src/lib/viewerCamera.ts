export type ViewerCamera = { position: number[]; target: number[] };

/** Sketchfab's Z-up coordinates: no anterior/posterior or lateral obliquity. */
export function superiorViewerCamera(camera: ViewerCamera, zoomScale = 1): ViewerCamera {
  const distance = Math.max(0.001, Math.hypot(...camera.position.map((value, i) => value - camera.target[i])) * zoomScale);
  return { target: [...camera.target], position: [camera.target[0], camera.target[1], camera.target[2] + distance] };
}

/** Pure lateral profile in the model's Z-up coordinates; preserve fitted zoom. */
export function profileViewerCamera(camera: ViewerCamera): ViewerCamera {
  const distance = Math.max(0.001, Math.hypot(...camera.position.map((value, i) => value - camera.target[i])));
  return { target: [...camera.target], position: [camera.target[0] + distance, camera.target[1], camera.target[2]] };
}

export function captureViewerCamera(api: Pick<SketchfabAPI, 'getCameraLookAt'>): Promise<ViewerCamera | null> {
  return new Promise((resolve) => {
    if (!api.getCameraLookAt) return resolve(null);
    const timer = setTimeout(() => resolve(null), 500);
    api.getCameraLookAt((error, camera) => {
      clearTimeout(timer);
      const valid = (vector: unknown): vector is number[] =>
        Array.isArray(vector) && vector.length === 3 && vector.every(Number.isFinite);
      resolve(!error && camera && valid(camera.position) && valid(camera.target)
        ? { position: [...camera.position], target: [...camera.target] } : null);
    });
  });
}

// Queue completion means visibility commands have been sent, not necessarily
// that the renderer has applied them. Allow two further frames before fitting.
export function waitForViewerVisibility(
  isCurrent: () => boolean,
  remaining: () => number,
  isFlushing: () => boolean,
  schedule: (callback: () => void) => void = requestAnimationFrame,
): Promise<boolean> {
  return new Promise((resolve) => {
    let previousRemaining = remaining();
    let lastProgress = Date.now();
    let settledFrames = 0;
    const check = () => {
      if (!isCurrent()) return resolve(false);
      const count = remaining();
      if (!isFlushing() && count === 0) {
        if (++settledFrames >= 3) return resolve(true);
      } else {
        settledFrames = 0;
      }
      if (count < previousRemaining) lastProgress = Date.now();
      previousRemaining = count;
      if (Date.now() - lastProgress > 10000) return resolve(false);
      schedule(check);
    };
    check();
  });
}
