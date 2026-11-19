import { ATLAS_VIEWS, CENTRAL_NERVOUS_SYSTEM_VIEW, TEMPORAL_ASSOCIATION_VIEW, THALAMUS_CAPSULE_VIEW, LONG_TRACTS_VIEW, SPINAL_CORD_VIEW, FULL_ANATOMY_VIEW, HEAD_NECK_TOPOGRAPHY_VIEW, NECK_TOPOGRAPHY_VIEW, UPPER_LIMB_TOPOGRAPHY_VIEW, LOWER_LIMB_TOPOGRAPHY_VIEW, MUSCULOSKELETAL_VIEW, SKULL_BASE_VIEW, type AtlasView } from './atlasViews';

export type AtlasNavigationMenu = {
  id: 'full-atlas' | 'nervous-system' | 'musculoskeletal-system' | 'skull-base' | 'topographic-anatomy' | 'cardiovascular-system' | 'internal-organs';
  label: string;
  views: readonly AtlasView[];
  comingSoon?: boolean;
};

// Navigation grouping only: atlas routes, model scopes and anatomy stay intact.
export const ATLAS_NAVIGATION_MENUS: readonly AtlasNavigationMenu[] = [
  {
    id: 'nervous-system',
    label: 'Nervous system',
    views: [
      ...ATLAS_VIEWS.filter((view) => view.initialSystemId === 'nervous' && !view.skullBase
        && !view.headNeckTopography && !view.neckTopography && !view.upperLimbTopography && !view.lowerLimbTopography
        && ![CENTRAL_NERVOUS_SYSTEM_VIEW.id, TEMPORAL_ASSOCIATION_VIEW.id, THALAMUS_CAPSULE_VIEW.id,
          LONG_TRACTS_VIEW.id, SPINAL_CORD_VIEW.id].includes(view.id))
        .flatMap(view => {
          if (view.id === 'brainstem-and-cerebellum')
            return [view, TEMPORAL_ASSOCIATION_VIEW, THALAMUS_CAPSULE_VIEW];
          if (view.id === 'cranial-nerves') return [view, LONG_TRACTS_VIEW, SPINAL_CORD_VIEW];
          return [view];
        }),
      CENTRAL_NERVOUS_SYSTEM_VIEW,
    ],
  },
  {
    id: 'skull-base',
    label: 'Skull base',
    views: [SKULL_BASE_VIEW],
  },
  {
    id: 'topographic-anatomy',
    label: 'Topographic anatomy',
    views: [HEAD_NECK_TOPOGRAPHY_VIEW, NECK_TOPOGRAPHY_VIEW, UPPER_LIMB_TOPOGRAPHY_VIEW, LOWER_LIMB_TOPOGRAPHY_VIEW],
  },
  {
    id: 'musculoskeletal-system',
    label: 'Musculoskeletal system',
    views: [MUSCULOSKELETAL_VIEW],
  },
  {
    id: 'cardiovascular-system',
    label: 'Cardiovascular system',
    views: [],
    comingSoon: true,
  },
  {
    id: 'internal-organs',
    label: 'Internal organs',
    views: [],
    comingSoon: true,
  },
  {
    id: 'full-atlas',
    label: 'Explore the full atlas',
    views: [FULL_ANATOMY_VIEW],
  },
];
