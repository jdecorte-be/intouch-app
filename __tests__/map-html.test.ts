import { describe, expect, it } from 'vitest';

import { toScriptJson } from '@/lib/map/script-json';
import { createMapboxMapHtml, toMapEvent, type MapEvent } from '@/lib/mapbox-map-html';

const event: MapEvent = {
  id: 'e1',
  kind: 'event',
  title: 'Hostile </script><script>alert(1)</script>',
  venue: 'Somewhere',
  neighborhood: 'Queen West',
  startsAt: 'Tonight, 8 PM',
  price: 'Free',
  icon: 'sparkles',
  accent: '#ff0000',
  category: 'social',
  going: 3,
  coordinates: [-79.4, 43.6],
};

describe('toScriptJson', () => {
  it('never emits a raw "<", so a payload cannot close the script tag', () => {
    expect(toScriptJson({ title: '</script><b>' })).not.toContain('<');
  });

  it('still parses back to the original value', () => {
    const value = { title: '</script> & "quotes"', list: [1, 2] };

    expect(JSON.parse(toScriptJson(value))).toEqual(value);
  });
});

describe('createMapboxMapHtml', () => {
  it('does not let event titles break out of the script block', () => {
    const html = createMapboxMapHtml([event]);

    // Only the two intended script tags may exist: the Mapbox library and ours.
    expect(html.match(/<script/g)).toHaveLength(2);
    expect(html.match(/<\/script>/g)).toHaveLength(2);
    expect(html).toContain('\\u003c/script>');
  });

  it('gives groups no photo and events a photo', () => {
    expect(toMapEvent({ ...event, kind: 'group' }).photoUrl).toBeNull();
    expect(toMapEvent(event).photoUrl).toMatch(/^https:\/\//);
  });
});
