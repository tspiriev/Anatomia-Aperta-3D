import { ATLAS_VIEWS, SPINAL_REFERENCE_VIEWS } from '../data/atlasViews';
import { legalPolicies } from '../data/legalPolicies';

// The creator's purchased public domain, not the temporary development address.
export const SITE_URL = 'https://anatomiaaperta.org';
export const SITE_NAME = 'Anatomia Aperta 3D';
export const SOCIAL_IMAGE = `${SITE_URL}/social-preview.jpg`;

export type SeoPage = {
  path: string;
  title: string;
  description: string;
  heading: string;
  noindex?: boolean;
};

export const atlasSeoViews = [...ATLAS_VIEWS, ...SPINAL_REFERENCE_VIEWS];
export const seoPages: SeoPage[] = [
  {
    path: '/', title: 'Free 3D Human Anatomy Atlas | Anatomia Aperta 3D',
    description: 'Explore a free, open-access 3D human anatomy atlas. Study the brain, nerves, muscles, bones and organs with interactive models for education and research.',
    heading: 'Anatomia Aperta 3D — Interactive human anatomy atlas',
  },
  ...atlasSeoViews.map(view => ({
    path: view.href,
    title: view.href === '/atlas'
      ? 'Interactive 3D Anatomy Atlas | Anatomia Aperta 3D'
      : `${view.label} — 3D Atlas | Anatomia Aperta 3D`,
    description: `${view.spinalReferenceModelUid ? `${view.label}: ` : ''}${view.description.replace(/[.]$/, '')}. Explore interactive 3D models in the free, open-access Anatomia Aperta 3D atlas.`,
    heading: `${view.label} — Interactive 3D anatomy`,
  })),
  {
    path: '/about', title: 'About the Open-Access Atlas | Anatomia Aperta 3D',
    description: 'Learn about Anatomia Aperta 3D, its anatomical foundations, scientific development and open-access approach to human anatomy education and research.',
    heading: 'About Anatomia Aperta 3D',
  },
  {
    path: '/sources', title: 'Anatomy Sources & 3D Datasets | Anatomia Aperta 3D',
    description: 'Find the anatomical datasets, source attribution, licensing and documented corrections behind Anatomia Aperta 3D in the official project repository.',
    heading: 'Anatomy sources and project documentation',
  },
  {
    path: '/contact', title: 'Contact the Anatomy Atlas | Anatomia Aperta 3D',
    description: 'Contact Anatomia Aperta 3D about the open-access human anatomy atlas, anatomical corrections, educational use, research and project collaboration.',
    heading: 'Contact Anatomia Aperta 3D',
  },
  ...legalPolicies.map(policy => ({
    path: `/${policy.slug}`, title: `${policy.title} | Anatomia Aperta 3D`,
    description: policy.slug === 'privacy-policy'
      ? 'Read the Anatomia Aperta 3D privacy policy, including information about external services used by this open-access interactive anatomy atlas.'
      : policy.slug === 'terms-of-use'
        ? 'Read the terms of use for Anatomia Aperta 3D, including educational purpose, anatomical accuracy, clinical-use limitations and intellectual property.'
        : 'Review licensing and attribution for Anatomia Aperta 3D, BodyParts3D, Z-Anatomy, anatomical modifications and third-party materials.',
    heading: `Anatomia Aperta 3D — ${policy.title}`,
  })),
];

export function getSeoPage(pathname: string): SeoPage {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return seoPages.find(page => page.path === path) ?? {
    path, title: 'Page Not Found | Anatomia Aperta 3D',
    description: 'This page could not be found. Return to Anatomia Aperta 3D to explore the open-access interactive human anatomy atlas.',
    heading: 'Page not found', noindex: true,
  };
}

export function canonicalUrl(page: SeoPage) {
  return `${SITE_URL}${page.path === '/' ? '/' : page.path}`;
}

export function structuredData(page: SeoPage) {
  const websiteId = `${SITE_URL}/#website`;
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite', '@id': websiteId, name: SITE_NAME,
      url: `${SITE_URL}/`, inLanguage: 'en',
      description: seoPages[0].description,
    },
    {
      '@type': 'WebPage', '@id': `${canonicalUrl(page)}#page`,
      url: canonicalUrl(page), name: page.title, description: page.description,
      inLanguage: 'en', isPartOf: { '@id': websiteId },
      primaryImageOfPage: { '@type': 'ImageObject', url: SOCIAL_IMAGE },
    },
  ];
  if (page.path === '/') {
    graph.push({
      '@type': 'WebApplication', name: SITE_NAME, url: `${SITE_URL}/atlas`,
      applicationCategory: 'EducationalApplication', operatingSystem: 'Web browser',
      isAccessibleForFree: true, description: seoPages[0].description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    });
  } else {
    const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` }];
    if (page.path.startsWith('/atlas/')) {
      items.push({ '@type': 'ListItem', position: 2, name: '3D anatomy atlas', item: `${SITE_URL}/atlas` });
    }
    items.push({ '@type': 'ListItem', position: items.length + 1, name: page.heading, item: canonicalUrl(page) });
    graph.push({ '@type': 'BreadcrumbList', itemListElement: items });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
