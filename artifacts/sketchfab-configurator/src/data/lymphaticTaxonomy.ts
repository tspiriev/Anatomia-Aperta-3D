import type { NervousGroup } from './nervousTaxonomy';

// The export has one flat collection. Preserve its lymph nodes as a single
// collection rather than inventing regional assignments from ambiguous names.
export const LYMPHATIC_GROUPS: readonly NervousGroup[] = [
  { id: 'lymph-nodes', label: 'Lymph nodes' },
  {
    id: 'lymphoid-organs',
    label: 'Lymphoid organs',
    children: [
      { id: 'spleen', label: 'Spleen' },
      { id: 'thymus', label: 'Thymus' },
      { id: 'tonsils', label: 'Palatine tonsils' },
    ],
  },
];

export function classifyLymphaticObject(rawName: string): readonly string[] | null {
  const name = rawName.trim().toLowerCase()
    .replace(/(?:\.(?:l|r|\d+)|_\d+)+$/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
  if (name === 'spleen') return ['lymphoid-organs', 'spleen'];
  if (/^(?:left|right) lobe of thymus$/.test(name)) return ['lymphoid-organs', 'thymus'];
  if (name === 'palatine tonsil') return ['lymphoid-organs', 'tonsils'];
  if (/\bnodes?\b/.test(name)) return ['lymph-nodes'];
  return null;
}
