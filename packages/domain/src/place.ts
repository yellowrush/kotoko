export type PlaceCategory =
  | 'park'
  | 'playground'
  | 'museum'
  | 'zoo'
  | 'aquarium'
  | 'library'
  | 'facility'
  | 'indoor-play'
  | 'shop'
  | 'restaurant'
  | 'event'
  | 'other'
  | 'children-hall'
  | 'toy-play'
  | 'amusement-park';

export type PlaceTag =
  | 'dining'
  | 'group-play'
  | 'stroller-friendly'
  | 'quiet-zone';

export type IndoorOutdoor = 'indoor' | 'outdoor' | 'mixed';

export type ContentStatus = 'draft' | 'published' | 'archived';

/**
 * 详情页 label（受控枚举，配合 i18n 渲染 chips）。
 * indoorOutdoor 与布尔设施位是数据字段，labels 是展示层的派生视图。
 */
export type PlaceLabel =
  | 'indoor'
  | 'outdoor'
  | 'mixed'
  | 'dining'
  | 'baby-car'
  | 'nursing-room'
  | 'diaper-changing'
  | 'free'
  | 'reservation-required'
  | 'reservation-optional'
  | 'english-ok'
  | 'petting'
  | 'water-play'
  | 'picnic'
  | 'parking'
  | 'wheelchair';

export type PlaceMediaType = 'image' | 'video';

export type PlaceMedia = {
  id: string;
  type: PlaceMediaType;
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  credit?: string;
  license?: string;
  sourceUrl?: string;
  cover?: boolean;
};

export type PlacePriceAudience =
  | 'adult'
  | 'child'
  | 'toddler'
  | 'infant'
  | 'family'
  | 'group';

export type PlacePrice = {
  id: string;
  audience: PlacePriceAudience;
  labelJa: string;
  labelZh?: string;
  amountYen?: number;
  free?: boolean;
  note?: string;
  validFrom?: string;
  validUntil?: string;
  checkedAt: string;
  sourceUrl: string;
};

export type PlaceReservationMode = 'none' | 'optional' | 'required' | 'lottery' | 'unknown';

export type PlaceReservation = {
  mode: PlaceReservationMode;
  howToUrl?: string;
  note?: string;
  checkedAt: string;
  sourceUrl: string;
};

export type PlaceTransitAccess = {
  operator: string;
  lineId: string;
  lineName: string;
  stationName: string;
  walkMinutes?: number;
};

export type PlaceSourceType = 'official' | 'open-data' | 'review-platform' | 'manual' | 'report';

export type PlaceSource = {
  type: PlaceSourceType;
  name: string;
  url: string;
  fetchedAt: string;
};

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  address: string;
  municipalityCode: string;
  suitableAgeMinMonths?: number;
  suitableAgeMaxMonths?: number;
  indoorOutdoor: IndoorOutdoor;
  priceLevel?: number;
  strollerFriendly?: boolean;
  nursingRoom?: boolean;
  diaperChanging?: boolean;
  tags?: PlaceTag[];
  imageUrl?: string;
  shortDescription?: string;
  sourceUrl?: string;
  sourceCheckedAt?: string;
  status: ContentStatus;

  // —— v2 新增（详情页 / 采集管线）——
  nameZh?: string;
  description?: string;
  descriptionZh?: string;
  media: PlaceMedia[];
  labels: PlaceLabel[];
  prices?: PlacePrice[];
  reservation?: PlaceReservation;
  businessHours?: string;
  closedDays?: string;
  parking?: boolean;
  accessInfo?: string;
  transitAccess?: PlaceTransitAccess[];
  phone?: string;
  websiteUrl?: string;
  googlePlaceId?: string;
  provenance: PlaceSource[];
  version: number;
};

/**
 * 生成 Place 时的输入：除派生字段外的完整或部分字段。
 * 由数据文件 / 采集管线提供，经 derivePlaceFields 补齐派生字段。
 */
export type PlaceInput = Omit<
  Place,
  'media' | 'labels' | 'provenance' | 'version'
> &
  Partial<Pick<Place, 'media' | 'labels' | 'provenance' | 'version'>>;

/**
 * 从旧 schema 数据自动派生 v2 字段：
 * - media：优先显式 media，其次 imageUrl 单图封面
 * - labels：布尔设施位 + tags + priceLevel=0 派生（不重复）
 * - provenance：优先显式来源，其次 sourceUrl 派生 manual 来源
 * - version：默认 1
 */
export function derivePlaceFields(input: PlaceInput): Place {
  const media: PlaceMedia[] =
    input.media && input.media.length > 0
      ? input.media
      : input.imageUrl
        ? [{ id: `${input.id}-cover`, type: 'image', url: input.imageUrl, cover: true }]
        : [];

  const labels: PlaceLabel[] = [...(input.labels ?? [])];
  const push = (label: PlaceLabel) => {
    if (!labels.includes(label)) labels.push(label);
  };
  if (input.indoorOutdoor) push(input.indoorOutdoor);
  if (input.strollerFriendly) push('baby-car');
  if (input.nursingRoom) push('nursing-room');
  if (input.diaperChanging) push('diaper-changing');
  if (input.tags?.includes('dining')) push('dining');
  if (input.priceLevel === 0) push('free');
  if (input.reservation?.mode === 'required') push('reservation-required');
  if (input.reservation?.mode === 'optional') push('reservation-optional');
  if (input.parking) push('parking');

  const provenance: PlaceSource[] =
    input.provenance && input.provenance.length > 0
      ? input.provenance
      : input.sourceUrl
        ? [
            {
              type: 'manual',
              name: 'manual',
              url: input.sourceUrl,
              fetchedAt: input.sourceCheckedAt ?? new Date().toISOString(),
            },
          ]
        : [];

  return {
    ...input,
    media,
    labels,
    provenance,
    version: input.version ?? 1,
  };
}

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type WeatherSummary = {
  condition: 'sunny' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'unknown';
  temperatureCelsius?: number;
};

/** 用户提交的地点纠错报告类型。 */
export type PlaceReportType =
  | 'business_hours'
  | 'price'
  | 'reservation'
  | 'address'
  | 'media'
  | 'outdated'
  | 'closed'
  | 'other';

export const PLACE_REPORT_TYPES: PlaceReportType[] = [
  'business_hours',
  'price',
  'reservation',
  'address',
  'media',
  'outdated',
  'closed',
  'other',
];

/** UI 展示分组（仅展示层，不改数据模型）。 */
export type PlaceGroup =
  | 'nature'
  | 'play'
  | 'theme'
  | 'culture'
  | 'shop'
  | 'food'
  | 'event'
  | 'other';

export const PLACE_GROUPS: PlaceGroup[] = [
  'nature',
  'play',
  'theme',
  'culture',
  'shop',
  'food',
  'event',
  'other',
];

export const CATEGORY_GROUP: Record<PlaceCategory, PlaceGroup> = {
  park: 'nature',
  zoo: 'nature',
  aquarium: 'nature',
  playground: 'play',
  'children-hall': 'play',
  'indoor-play': 'play',
  'toy-play': 'play',
  'amusement-park': 'theme',
  museum: 'culture',
  library: 'culture',
  facility: 'other',
  shop: 'shop',
  restaurant: 'food',
  event: 'event',
  other: 'other',
};
