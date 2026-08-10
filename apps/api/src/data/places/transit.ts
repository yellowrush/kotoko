import type { PlaceInput, PlaceTransitAccess } from '@kodoko/domain';

const LINES = {
  'jr-sobu': ['JR東日本', 'JR総武線'],
  'jr-chuo': ['JR東日本', 'JR中央線'],
  'jr-yamanote': ['JR東日本', 'JR山手線'],
  'jr-keiyo': ['JR東日本', 'JR京葉線'],
  'jr-joban': ['JR東日本', 'JR常磐線'],
  'jr-keihin-tohoku': ['JR東日本', 'JR京浜東北線'],
  'jr-saikyo': ['JR東日本', 'JR埼京線'],
  'jr-ome': ['JR東日本', 'JR青梅線'],
  'tokyo-metro-tozai': ['東京メトロ', '東京メトロ東西線'],
  'tokyo-metro-hanzomon': ['東京メトロ', '東京メトロ半蔵門線'],
  'tokyo-metro-hibiya': ['東京メトロ', '東京メトロ日比谷線'],
  'tokyo-metro-yurakucho': ['東京メトロ', '東京メトロ有楽町線'],
  'tokyo-metro-chiyoda': ['東京メトロ', '東京メトロ千代田線'],
  'tokyo-metro-marunouchi': ['東京メトロ', '東京メトロ丸ノ内線'],
  'tokyo-metro-fukutoshin': ['東京メトロ', '東京メトロ副都心線'],
  'toei-oedo': ['東京都交通局', '都営大江戸線'],
  'toei-shinjuku': ['東京都交通局', '都営新宿線'],
  'toei-asakusa': ['東京都交通局', '都営浅草線'],
  'toei-mita': ['東京都交通局', '都営三田線'],
  'tokyu-denentoshi': ['東急電鉄', '東急田園都市線'],
  'tokyu-setagaya': ['東急電鉄', '東急世田谷線'],
  'tokyu-meguro': ['東急電鉄', '東急目黒線'],
  'seibu-ikebukuro': ['西武鉄道', '西武池袋線'],
  'seibu-yamaguchi': ['西武鉄道', '西武山口線'],
  'tobu-tojo': ['東武鉄道', '東武東上線'],
  'tobu-skytree': ['東武鉄道', '東武スカイツリーライン'],
  'tobu-kameido': ['東武鉄道', '東武亀戸線'],
  'keikyu-main': ['京急電鉄', '京急本線'],
  'keio-main': ['京王電鉄', '京王線'],
  'odakyu-odawara': ['小田急電鉄', '小田急線'],
  'toden-arakawa': ['東京都交通局', '都電荒川線'],
  yurikamome: ['ゆりかもめ', 'ゆりかもめ'],
  'tsukuba-express': ['首都圏新都市鉄道', 'つくばエクスプレス'],
  'nippori-toneri': ['東京都交通局', '日暮里・舎人ライナー'],
} as const satisfies Record<string, readonly [string, string]>;

type LineId = keyof typeof LINES;

function rail(
  lineId: LineId,
  stationName: string,
  walkMinutes?: number,
): PlaceTransitAccess {
  const [operator, lineName] = LINES[lineId];
  return {
    operator,
    lineId,
    lineName,
    stationName,
    ...(walkMinutes === undefined ? {} : { walkMinutes }),
  };
}

export const placeTransitAccess: Record<string, PlaceTransitAccess[]> = {
  'shinjuku-chuo-library': [rail('tokyo-metro-fukutoshin', '西早稲田', 3)],
  'tokyo-gym': [rail('jr-sobu', '千駄ケ谷', 0), rail('toei-oedo', '国立競技場', 0)],
  'bumb-tokyo-sports': [rail('jr-keiyo', '新木場', 13), rail('tokyo-metro-yurakucho', '新木場', 13)],
  'setagaya-chuo-library': [rail('tokyu-setagaya', '上町', 10), rail('tokyu-denentoshi', '桜新町', 10)],
  'koto-chuo-library': [rail('tokyo-metro-tozai', '南砂町', 10)],
  'taito-chuo-library': [rail('toei-asakusa', '浅草', 8), rail('tokyo-metro-hibiya', '入谷', 8)],
  'setagaya-sports-center': [rail('tokyu-denentoshi', '用賀'), rail('tokyu-denentoshi', '二子玉川')],
  'edogawa-sogo-taikan': [rail('toei-shinjuku', '一之江')],
  'higashin-arena': [rail('jr-sobu', '錦糸町', 3), rail('tokyo-metro-hanzomon', '錦糸町', 2)],
  'gotanda-library': [rail('tokyu-meguro', '不動前', 7), rail('jr-yamanote', '五反田', 15)],
  'nerima-chuo-library': [rail('seibu-ikebukuro', '練馬', 5)],
  'itabashi-chuo-library': [rail('tobu-tojo', '常盤台', 10)],
  'adachi-chuo-library': [rail('jr-joban', '北千住', 15), rail('tokyo-metro-chiyoda', '北千住', 15), rail('tokyo-metro-hibiya', '北千住', 15), rail('tobu-skytree', '北千住', 15)],
  'nakano-chuo-library': [rail('jr-chuo', '中野', 7), rail('jr-sobu', '中野', 7)],
  'suginami-chuo-library': [rail('jr-chuo', '荻窪', 8)],
  'ota-sogo-taikan': [rail('keikyu-main', '梅屋敷', 5), rail('jr-keihin-tohoku', '蒲田', 15)],
  'nerima-sogo-taikan': [rail('seibu-ikebukuro', '練馬高野台', 15)],
  'arakawa-furalibrary': [rail('tokyo-metro-chiyoda', '町屋', 8), rail('toden-arakawa', '荒川二丁目', 1)],
  'bunkyo-masago-chuo': [rail('toei-oedo', '本郷三丁目', 7), rail('tokyo-metro-marunouchi', '本郷三丁目', 7), rail('toei-mita', '春日', 7)],
  'shibuya-chuo-library': [rail('jr-yamanote', '原宿', 5), rail('tokyo-metro-chiyoda', '明治神宮前', 6)],
  'katsushika-chuo-library': [rail('jr-joban', '金町', 1)],
  'chiyoda-hibiya-library': [rail('tokyo-metro-marunouchi', '霞ケ関', 5)],
  'meguro-ku-court-library': [rail('jr-yamanote', '目黒', 10)],
  'kita-chuo-library': [rail('jr-keihin-tohoku', '王子', 15), rail('jr-saikyo', '十条', 12)],
  'minato-mita-library': [rail('jr-keihin-tohoku', '田町', 4), rail('toei-mita', '三田', 3), rail('toei-asakusa', '三田', 3)],

  'kiba-park': [rail('tokyo-metro-tozai', '木場', 8)],
  'sarue-onshi-park': [rail('tokyo-metro-hanzomon', '住吉', 5)],
  'hibiya-park': [rail('tokyo-metro-hibiya', '日比谷', 2), rail('toei-mita', '日比谷', 2)],
  'kinshi-park': [rail('jr-sobu', '錦糸町', 3), rail('tokyo-metro-hanzomon', '錦糸町', 3)],
  'koganei-park': [rail('jr-chuo', '武蔵小金井')],
  'shioiri-park': [rail('jr-joban', '南千住', 12), rail('tokyo-metro-hibiya', '南千住', 12), rail('tsukuba-express', '南千住', 12)],
  'ukima-park': [rail('jr-saikyo', '浮間舟渡', 3)],
  'toneri-park': [rail('nippori-toneri', '舎人公園', 10)],
  'asukayama-park': [rail('jr-keihin-tohoku', '王子', 5)],
  'shiba-park': [rail('toei-mita', '芝公園', 0), rail('toei-asakusa', '大門', 5)],

  'tobu-museum': [rail('tobu-skytree', '東向島', 1)],
  'metro-museum': [rail('tokyo-metro-tozai', '葛西', 0)],
  'tokyu-train-bus-museum': [rail('tokyu-denentoshi', '宮崎台', 0)],
  'ome-railway-park': [rail('jr-ome', '青梅', 15)],
  'keio-rail-land': [rail('keio-main', '多摩動物公園', 0)],
  'romancecar-museum': [rail('odakyu-odawara', '海老名', 2)],
  'toden-omoide-hiroba': [rail('toden-arakawa', '荒川車庫前', 0)],
  'seibuen-yuuenchi': [rail('seibu-yamaguchi', '西武園ゆうえんち', 0)],

  'kameido-central-park': [rail('tobu-kameido', '亀戸水神', 2), rail('jr-sobu', '亀戸', 15)],
  'tategawa-riverbed-park': [rail('jr-sobu', '亀戸', 10), rail('tobu-kameido', '亀戸', 10), rail('toei-shinjuku', '西大島', 15), rail('toei-shinjuku', '大島', 15)],
  'godoteien-garden': [rail('jr-sobu', '亀戸', 10), rail('tobu-kameido', '亀戸', 10), rail('toei-shinjuku', '西大島', 10)],
  'kiba-shinsui-park': [rail('tokyo-metro-tozai', '木場', 10)],
  'koishiba-shinsui-park': [rail('tokyo-metro-tozai', '門前仲町', 5), rail('toei-oedo', '門前仲町', 5), rail('jr-keiyo', '越中島', 5)],
  'joto-park': [rail('toei-shinjuku', '大島', 21)],
  'echujima-park': [rail('jr-keiyo', '越中島', 5), rail('tokyo-metro-tozai', '門前仲町', 10), rail('toei-oedo', '門前仲町', 10)],
  'toyosu-park': [rail('tokyo-metro-yurakucho', '豊洲', 5), rail('yurikamome', '豊洲', 5)],
  'sendaihorikawa-park': [rail('tokyo-metro-tozai', '東陽町', 10), rail('tokyo-metro-tozai', '南砂町', 10), rail('toei-shinjuku', '大島', 10)],
  'spadium-japon': [rail('seibu-ikebukuro', '東久留米')],
};

export function withTransitAccess(input: PlaceInput): PlaceInput {
  const transitAccess = input.transitAccess ?? placeTransitAccess[input.id];
  return transitAccess ? { ...input, transitAccess } : input;
}
