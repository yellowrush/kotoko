import type { Place, PlaceInput } from "@kodoko/domain";
import { derivePlaceFields } from "@kodoko/domain";
import { basePlaces } from "./base";
import { childrenHallPlaces } from "./children-halls";
import { toyPlayPlaces } from "./toy-plays";
import { generatedToyPlayPlaces } from "./generated-toy-plays";
import { toyMuseumSupplementPlaces } from "./toy-museum-supplements";
import { amusementParkPlaces } from "./amusement-parks";
import { generatedAmusementParkPlaces } from "./generated-amusement-parks";
import { waterParkPlaces } from "./water-parks";
import { tokyoParkPlaces } from "./tokyo-parks";
import { trainMuseumPlaces } from "./train-museums";
import { librarySportPlaces } from "./libraries-sports";
import { supplementPlaces } from "./supplements";
import { generatedAquariumPlaces } from "./generated-aquariums";
import { generatedChildrenHallPlaces } from "./generated-children-halls";
import { generatedIndoorPlayPlaces } from "./generated-indoor-plays";
import { generatedLibraryPlaces } from "./generated-libraries";
import { generatedMuseumPlaces } from "./generated-museums";
import { generatedPlaygroundPlaces } from "./generated-playgrounds";
import { generatedRestaurantPlaces } from "./generated-restaurants";
import { generatedShopFacilityPlaces } from "./generated-shop-facilities";
import { generatedZooPlaces } from "./generated-zoos";
import { zooSupplementPlaces } from "./zoo-supplements";
import { eventPlaces } from "./events";
import { generatedEventPlaces } from "./generated-events";
import { generatedKodomoEventPlaces } from "./generated-kodomo-events";
import { generatedMediaSupplements } from "./generated-media-supplements";
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
  ...generatedToyPlayPlaces,
  ...toyMuseumSupplementPlaces,
  ...amusementParkPlaces,
  ...generatedAmusementParkPlaces,
  ...waterParkPlaces,
  ...tokyoParkPlaces,
  ...trainMuseumPlaces,
  ...librarySportPlaces,
  ...supplementPlaces,
  ...generatedAquariumPlaces,
  ...generatedChildrenHallPlaces,
  ...generatedIndoorPlayPlaces,
  ...generatedLibraryPlaces,
  ...generatedMuseumPlaces,
  ...generatedPlaygroundPlaces,
  ...generatedRestaurantPlaces,
  ...generatedShopFacilityPlaces,
  ...generatedZooPlaces,
  ...zooSupplementPlaces,
  ...eventPlaces,
  ...generatedEventPlaces,
  ...generatedKodomoEventPlaces,
];

const kameidoThirdPlaygroundOfficialUrl =
  "https://www.city.koto.lg.jp/470601/shisetsuannai/kokyo/koen/jidokoen/16566.html";

const manualPlaceInputPatches: Record<string, Partial<PlaceInput>> = {
  "children-hall-asakusa": {
    media: [],
  },
  "osm-playground-8b67993b": {
    address: "東京都江東区亀戸3-12-10",
    municipalityCode: "13108",
    websiteUrl: kameidoThirdPlaygroundOfficialUrl,
    sourceUrl: kameidoThirdPlaygroundOfficialUrl,
    sourceCheckedAt: "2026-08-13T00:00:00.000Z",
    media: [
      {
        id: "osm-playground-8b67993b-placeholder",
        type: "image",
        url: "/media/placeholder/playground-1.svg",
        alt: "亀戸三丁目第3児童遊園の仮画像",
        credit:
          "Kodoko placeholder (official public page has no reusable media; OSM way 148642773)",
        license: "placeholder-blocked",
        sourceUrl: kameidoThirdPlaygroundOfficialUrl,
        cover: true,
      },
    ],
    provenance: [
      {
        type: "official",
        name: "江東区 亀戸三丁目児童遊園",
        url: kameidoThirdPlaygroundOfficialUrl,
        fetchedAt: "2026-08-13T00:00:00.000Z",
      },
    ],
  },
};

const placeInputPatchIds = new Set([
  ...Object.keys(manualPlaceInputPatches),
  ...Object.keys(generatedMediaSupplements),
]);

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

function applyPlaceInputPatch(input: PlaceInput): PlaceInput {
  if (!placeInputPatchIds.has(input.id)) return input;
  const manualPatch = manualPlaceInputPatches[input.id] ?? {};
  const generatedPatch = generatedMediaSupplements[input.id] ?? {};
  const patch = {
    ...manualPatch,
    ...generatedPatch,
    provenance:
      manualPatch.provenance || generatedPatch.provenance
        ? [
            ...(generatedPatch.provenance ?? []),
            ...(manualPatch.provenance ?? []),
          ]
        : undefined,
  };
  if (!patch) return input;

  return {
    ...input,
    ...patch,
    provenance: patch.provenance
      ? [...patch.provenance, ...(input.provenance ?? [])]
      : input.provenance,
  };
}

const PLACEHOLDER_PREFIX: Record<string, string> = {
  park: "park",
  playground: "playground",
  museum: "museum",
  zoo: "zoo",
  aquarium: "aquarium",
  library: "library",
  facility: "facility",
  "indoor-play": "indoor-play",
  shop: "shop",
  restaurant: "restaurant",
  event: "event",
  other: "facility",
  "children-hall": "children-hall",
  "toy-play": "toy-play",
  "amusement-park": "amusement-park",
};

function placeholderImageUrl(category: string, id: string): string {
  const prefix = PLACEHOLDER_PREFIX[category] ?? "facility";
  const checksum = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const variant = (checksum % 3) + 1;
  return `/media/placeholder/${prefix}-${variant}.svg`;
}

function isPlaceholderMedia(media: { url: string; license?: string }): boolean {
  return (
    media.url.includes("/media/placeholder/") ||
    /placeholder/i.test(media.license ?? "")
  );
}

// メディアを明示的に指定した場所（実画像・空・手動 placeholder を含む）は
// 自動補完の対象外とする。children-hall-asakusa のように「意図的に空」とした
// 場所もここで守られる。
function authorSetMedia(id: string): boolean {
  const manual = manualPlaceInputPatches[id];
  const generated = generatedMediaSupplements[id];
  return Boolean(
    (manual && "media" in manual) || (generated && "media" in generated),
  );
}

function withPlaceholderMedia(place: Place): Place {
  if (authorSetMedia(place.id)) return place;
  const hasImage = place.media.some(
    (m) => m.type === "image" && !isPlaceholderMedia(m),
  );
  if (hasImage) return place;
  const url = placeholderImageUrl(place.category, place.id);
  return {
    ...place,
    media: [
      ...place.media,
      {
        id: `${place.id}-placeholder`,
        type: "image",
        url,
        alt: place.name,
        credit: "Kodoko placeholder",
        license: "placeholder-blocked",
        cover: true,
      },
    ],
  };
}

export const seedPlaces: Place[] = dedupeEventPlaces(allInputs)
  .map(applyPlaceInputPatch)
  .map(withTransitAccess)
  .map(derivePlaceFields)
  .map(withPlaceholderMedia);

export function getPlaceById(id: string): Place | undefined {
  return seedPlaces.find((p) => p.id === id);
}
