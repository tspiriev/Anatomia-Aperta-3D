import { canonicalUrl, SOCIAL_IMAGE, SITE_NAME, structuredData, type SeoPage } from '../src/lib/seo';

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}

export function seoHead(page: SeoPage) {
  const meta = (name: string, content: string, property = false) =>
    `<meta ${property ? 'property' : 'name'}="${name}" content="${escapeHtml(content)}">`;
  return [
    `<title>${escapeHtml(page.title)}</title>`,
    meta('description', page.description),
    meta('robots', page.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'),
    ...['og:title', 'twitter:title'].map(name => meta(name, page.title, name.startsWith('og:'))),
    ...['og:description', 'twitter:description'].map(name => meta(name, page.description, name.startsWith('og:'))),
    meta('og:type', 'website', true), meta('og:site_name', SITE_NAME, true),
    meta('og:locale', 'en_US', true), meta('og:url', canonicalUrl(page), true),
    meta('og:image', SOCIAL_IMAGE, true), meta('og:image:width', '1200', true),
    meta('og:image:height', '630', true),
    meta('og:image:alt', 'Anatomia Aperta 3D — open-access interactive human anatomy atlas', true),
    meta('twitter:card', 'summary_large_image'), meta('twitter:image', SOCIAL_IMAGE),
    meta('twitter:image:alt', 'Anatomia Aperta 3D — interactive human anatomy atlas'),
    ...(!page.noindex ? [`<link rel="canonical" href="${escapeHtml(canonicalUrl(page))}">`] : []),
    `<script id="seo-structured-data" type="application/ld+json">${JSON.stringify(structuredData(page)).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ');
}

export function withSeo(html: string, page: SeoPage, content?: string) {
  const result = html
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script\b[^>]*id=["']seo-structured-data["'][^>]*>[\s\S]*?<\/script>/gi, '')
    .replace('</head>', `    ${seoHead(page)}\n  </head>`);
  return content === undefined ? result : result.replace('<div id="root"></div>', `<div id="root">${content}</div>`);
}
