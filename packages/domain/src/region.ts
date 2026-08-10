export type Municipality = {
  code: string;
  nameJa: string;
  latitude: number;
  longitude: number;
};

/** 東京都 23 區。市町村選択用の静的な公共データ。 */
export const MUNICIPALITIES: Municipality[] = [
  { code: '13101', nameJa: '千代田区', latitude: 35.694, longitude: 139.754 },
  { code: '13102', nameJa: '中央区', latitude: 35.67, longitude: 139.773 },
  { code: '13103', nameJa: '港区', latitude: 35.658, longitude: 139.746 },
  { code: '13104', nameJa: '新宿区', latitude: 35.694, longitude: 139.703 },
  { code: '13105', nameJa: '文京区', latitude: 35.708, longitude: 139.762 },
  { code: '13106', nameJa: '台東区', latitude: 35.712, longitude: 139.779 },
  { code: '13107', nameJa: '墨田区', latitude: 35.712, longitude: 139.802 },
  { code: '13108', nameJa: '江東区', latitude: 35.689, longitude: 139.78 },
  { code: '13109', nameJa: '品川区', latitude: 35.609, longitude: 139.73 },
  { code: '13110', nameJa: '目黒区', latitude: 35.64, longitude: 139.697 },
  { code: '13111', nameJa: '大田区', latitude: 35.562, longitude: 139.716 },
  { code: '13112', nameJa: '世田谷区', latitude: 35.646, longitude: 139.653 },
  { code: '13113', nameJa: '渋谷区', latitude: 35.664, longitude: 139.697 },
  { code: '13114', nameJa: '中野区', latitude: 35.706, longitude: 139.686 },
  { code: '13115', nameJa: '杉並区', latitude: 35.699, longitude: 139.636 },
  { code: '13116', nameJa: '豊島区', latitude: 35.726, longitude: 139.718 },
  { code: '13117', nameJa: '北区', latitude: 35.752, longitude: 139.734 },
  { code: '13118', nameJa: '荒川区', latitude: 35.738, longitude: 139.783 },
  { code: '13119', nameJa: '板橋区', latitude: 35.761, longitude: 139.709 },
  { code: '13120', nameJa: '練馬区', latitude: 35.735, longitude: 139.651 },
  { code: '13121', nameJa: '足立区', latitude: 35.775, longitude: 139.804 },
  { code: '13122', nameJa: '葛飾区', latitude: 35.744, longitude: 139.847 },
  { code: '13123', nameJa: '江戸川区', latitude: 35.708, longitude: 139.868 },
  { code: '13222', nameJa: '東久留米市', latitude: 35.758, longitude: 139.529 },
];

export function findMunicipality(code?: string): Municipality | undefined {
  return MUNICIPALITIES.find((item) => item.code === code);
}

/**
 * 現在地（緯度/経度）から最も近い市区町村を返す。
 * 23 区の代表座標を基準にした簡易的な最近傍探索（ローカルで完結）。
 */
export function findNearestMunicipality(latitude: number, longitude: number): Municipality | undefined {
  let nearest: Municipality | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const item of MUNICIPALITIES) {
    const dLat = latitude - item.latitude;
    const dLng = longitude - item.longitude;
    const distance = dLat * dLat + dLng * dLng;
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = item;
    }
  }
  return nearest;
}
