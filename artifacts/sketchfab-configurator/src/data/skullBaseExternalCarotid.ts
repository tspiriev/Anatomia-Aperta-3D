import { skullBaseName, skullBaseVascularSource } from './skullBaseSources';

// Reviewed ECA tree, not the source's Head & Face collection: that collection
// also contains internal-carotid, cerebral and even pulmonary arteries.
export const SKULL_BASE_EXTERNAL_CAROTID_NAMES = [
  'External carotid artery', 'Ascending pharyngeal artery', 'Occipital artery',
  'FJ5011_BP29192_FMA66472_Trunk of right superior thyroid artery',
  'FJ5072_BP29683_FMA49484_Right cricothyroid artery',
  'FJ5117_BP29142_FMA66447_Trunk of right lingual artery',
  'Facial artery', 'Angular artery', 'Inferior labial artery', 'Superior labial artery', 'Submental artery',
  'Superficial temporal artery', 'Frontal branch of superficial temporal artery', 'Transverse facial artery',
  'Maxillary artery', 'Middle meningeal artery', 'Accessory branch of middle meningeal artery',
  'Frontal branch middle meningeal artery', 'Parietal branch middle meningeal artery',
  'Inferior alveolar artery', 'Mental branch of inferior alveolar artery',
  'Mylohyoid branch of inferior alveolar artery', 'Anterior deep temporal artery',
  'Posterior deep temporal artery', 'Buccal artery', 'Artery of pterygoid canal',
  'Descending palatine artery', 'Greater palatine artery', 'Infra-orbital artery',
  'Posterior superior alveolar artery', 'Posterior lateral nasal branches of sphenopalatine artery',
  'Posterior septal branches of sphenopalatine artery',
] as const;
const names = new Set(SKULL_BASE_EXTERNAL_CAROTID_NAMES.map(skullBaseName));
export const isSkullBaseExternalCarotid = (name: string): boolean => {
  const key = skullBaseName(name);
  return skullBaseVascularSource.has(key) && names.has(key);
};

// The revised Head/neck model uses plain names as well as the original FMA
// exports. Keep its explicit live identities separate from the source-backed
// Skull base predicate above, and share them between membership and grouping.
const externalCarotidName = (rawName: string) => skullBaseName(rawName)
  .replace(/^fj\d+ bp\d+ fma\d+ /, '').replace(/\b(?:left|right)\b/g, '').replace(/\s+/g, ' ').trim();
const headNeckNames = new Set([
  ...SKULL_BASE_EXTERNAL_CAROTID_NAMES,
  'Superior thyroid artery', 'Lingual artery', 'Cricothyroid artery',
  'Posterior auricular artery', 'Stylomastoid artery', 'Sphenopalatine artery',
  'Lesser palatine artery', 'Middle temporal artery', 'Anterior auricular artery',
  'Parietal branch of superficial temporal artery', 'Zygomaticoorbital artery',
  'Anterior glandular branch of superior thyroid artery',
  'Posterior glandular branch of superior thyroid artery',
  'FJ5024_BP29706_FMA49489_Anterior glandular branch of right supe',
].map(externalCarotidName));
export const isHeadNeckExternalCarotid = (rawName: string): boolean => headNeckNames.has(externalCarotidName(rawName));
