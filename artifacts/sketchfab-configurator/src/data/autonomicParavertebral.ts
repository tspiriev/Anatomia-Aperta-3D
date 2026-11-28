export const AUTONOMIC_PARAVERTEBRAL_SELECTIONS = [
  ['ganglia', 'Paravertebral sympathetic ganglia'],
  ['grey-rami', 'Rami communicantes grisei (grey rami)'],
  ['white-rami', 'Rami communicantes albi (white rami)'],
  ['cervical-roots', 'Cervical spinal roots (C1–C8)'],
  ['thoracic-roots', 'Thoracic spinal roots (T1–T12)'],
] as const;

const ganglia = new Set([
  'paravertebral sympathetic ganglia', 'paravertebral sympathetic ganglion',
  'thoracic sympathetic ganglia', 'lumbar sympathetic ganglia', 'sacral sympathetic ganglia',
  'sympathetic ganglia thoracic region', 'sympathetic gangion lumbar region',
  'sympathetic ganglia lumbar region', 'sympathetic ganglia sacral region',
  'superior cervical sympathetic ganglion', 'middle cervical sympathetic ganglion',
  'inferior cervical sympathetic ganglion', 'superior cervical ganglion',
  'middle cervical ganglion', 'inferior cervical ganglion',
  'cervicothoracic ganglion (stellatum)', 'cervicothoracic ganglion', 'stellate ganglion',
]);

/** Receives the shared autonomic-normalized key, preserving source spelling.
 * Dorsal root ganglia are not paravertebral sympathetic ganglia. */
export function autonomicParavertebralSelection(key: string): string | null {
  if (ganglia.has(key)) return 'ganglia';
  const ramus = /^rami communicantes (albi|grisei)(?: ?(?:cervical|thoracic|lumbar|sacral) (?:region|retion))?$/.exec(key);
  if (ramus) return ramus[1] === 'albi' ? 'white-rami' : 'grey-rami';
  const root = /^(c[1-8]|(?:t|th)(?:[1-9]|1[0-2])) (?:(?:anterior|posterior|dorsal|ventral)(?: nerve)? roots?|nerve roots?|roots?)(?: (?:left|right))?$/.exec(key);
  if (root) return root[1].startsWith('c') ? 'cervical-roots' : 'thoracic-roots';
  if (/^c[12] anterior posterior$/.test(key)) return 'cervical-roots';
  return null;
}
