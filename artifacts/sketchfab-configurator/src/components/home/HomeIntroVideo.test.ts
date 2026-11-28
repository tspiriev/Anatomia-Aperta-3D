import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomeIntroVideo } from './HomeIntroVideo';

test('homepage introduction embeds the exact creator-supplied Vimeo video and unlisted access hash', () => {
  const html = renderToStaticMarkup(createElement(HomeIntroVideo));
  const src = html.match(/src="([^"]+)"/)?.[1];
  assert.ok(src);
  const url = new URL(src.replaceAll('&amp;', '&'));
  assert.equal(url.origin, 'https://player.vimeo.com');
  assert.equal(url.pathname, '/video/1238034980');
  assert.equal(url.searchParams.get('h'), '012b65dbbe');
  assert.equal(url.searchParams.get('badge'), '0');
  assert.equal(url.searchParams.get('autopause'), '0');
  assert.equal(url.searchParams.get('app_id'), '58479');
  assert.notEqual(url.searchParams.get('autoplay'), '1');
  assert.notEqual(url.searchParams.get('background'), '1');
});

test('video retains accessible title, responsive wrapper and fullscreen/player permissions without an unnecessary SDK', () => {
  const html = renderToStaticMarkup(createElement(HomeIntroVideo));
  assert.ok(html.includes('id="interface-video"'));
  assert.ok(html.includes('class="hm-intro-video-player"'));
  assert.ok(html.includes('title="Anatomia Aperta 1080"'));
  assert.ok(html.includes('loading="lazy"'));
  assert.match(html, /allowfullscreen/i);
  assert.match(html, /referrerpolicy="strict-origin-when-cross-origin"/i);
  for (const permission of ['autoplay', 'fullscreen', 'picture-in-picture', 'clipboard-write', 'encrypted-media', 'web-share'])
    assert.ok(html.includes(permission), permission);
  assert.ok(!html.includes('<script'), 'The iframe has its own player; the SDK is only needed for custom API controls');
});
