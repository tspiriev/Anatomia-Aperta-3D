/** Sketchfab fits *all* visible geometry; an ID list alone cannot narrow it.
 * Temporarily mask only non-target geometry for the fit, then restore the latest
 * desired visibility. Never alter React visibility, undo or isolation snapshots.
 * Callers serialize fits so an older restoration cannot unmask a newer fit. */
export async function focusVisibleSubset(
  api: Pick<SketchfabAPI, 'hide' | 'show' | 'focusOnVisibleGeometries'>,
  targetIds: readonly number[],
  visibleGeometry: () => readonly number[],
  isCurrent: () => boolean,
  timeoutMs = 5000,
): Promise<void> {
  if (!api.focusOnVisibleGeometries || !isCurrent()) return;
  const targets = new Set(targetIds);
  const visible = [...new Set(visibleGeometry())];
  if (!visible.some(id => targets.has(id))) return;
  const masked = visible.filter(id => !targets.has(id));
  try {
    for (const id of masked) api.hide(id);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Camera focus timed out.')), timeoutMs);
      try {
        api.focusOnVisibleGeometries!(error => {
          clearTimeout(timer);
          if (error) reject(error);
          else resolve();
        });
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  } finally {
    // A hide/category change while fitting must never be undone by this cleanup.
    const desired = new Set(visibleGeometry());
    for (const id of masked) if (desired.has(id)) api.show(id);
  }
}
