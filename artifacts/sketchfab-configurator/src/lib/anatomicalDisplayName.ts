/** Display corrections never change raw scene names or geometry identifiers. */
export function formatAnatomicalName(rawName: string, modelUid?: string): string {
  const corrected = modelUid === '7f0c31427e24481797eba7369bc4c505'
    ? rawName.trim().replace(/^Motor root of trigeminal nerve(?=[._][lr](?:[._\d]*)$)/i, 'Motor nucleus of trigeminal nerve')
    : rawName;
  const withoutId = corrected.trim()
    .replace(/^tensor[ _]+typmani[ _]+muscle(?=[._]|$)/i, 'Tensor tympani muscle')
    .replace(/_\d+$/, '')
    .replace(/([._][lr])(?:\.\d{3})+$/i, '$1');
  const sideMarker = withoutId.match(/[._]([lr])$/i);
  if (!sideMarker || sideMarker.index === undefined) return withoutId;
  const structureName = withoutId.slice(0, sideMarker.index).trim();
  const side = sideMarker[1].toLowerCase() === 'l' ? 'Left' : 'Right';
  return `${structureName} (${side})`;
}
