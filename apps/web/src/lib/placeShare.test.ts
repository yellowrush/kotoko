import { describe, expect, it } from 'vitest';
import { buildCopyShareText, buildPlaceShareData, buildPlaceShareTargetUrl } from './placeShare';

describe('place share helpers', () => {
  const data = buildPlaceShareData(
    {
      id: 'tokyo toy',
      name: 'Tokyo Toy Museum',
      shortDescription: 'Indoor play for families',
      address: 'Tokyo',
    },
    'Kodoko',
    'https://example.test',
  );

  it('builds public place share data without child or local-state fields', () => {
    expect(data).toEqual({
      title: 'Tokyo Toy Museum',
      text: 'Tokyo Toy Museum\nIndoor play for families\nTokyo\nKodoko',
      url: 'https://example.test/places/tokyo%20toy',
    });
  });

  it('formats copy text with the link included', () => {
    expect(buildCopyShareText(data)).toBe(
      'Tokyo Toy Museum\nIndoor play for families\nTokyo\nKodoko\nhttps://example.test/places/tokyo%20toy',
    );
  });

  it('builds supported social share URLs', () => {
    expect(buildPlaceShareTargetUrl('facebook', data)).toContain(
      'facebook.com/sharer/sharer.php',
    );
    expect(buildPlaceShareTargetUrl('line', data)).toContain(
      'social-plugins.line.me/lineit/share',
    );
    expect(buildPlaceShareTargetUrl('x', data)).toContain(
      'twitter.com/intent/tweet',
    );
  });
});
