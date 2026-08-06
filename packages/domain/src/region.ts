export type Municipality = {
  code: string;
  nameJa: string;
};

/** 東京都 23 區。市町村選択用の静的な公共データ。 */
export const MUNICIPALITIES: Municipality[] = [
  { code: '13101', nameJa: '千代田区' },
  { code: '13102', nameJa: '中央区' },
  { code: '13103', nameJa: '港区' },
  { code: '13104', nameJa: '新宿区' },
  { code: '13105', nameJa: '文京区' },
  { code: '13106', nameJa: '台東区' },
  { code: '13107', nameJa: '墨田区' },
  { code: '13108', nameJa: '江東区' },
  { code: '13109', nameJa: '品川区' },
  { code: '13110', nameJa: '目黒区' },
  { code: '13111', nameJa: '大田区' },
  { code: '13112', nameJa: '世田谷区' },
  { code: '13113', nameJa: '渋谷区' },
  { code: '13114', nameJa: '中野区' },
  { code: '13115', nameJa: '杉並区' },
  { code: '13116', nameJa: '豊島区' },
  { code: '13117', nameJa: '北区' },
  { code: '13118', nameJa: '荒川区' },
  { code: '13119', nameJa: '板橋区' },
  { code: '13120', nameJa: '練馬区' },
  { code: '13121', nameJa: '足立区' },
  { code: '13122', nameJa: '葛飾区' },
  { code: '13123', nameJa: '江戸川区' },
];

export function findMunicipality(code?: string): Municipality | undefined {
  return MUNICIPALITIES.find((item) => item.code === code);
}