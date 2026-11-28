import csv from '@assets/Internal_organs_1790925899980.csv?raw';
import { csvRows } from './anatomicalSystems';
import type { NervousGroup } from './nervousTaxonomy';

export const VISCERA_GROUPS: readonly NervousGroup[] = [
  {
    id: 'respiratory', label: '01 Respiratory System',
    children: [
      { id: 'upper-airways', label: 'Upper Airways' },
      { id: 'tracheobronchial-tree', label: 'Tracheobronchial Tree' },
      { id: 'right-lung', label: 'Right Lung' },
      { id: 'left-lung', label: 'Left Lung' },
    ],
  },
  {
    id: 'digestive', label: '02 Digestive System',
    children: [
      { id: 'oral-cavity', label: 'Oral Cavity & Salivary Glands' },
      { id: 'pharynx-oesophagus', label: 'Pharynx & Oesophagus' },
      { id: 'stomach', label: 'Stomach' },
      { id: 'small-intestine', label: 'Small Intestine' },
      { id: 'large-intestine', label: 'Large Intestine' },
      { id: 'liver-gallbladder', label: 'Liver & Gallbladder' },
      { id: 'pancreas', label: 'Pancreas' },
    ],
  },
  {
    id: 'urinary', label: '03 Urinary System',
    children: [
      { id: 'right-kidney-ureter', label: 'Right Kidney & Ureter' },
      { id: 'left-kidney-ureter', label: 'Left Kidney & Ureter' },
      { id: 'bladder-urethra', label: 'Bladder & Urethra' },
    ],
  },
  {
    id: 'male-reproductive', label: '04 Male Reproductive System',
    children: [
      { id: 'testes-epididymides', label: 'Testes & Epididymides' },
      { id: 'ductus-seminal-glands', label: 'Ductus Deferens & Seminal Glands' },
      { id: 'prostate-ejaculatory-ducts', label: 'Prostate & Ejaculatory Ducts' },
      { id: 'penis', label: 'Penis' },
    ],
  },
  {
    id: 'endocrine', label: '05 Endocrine System',
    children: [
      { id: 'pituitary-pineal', label: 'Pituitary & Pineal' },
      { id: 'thyroid-parathyroids', label: 'Thyroid & Parathyroids' },
      { id: 'suprarenal-glands', label: 'Suprarenal Glands' },
    ],
  },
];

// The uploaded Blender export is authoritative. Use exact collection/object
// membership rather than guessing anatomy from object-name keywords.
const pathByCollection = new Map<string, readonly string[]>();
for (const group of VISCERA_GROUPS) {
  pathByCollection.set(group.label, [group.id]);
  for (const child of group.children ?? []) {
    pathByCollection.set(child.label, [group.id, child.id]);
  }
}

const pathByObject = new Map<string, readonly string[]>();
for (const row of csvRows(csv)) {
  if (row[0] !== 'OBJECT' || row[5] !== 'MESH' || !row[4]) continue;
  const path = pathByCollection.get(row[1]);
  if (!path) continue; // "99 Other - Review" stays available, but unassigned.
  const key = row[4].trim().toLowerCase();
  const previous = pathByObject.get(key);
  if (previous && previous.join('/') !== path.join('/')) {
    throw new Error(`Viscera region is ambiguous for ${row[4]}`);
  }
  pathByObject.set(key, path);
}

export function classifyVisceraObject(rawName: string): readonly string[] | null {
  const key = rawName.trim().toLowerCase();
  return pathByObject.get(key) ?? pathByObject.get(key.replace(/_\d+$/, '')) ?? null;
}