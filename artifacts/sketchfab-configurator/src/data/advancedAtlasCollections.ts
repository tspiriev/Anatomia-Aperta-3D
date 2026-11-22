import { ADVANCED_NEUROANATOMY_GROUPS } from './advancedNeuroanatomy';
import whiteMatterImage from '../assets/advanced-white-matter.webp';
import brainstemImage from '../assets/advanced-brainstem.webp';
import spinalCordImage from '../assets/advanced-spinal-cord.webp';
import basalGangliaDiencephalonImage from '../assets/advanced-basal-ganglia-diencephalon.webp';
import meningesImage from '../assets/advanced-meninges.webp';
import { MENINGES_GROUP } from './meningesTaxonomy';
import limbicImage from '../assets/advanced-limbic.webp';
import { LIMBIC_GROUP } from './limbicTaxonomy';
import basalForebrainImage from '../assets/advanced-basal-forebrain.webp';
import { BASAL_FOREBRAIN_GROUP } from './basalForebrainTaxonomy';
import { VENTRICULAR_GROUP } from './ventricularTaxonomy';
import ventricularImage from '@/assets/advanced-ventricular-system.png';

export const VENTRICULAR_ATLAS_COLLECTION = {
  id: VENTRICULAR_GROUP.id, label: VENTRICULAR_GROUP.label,
  image: ventricularImage, path: VENTRICULAR_GROUP.id.split('/'),
};

export type AdvancedCollectionRequest = { id: string; revision: number };
export const BASAL_FOREBRAIN_ATLAS_COLLECTION = {
  id: BASAL_FOREBRAIN_GROUP.id, label: BASAL_FOREBRAIN_GROUP.label,
  image: basalForebrainImage, path: BASAL_FOREBRAIN_GROUP.id.split('/'),
};

export const LIMBIC_ATLAS_COLLECTION = {
  id: LIMBIC_GROUP.id,
  label: LIMBIC_GROUP.label,
  image: limbicImage,
  path: LIMBIC_GROUP.id.split('/'),
};

export const MENINGES_ATLAS_COLLECTION = {
  id: MENINGES_GROUP.id,
  label: MENINGES_GROUP.label,
  image: meningesImage,
  path: MENINGES_GROUP.id.split('/'),
};

const images: Record<string, string> = {
  'white-matter': whiteMatterImage,
  diencephalon: basalGangliaDiencephalonImage,
  brainstem: brainstemImage,
  'spinal-cord': spinalCordImage,
};

export const ADVANCED_ATLAS_COLLECTIONS = ADVANCED_NEUROANATOMY_GROUPS.map((group) => ({
  id: group.id,
  label: group.label,
  image: images[group.id.split('/').at(-1)!],
  path: group.id.split('/'),
}));

