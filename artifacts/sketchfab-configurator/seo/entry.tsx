import { renderToString } from 'react-dom/server';
import { Router, Link } from 'wouter';
import Home from '../src/pages/Home';
import About from '../src/pages/About';
import Sources from '../src/pages/Sources';
import Contact from '../src/pages/Contact';
import Legal from '../src/pages/Legal';
import { PageShell, TextPage } from '../src/components/PageShell';
import { atlasSeoViews, getSeoPage, seoPages } from '../src/lib/seo';
export { seoPages, getSeoPage };
export { withSeo } from './html';

export function renderPage(path: string) {
  const page = getSeoPage(path);
  const view = atlasSeoViews.find(item => item.href === path);
  const content = path === '/' ? <Home />
    : path === '/about' ? <About />
    : path === '/sources' ? <Sources />
    : path === '/contact' ? <Contact />
    : view ? (
      <PageShell title={page.title} description={page.description}>
        <TextPage eyebrow="Open-access 3D anatomy atlas" heading={page.heading} lead={view.description}>
          <section className="tp-copy">
            <h2>Explore this interactive atlas</h2>
            <p>Study the modeled anatomy in three dimensions. Rotate and zoom the model, browse anatomical collections, select named structures and adjust visibility using the atlas controls.</p>
            <p>The interactive viewer requires JavaScript and an internet connection to load its Sketchfab model. This atlas is intended for education and research, not clinical decision-making.</p>
            {view.resourceNotice && <p>{view.resourceNotice}</p>}
          </section>
          <nav aria-label="Explore anatomy atlases">
            <h2>Anatomy atlases</h2>
            <ul>{atlasSeoViews.map(item => <li key={item.href}><Link href={item.href}>{item.label}</Link> — {item.description}</li>)}</ul>
          </nav>
        </TextPage>
      </PageShell>
    ) : page.noindex ? (
      <PageShell title={page.title} description={page.description}>
        <TextPage eyebrow="404" heading="Page not found">
          <p>This page does not exist. <Link href="/">Return to the homepage</Link> or <Link href="/atlas">explore the anatomy atlas</Link>.</p>
        </TextPage>
      </PageShell>
    ) : <Legal slug={path.slice(1)} />;
  return renderToString(<Router ssrPath={path}>{content}</Router>);
}
