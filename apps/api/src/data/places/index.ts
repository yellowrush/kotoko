import type { Place, PlaceInput } from "@kodoko/domain";
import { derivePlaceFields } from "@kodoko/domain";
import { basePlaces } from "./base";
import { childrenHallPlaces } from "./children-halls";
import { toyPlayPlaces } from "./toy-plays";
import { amusementParkPlaces } from "./amusement-parks";
import { waterParkPlaces } from "./water-parks";
import { tokyoParkPlaces } from "./tokyo-parks";
import { trainMuseumPlaces } from "./train-museums";
import { librarySportPlaces } from "./libraries-sports";
import { supplementPlaces } from "./supplements";
import { generatedAquariumPlaces } from "./generated-aquariums";
import { generatedChildrenHallPlaces } from "./generated-children-halls";
import { generatedIndoorPlayPlaces } from "./generated-indoor-plays";
import { generatedPlaygroundPlaces } from "./generated-playgrounds";
import { generatedZooPlaces } from "./generated-zoos";
import { zooSupplementPlaces } from "./zoo-supplements";
import { eventPlaces } from "./events";
import { generatedEventPlaces } from "./generated-events";
import { withTransitAccess } from "./transit";

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
  ...trainMuseumPlaces,
  ...librarySportPlaces,
  ...supplementPlaces,
  ...generatedAquariumPlaces,
  ...generatedChildrenHallPlaces,
  ...generatedIndoorPlayPlaces,
  ...generatedPlaygroundPlaces,
  ...generatedZooPlaces,
  ...zooSupplementPlaces,
  ...eventPlaces,
  ...generatedEventPlaces,
];

function eventDedupeKey(input: PlaceInput): string {
  return `${input.name.normalize("NFKC").trim()}|${input.municipalityCode}`;
}

function dedupeEventPlaces(inputs: PlaceInput[]): PlaceInput[] {
  const seen = new Set<string>();
  return inputs.filter((input) => {
    if (input.category !== "event") return true;
    const key = eventDedupeKey(input);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const seedPlaces: Place[] = dedupeEventPlaces(allInputs)
  .map(withTransitAccess)
  .map(derivePlaceFields);

export function getPlaceById(id: string): Place | undefined {
  return seedPlaces.find((p) => p.id === id);
}
