import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AtlasResourceNotice } from './AtlasDropdown';
import { FULL_ANATOMY_VIEW, ATLAS_VIEWS } from '../data/atlasViews';
import { ATLAS_NAVIGATION_MENUS } from '../data/atlasNavigation';

test('full anatomy warns about processing power, memory and loading time before navigation', () => {
  const menu = ATLAS_NAVIGATION_MENUS.find(menu => menu.id === 'full-atlas')!;
  assert.equal(menu.views[0], FULL_ANATOMY_VIEW);
  assert.equal(menu.views[0].href, '/atlas', 'No confirmation step or route change');
  const html = renderToStaticMarkup(<AtlasResourceNotice notice={menu.views[0].resourceNotice} />);
  for (const phrase of ['Resource-intensive 3D model', 'High processing power and memory required',
    'may take time to load', 'individual system menus'])
    assert.ok(html.includes(phrase), phrase);
  assert.ok(html.includes('aria-hidden="true"'), 'The icon is decorative; the warning has visible text');
});

test('individual atlases do not display the full-model resource warning', () => {
  for (const view of ATLAS_VIEWS.filter(view => view.id !== FULL_ANATOMY_VIEW.id))
    assert.equal(renderToStaticMarkup(<AtlasResourceNotice notice={view.resourceNotice} />), '');
});
