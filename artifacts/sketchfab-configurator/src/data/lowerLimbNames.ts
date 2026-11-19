export function lowerLimbName(raw: string): string {
  return raw.replace(/_\d+$/, '').toLowerCase().replace(/\.$/, '')
    .replace(/(?:\.\d+)+$/, '').replace(/\.[lr]$/, '')
    .replace(/^fj\d+_bp\d+_fma\d+_/, '').replace(/_/g, ' ')
    .replace(/\b(?:left|right)\b/g, '').replace(/[()]/g, '')
    .replace(/\s+/g, ' ').trim();
}
