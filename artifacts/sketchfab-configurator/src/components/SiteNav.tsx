import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X, Search } from 'lucide-react';
import '../styles/chrome.css';
import { BrandLogo } from './BrandLogo';
import { AtlasDropdown } from './AtlasDropdown';
import { HeaderSearch, openHeaderSearch } from './HeaderSearch';
import { ATLAS_VIEWS } from '../data/atlasViews';
import { ATLAS_NAVIGATION_MENUS } from '../data/atlasNavigation';

const LINKS = [
  { href: '/about', label: 'About' },
  { href: '/sources', label: 'Sources' },
  { href: '/contact', label: 'Contact' },
];

export function SiteNav() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location]);
  const currentAtlas = ATLAS_VIEWS.find((view) => view.href === location);
  const atlasActive = Boolean(currentAtlas);
  const homepage = location === '/';
  const infoLinks = LINKS.map((l) => (
    <Link key={l.href} href={l.href} data-testid={`link-${l.label.toLowerCase()}`}
      aria-current={location === l.href ? 'page' : undefined} className="sn-a">{l.label}</Link>
  ));
  return (
    <header id="atlas-navigation" className={`sn${atlasActive ? ' sn-atlas' : ''}${location === '/' ? ' sn-homepage' : ''}`}>
      <nav aria-label="Primary" className="sn-in">
        <Link href="/" data-testid="link-brand" className="sn-brand">
          {atlasActive ? <span className="sn-home">Home</span> : <BrandLogo />}
          {currentAtlas?.systemIds && (
            <span className="truncate border-l border-white/15 pl-3 text-xs text-white/60" data-testid="active-atlas-name">
              {currentAtlas.label}
            </span>
          )}
        </Link>
        <div className="sn-actions">
        <div className="sn-links">
          {homepage ? <>
            <div className="sn-nav-row">
              {ATLAS_NAVIGATION_MENUS.slice(0, 5).map((menu) => <AtlasDropdown key={menu.id} menu={menu} />)}
            </div>
            <div className="sn-nav-row sn-nav-row-secondary">
              {ATLAS_NAVIGATION_MENUS.slice(5).map((menu) => <AtlasDropdown key={menu.id} menu={menu} />)}
              <div className="sn-utility-links">
                {infoLinks}
                <HeaderSearch />
              </div>
            </div>
          </> : <>
            {ATLAS_NAVIGATION_MENUS.map((menu) => <AtlasDropdown key={menu.id} menu={menu} />)}
            {!atlasActive && infoLinks}
          </>}
        </div>
        <button type="button" className="sn-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-nav"
          data-testid="button-nav-toggle" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        </div>
      </nav>
      {open && (
        <div id="mobile-nav" className="sn-mobile">
          {ATLAS_NAVIGATION_MENUS.map((menu) => (
            <AtlasDropdown key={menu.id} menu={menu} mobile onNavigate={() => setOpen(false)} />
          ))}
          {!atlasActive && LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="sn-a" aria-current={location === l.href ? 'page' : undefined}>{l.label}</Link>
          ))}
          {homepage && (
            <button type="button" className="sn-a sn-mobile-find" data-testid="button-mobile-find"
              onClick={() => { openHeaderSearch(); setOpen(false); }}>
              <Search size={16} aria-hidden />Find
            </button>
          )}
        </div>
      )}
    </header>
  );
}
