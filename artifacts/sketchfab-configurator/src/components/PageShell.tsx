import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { canonicalUrl, getSeoPage, SOCIAL_IMAGE, structuredData } from '../lib/seo';
import { SiteNav } from './SiteNav';
import { BrandLogo } from './BrandLogo';
import { LegalLinks } from './LegalLinks';
import '../styles/home.css';
import '../styles/chrome.css';

export function usePageMeta(title: string, description: string) {
  const [location] = useLocation();
  useEffect(() => {
    const page = getSeoPage(location);
    document.title = page.title;
    const tags = [
      ['name', 'description', page.description],
      ['name', 'robots', page.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'],
      ['property', 'og:title', page.title],
      ['property', 'og:description', page.description],
      ['property', 'og:url', canonicalUrl(page)],
      ['property', 'og:image', SOCIAL_IMAGE],
      ['name', 'twitter:title', page.title],
      ['name', 'twitter:description', page.description],
      ['name', 'twitter:image', SOCIAL_IMAGE],
    ];
    for (const [attribute, name, content] of tags) {
      let tag = document.head.querySelector(`meta[${attribute}="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    }
    document.head.querySelectorAll('link[rel="canonical"]').forEach(link => link.remove());
    if (!page.noindex) {
      const canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = canonicalUrl(page);
      document.head.appendChild(canonical);
    }
    document.getElementById('seo-structured-data')?.remove();
    const schema = document.createElement('script');
    schema.id = 'seo-structured-data';
    schema.type = 'application/ld+json';
    schema.textContent = JSON.stringify(structuredData(page));
    document.head.appendChild(schema);
  }, [location, title, description]);
}

export function PageShell({ title, description, backgroundImage, children }: { title: string; description: string; backgroundImage?: string; children: ReactNode }) {
  usePageMeta(title, description);
  useEffect(() => window.scrollTo(0, 0), []);
  return (
    <div className={`ps-root min-h-[100dvh]${backgroundImage ? ' ps-illustrated' : ''}`}>
      {backgroundImage && <div aria-hidden="true" className="ps-backdrop" style={{ backgroundImage: `linear-gradient(rgba(10,10,9,.78), rgba(10,10,9,.88)), url("${backgroundImage}")` }} />}
      <SiteNav />
      <main>{children}</main>
      <footer className="sf">
        <div className="sf-in">
          <div className="sf-brand">
            <Link href="/" aria-label="Anatomia Aperta 3D homepage">
              <BrandLogo />
            </Link>
            <p>A nonprofit, open-access interactive anatomy atlas.</p>
          </div>
          <div className="sf-links">
            <nav aria-label="Footer">
              <Link href="/atlas">Explore the full atlas</Link>
              <Link href="/about">About</Link>
              <Link href="/sources">Sources</Link>
              <Link href="/contact">Contact</Link>
            </nav>
            <LegalLinks />
          </div>
        </div>
      </footer>
    </div>
  );
}

export function TextPage({ eyebrow, heading, lead, children }: { eyebrow: string; heading: string; lead?: string; children: ReactNode }) {
  return (
    <article className="tp">
      <p className="hm-kicker">{eyebrow}</p>
      <h1 className="tp-h1">{heading}</h1>
      {lead && <p className="tp-lead">{lead}</p>}
      <div className="tp-body">{children}</div>
    </article>
  );
}

export function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="tp-block">
      <h2 className="tp-h2">{title}</h2>
      <div className="tp-copy">{children}</div>
    </section>
  );
}
