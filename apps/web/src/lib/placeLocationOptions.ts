import { MUNICIPALITIES, type Place } from '@kodoko/domain';

export type RailLineGroup = 'jr' | 'subway' | 'private';

export type RailLineOption = {
  id: string;
  group: RailLineGroup;
  nameJa: string;
  operator: string;
};

export const COMMON_MUNICIPALITY_CODES = [
  '13108',
  '13109',
  '13106',
  '13107',
  '13103',
  '13113',
  '13112',
  '13111',
] as const;

export const RAIL_LINE_OPTIONS: RailLineOption[] = [
  { id: 'jr-sobu', group: 'jr', nameJa: 'JR総武線', operator: 'JR東日本' },
  { id: 'jr-chuo', group: 'jr', nameJa: 'JR中央線', operator: 'JR東日本' },
  { id: 'jr-yamanote', group: 'jr', nameJa: 'JR山手線', operator: 'JR東日本' },
  { id: 'jr-keiyo', group: 'jr', nameJa: 'JR京葉線', operator: 'JR東日本' },
  { id: 'jr-joban', group: 'jr', nameJa: 'JR常磐線', operator: 'JR東日本' },
  { id: 'jr-keihin-tohoku', group: 'jr', nameJa: 'JR京浜東北線', operator: 'JR東日本' },
  { id: 'jr-saikyo', group: 'jr', nameJa: 'JR埼京線', operator: 'JR東日本' },
  { id: 'jr-ome', group: 'jr', nameJa: 'JR青梅線', operator: 'JR東日本' },

  { id: 'tokyo-metro-tozai', group: 'subway', nameJa: '東京メトロ東西線', operator: '東京メトロ' },
  { id: 'tokyo-metro-hanzomon', group: 'subway', nameJa: '東京メトロ半蔵門線', operator: '東京メトロ' },
  { id: 'tokyo-metro-hibiya', group: 'subway', nameJa: '東京メトロ日比谷線', operator: '東京メトロ' },
  { id: 'tokyo-metro-yurakucho', group: 'subway', nameJa: '東京メトロ有楽町線', operator: '東京メトロ' },
  { id: 'tokyo-metro-chiyoda', group: 'subway', nameJa: '東京メトロ千代田線', operator: '東京メトロ' },
  { id: 'tokyo-metro-marunouchi', group: 'subway', nameJa: '東京メトロ丸ノ内線', operator: '東京メトロ' },
  { id: 'tokyo-metro-fukutoshin', group: 'subway', nameJa: '東京メトロ副都心線', operator: '東京メトロ' },
  { id: 'toei-oedo', group: 'subway', nameJa: '都営大江戸線', operator: '東京都交通局' },
  { id: 'toei-shinjuku', group: 'subway', nameJa: '都営新宿線', operator: '東京都交通局' },
  { id: 'toei-asakusa', group: 'subway', nameJa: '都営浅草線', operator: '東京都交通局' },
  { id: 'toei-mita', group: 'subway', nameJa: '都営三田線', operator: '東京都交通局' },

  { id: 'tokyu-denentoshi', group: 'private', nameJa: '東急田園都市線', operator: '東急電鉄' },
  { id: 'tokyu-setagaya', group: 'private', nameJa: '東急世田谷線', operator: '東急電鉄' },
  { id: 'tokyu-meguro', group: 'private', nameJa: '東急目黒線', operator: '東急電鉄' },
  { id: 'seibu-ikebukuro', group: 'private', nameJa: '西武池袋線', operator: '西武鉄道' },
  { id: 'seibu-yamaguchi', group: 'private', nameJa: '西武山口線', operator: '西武鉄道' },
  { id: 'tobu-tojo', group: 'private', nameJa: '東武東上線', operator: '東武鉄道' },
  { id: 'tobu-skytree', group: 'private', nameJa: '東武スカイツリーライン', operator: '東武鉄道' },
  { id: 'tobu-kameido', group: 'private', nameJa: '東武亀戸線', operator: '東武鉄道' },
  { id: 'keikyu-main', group: 'private', nameJa: '京急本線', operator: '京急電鉄' },
  { id: 'keio-main', group: 'private', nameJa: '京王線', operator: '京王電鉄' },
  { id: 'odakyu-odawara', group: 'private', nameJa: '小田急線', operator: '小田急電鉄' },
  { id: 'toden-arakawa', group: 'private', nameJa: '都電荒川線', operator: '東京都交通局' },
  { id: 'yurikamome', group: 'private', nameJa: 'ゆりかもめ', operator: 'ゆりかもめ' },
  { id: 'tsukuba-express', group: 'private', nameJa: 'つくばエクスプレス', operator: '首都圏新都市鉄道' },
  { id: 'nippori-toneri', group: 'private', nameJa: '日暮里・舎人ライナー', operator: '東京都交通局' },
];

export const RAIL_LINE_BY_ID = new Map(
  RAIL_LINE_OPTIONS.map((line) => [line.id, line]),
);

export const MUNICIPALITY_BY_CODE = new Map(
  MUNICIPALITIES.map((municipality) => [municipality.code, municipality]),
);

export function countPlacesByMunicipality(
  places: Pick<Place, 'municipalityCode'>[],
): Record<string, number> {
  return places.reduce<Record<string, number>>((counts, place) => {
    counts[place.municipalityCode] = (counts[place.municipalityCode] ?? 0) + 1;
    return counts;
  }, {});
}

export function countPlacesByRailLine(
  places: Pick<Place, 'transitAccess'>[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const place of places) {
    const lineIds = new Set(place.transitAccess?.map((access) => access.lineId));
    for (const lineId of lineIds) {
      if (!lineId) continue;
      counts[lineId] = (counts[lineId] ?? 0) + 1;
    }
  }
  return counts;
}
