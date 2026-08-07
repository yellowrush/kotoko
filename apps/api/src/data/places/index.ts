import type { Place } from '@kodoko/domain';
import { derivePlaceFields } from '@kodoko/domain';
import { basePlaces } from './base';
import { childrenHallPlaces } from './children-halls';
import { toyPlayPlaces } from './toy-plays';
import { amusementParkPlaces } from './amusement-parks';
import { waterParkPlaces } from './water-parks';
import { tokyoParkPlaces } from './tokyo-parks';
import { supplementPlaces } from './supplements';

/**
 * 公共地点数据聚合入口。
 * 所有数据文件提供 PlaceInput（可省略派生字段），此处统一经 derivePlaceFields
 * 补齐 media / labels / provenance / version 后供 API 使用。
 * 内容更新流程：apps/collector 产出候选 → apps/admin 审核 → git PR → 本目录合并发布。
 */

const allInputs = [
  ...basePlaces,
  ...childrenHallPlaces,
  ...toyPlayPlaces,
  ...amusementParkPlaces,
  ...waterParkPlaces,
  ...tokyoParkPlaces,
  ...supplementPlaces,
];

export const seedPlaces: Place[] = allInputs.map(derivePlaceFields);

export function getPlaceById(id: string): Place | undefined {
  return seedPlaces.find((p) => p.id === id);
}
