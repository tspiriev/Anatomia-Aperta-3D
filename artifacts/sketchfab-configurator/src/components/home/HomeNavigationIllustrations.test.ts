import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomeNavigationIllustrations } from './HomeNavigationIllustrations';

const render = () => renderToStaticMarkup(createElement(HomeNavigationIllustrations));

test('homepage explains all three navigation methods without an embedded video', () => {
  const html = render();
  for (const id of ['diagram-basic-navigation', 'diagram-advanced-navigation', 'diagram-mix-categories'])
    assert.ok(html.includes(`data-testid="${id}"`), id);
  assert.match(html, /Upper horizontal menu/);
  assert.match(html, /Right-hand menu/);
  assert.match(html, /Mix categories/);
  assert.doesNotMatch(html, /<iframe|<video|player\.vimeo\.com/);
});

test('basic and advanced examples use the supplied screenshots rather than invented menu trees', () => {
  const html = render();
  for (const asset of ['navigation-basic-menu.webp', 'navigation-basic-anatomy.webp', 'navigation-advanced-anatomy.webp', 'navigation-right-menu.webp'])
    assert.ok(html.includes(asset), asset);
  assert.ok(html.indexOf('navigation-basic-menu.webp') < html.indexOf('navigation-basic-anatomy.webp'));
  assert.doesNotMatch(html, /nv-tree|Association fibers, isolated/);
});

test('mixing uses only the On indicator, actual right menu and creator-supplied cranial nerve image', () => {
  const html = render();
  const mixed = html.slice(html.indexOf('data-testid="diagram-mix-categories"'));
  assert.match(mixed, /Mix categories on, illustrated state/);
  assert.match(mixed, /<b>On<\/b>/);
  assert.match(mixed, /navigation-cranial-nerves\.webp/);
  assert.match(mixed, /navigation-right-menu\.webp/);
  assert.match(mixed, /Add or Show/);
  assert.doesNotMatch(mixed, /nv-compose|nv-sum|nv-layer|Schematic|White matter fibers/);
  assert.doesNotMatch(html, /<button|role="switch"|role="tab"/, 'Illustrated controls are not fake interactive controls');
});

test('illustrations replace only the homepage video, keeping the surrounding sections and standalone video', () => {
  const home = readFileSync(new URL('../../pages/Home.tsx', import.meta.url), 'utf8');
  const hero = home.indexOf('<HomeHero');
  const diagrams = home.indexOf('<HomeNavigationIllustrations');
  const statement = home.indexOf('<Statement');
  assert.ok(hero >= 0 && diagrams > hero && statement > diagrams);
  assert.ok(home.includes('<Highlights'));
  assert.ok(home.includes('<ProjectIntroduction'));
  assert.ok(home.includes('<Closing'));
  assert.ok(!home.includes('HomeIntroVideo'));
  assert.ok(readFileSync(new URL('./HomeIntroVideo.tsx', import.meta.url), 'utf8').includes('player.vimeo.com'));
});
