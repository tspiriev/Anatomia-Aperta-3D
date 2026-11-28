import { skullBaseName } from './skullBaseSources';

type Supply = 'sca' | 'aica' | 'pica';
type CerebellarPart = {
  id: string;
  label: string;
  names: readonly string[];
  supply: readonly Supply[];
  surface?: boolean;
};
type Section = { id: string; label: string; parts: readonly CerebellarPart[] };
const part = (id: string, label: string, names: string[], supply: Supply[], surface = true): CerebellarPart =>
  ({ id, label, names, supply, surface });

// Typical arterial associations, not segmented or patient-specific perfusion territories.
// https://pmc.ncbi.nlm.nih.gov/articles/PMC11352334/
export const CEREBELLAR_SUPPLY_REFERENCE = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11352334/';
export const CEREBELLAR_ARTERIES: Record<Supply, string> = {
  sca: 'Superior cerebellar artery',
  aica: 'Anterior inferior cerebellar artery',
  pica: 'Posterior inferior cerebellar artery',
};
export const SKULL_BASE_CEREBELLAR_SECTIONS: readonly Section[] = [
  { id: 'anterior-lobe', label: 'Anterior lobe (I–V)', parts: [
    part('lingula', 'Lingula', ['Lingula of cerebellum'], ['sca']),
    part('central-lobule', 'Central lobule and wings', ['Central lobule', 'Wing of central lobule'], ['sca']),
    part('culmen', 'Culmen', ['Culmen'], ['sca']),
    part('anterior-quadrangular', 'Anterior quadrangular lobule', ['Anterior quadrangular lobule'], ['sca']),
  ] },
  { id: 'posterior-lobe', label: 'Posterior lobe (VI–IX)', parts: [
    part('declive', 'Declive (variable SCA/PICA border)', ['Declive'], ['sca', 'pica']),
    part('posterior-quadrangular', 'Posterior quadrangular lobule', ['Posterior quadrangular lobule'], ['sca']),
    part('folium', 'Folium of vermis', ['Folium of vermis'], ['sca']),
    part('superior-semilunar', 'Superior semilunar lobule', ['Superior semilunar lobule'], ['sca']),
    part('tuber', 'Tuber of vermis', ['Tuber of vermis'], ['pica']),
    part('inferior-semilunar', 'Inferior semilunar lobule', ['Inferior semilunar lobule'], ['pica']),
    part('gracile', 'Gracile lobule', ['Gracile lobule'], ['pica']),
    part('biventral', 'Biventral lobule', ['Biventral lobule'], ['pica']),
    part('pyramis', 'Pyramis of vermis', ['Pyramis of vermis'], ['pica']),
    part('uvula', 'Uvula of vermis', ['Uvula of vermis'], ['pica']),
    part('tonsils', 'Cerebellar tonsils', ['Tonsil of cerebellum'], ['pica']),
  ] },
  { id: 'flocculonodular-lobe', label: 'Flocculonodular lobe (X)', parts: [
    part('flocculus', 'Flocculus and its peduncle', ['Flocculus', 'Peduncle of flocculus'], ['aica']),
    part('nodule', 'Nodule of vermis', ['Nodule of vermis'], ['pica']),
  ] },
  { id: 'deep-nuclei', label: 'Deep cerebellar nuclei (mainly SCA)', parts: [
    part('dentate', 'Dentate nuclei', ['Dentate_nucleus'], ['sca'], false),
    part('emboliform', 'Emboliform nuclei', ['Nucleus_emboliformis'], ['sca'], false),
    part('globose', 'Globose nuclei', ['Nucleus_globosus'], ['sca'], false),
    part('fastigial', 'Fastigial nuclei (variable SCA/PICA supply)', ['Nucleus_fastigii'], ['sca', 'pica'], false),
  ] },
  { id: 'peduncles', label: 'Available cerebellar peduncles', parts: [
    part('superior-peduncles', 'Superior cerebellar peduncles', ['Superior cerebellar peduncle'], ['sca'], false),
  ] },
];

const posterior = ['advanced-neuroanatomy', 'skull-base', 'posterior-fossa'];
export const SKULL_BASE_WHOLE_CEREBELLUM_PATH = [...posterior, 'cerebellum'];
export const SKULL_BASE_VASCULAR_CEREBELLUM_PATH = ['advanced-neuroanatomy', 'skull-base', 'vascular', 'cerebellum'];
export const SKULL_BASE_CEREBELLUM_DETAIL_PATH = [...posterior, 'cerebellum-advanced'];
const within = (path: readonly string[], parent: readonly string[]) => parent.every((p, i) => path[i] === p);
const parts = SKULL_BASE_CEREBELLAR_SECTIONS.flatMap(section =>
  section.parts.map(part => ({
    ...part, keys: new Set(part.names.map(skullBaseName)),
    path: [...SKULL_BASE_CEREBELLUM_DETAIL_PATH, section.id, part.id],
  })));
const fusedSurfaceNames = new Set(['Cerebellum', 'Cerebellar hemisphere', 'Vermis', 'Cerebellar vermis'].map(skullBaseName));
const brainstem = new Set(['Midbrain', 'Pons', 'Medulla oblongata', 'Brainstem', 'Brain stem'].map(skullBaseName));

export function isSkullBaseCerebellarSurface(rawName: string): boolean {
  const key = skullBaseName(rawName);
  return fusedSurfaceNames.has(key) || parts.some(part => part.surface && part.keys.has(key));
}
export function isSkullBaseCerebellarStructure(rawName: string): boolean {
  const key = skullBaseName(rawName);
  return fusedSurfaceNames.has(key) || parts.some(part => part.keys.has(key));
}
export const isSkullBaseCerebellumDetailPath = (path: readonly string[]) =>
  within(path, SKULL_BASE_CEREBELLUM_DETAIL_PATH);

export const SKULL_BASE_CEREBELLUM_ENTRY = {
  id: 'cerebellum-advanced', label: 'Cerebellum — parts and arterial supply',
  children: SKULL_BASE_CEREBELLAR_SECTIONS.map(section => ({
    id: section.id, label: section.label,
    children: section.parts.map(part => ({
      id: part.id, label: `${part.label} — ${part.supply.map(supply => supply.toUpperCase()).join(' / ')}`,
    })),
  })),
};

export function skullBaseCerebellumPathForGroup(rawName: string, requested: readonly string[]): readonly string[] | null {
  const key = skullBaseName(rawName);
  if (!isSkullBaseCerebellumDetailPath(requested)) {
    if (isSkullBaseCerebellarSurface(rawName)) {
      const wholePath = [SKULL_BASE_WHOLE_CEREBELLUM_PATH, SKULL_BASE_VASCULAR_CEREBELLUM_PATH,
        [...posterior, 'cpa', 'cerebellum']]
        .find(path => within(path, requested));
      if (wholePath) return wholePath;
    }
    // Internal nuclei/peduncles remain available in the full posterior view,
    // but do not become part of the combined surface shell.
    return parts.find(part => !part.surface && part.keys.has(key) && within(part.path, requested))?.path ?? null;
  }
  const candidates = parts.filter(part => within(part.path, requested));
  const direct = candidates.find(part => part.keys.has(key));
  if (direct) return direct.path;
  // Each selectable anatomical collection includes its typical supplying
  // arterial meshes and gross brainstem reference, without fabricating branches.
  return candidates.find(part => brainstem.has(key)
    || part.supply.some(supply => skullBaseName(CEREBELLAR_ARTERIES[supply]) === key))?.path ?? null;
}
