import { describe, expect, it } from "vitest";
import { buildApp, API_PREFIX } from "../src/app";
import { seedPlaces } from "../src/data/places";

describe("seedPlaces event deduplication", () => {
  it("contains exactly one entry per event name", () => {
    const events = seedPlaces.filter((p) => p.category === "event");
    const names = events.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("GET /api/v1/places", () => {
  it("returns only published places", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBeGreaterThan(0);
    expect(
      body.places.every((p: { status: string }) => p.status === "published"),
    ).toBe(true);
    await app.close();
  });

  it("filters by category", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?category=park`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBeGreaterThan(0);
    expect(
      body.places.every((p: { category: string }) => p.category === "park"),
    ).toBe(true);
    await app.close();
  });

  it("filters by indoorOutdoor", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?indoorOutdoor=indoor`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(
      body.places.every(
        (p: { indoorOutdoor: string }) => p.indoorOutdoor === "indoor",
      ),
    ).toBe(true);
    await app.close();
  });

  it("filters by tags", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?tags=dining`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBeGreaterThan(0);
    expect(
      body.places.every((p: { tags?: string[] }) => p.tags?.includes("dining")),
    ).toBe(true);
    await app.close();
  });

  it("filters by municipality and rail line before returning places", async () => {
    const app = buildApp();
    const municipality = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?municipality=13222`,
    });
    expect(municipality.statusCode).toBe(200);
    expect(municipality.json().places).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "spadium-japon" }),
      ]),
    );
    expect(
      municipality
        .json()
        .places.every(
          (p: { municipalityCode: string }) => p.municipalityCode === "13222",
        ),
    ).toBe(true);

    const rail = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?rail=seibu-ikebukuro`,
    });
    expect(rail.statusCode).toBe(200);
    expect(rail.json().places).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "spadium-japon" }),
      ]),
    );
    expect(
      rail
        .json()
        .places.every((p: { transitAccess?: { lineId: string }[] }) =>
          p.transitAccess?.some(
            (access) => access.lineId === "seibu-ikebukuro",
          ),
        ),
    ).toBe(true);
    await app.close();
  });

  it("returns lightweight place facets for filter chips", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places/facets?tags=dining`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBeGreaterThan(0);
    expect(body.municipalities["13222"]).toBeGreaterThan(0);
    expect(body.railLines["seibu-ikebukuro"]).toBeGreaterThan(0);
    expect(body.places).toBeUndefined();
    await app.close();
  });

  it("exposes public transit access metadata for rail filtering", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places/kiba-park`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().transitAccess).toContainEqual(
      expect.objectContaining({
        lineId: "tokyo-metro-tozai",
        stationName: "木場",
      }),
    );
    await app.close();
  });

  it("includes Spadium Japon as a public family-usable facility", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places/spadium-japon`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id: "spadium-japon",
      category: "facility",
      municipalityCode: "13222",
      nursingRoom: true,
      diaperChanging: true,
      parking: true,
    });
    expect(res.json().tags).toContain("dining");
    expect(res.json().transitAccess).toContainEqual(
      expect.objectContaining({ lineId: "seibu-ikebukuro" }),
    );
    await app.close();
  });

  it("serves family-useful commercial facilities through the facility category", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?category=facility`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const names = body.places.map((p: { name: string }) => p.name);
    expect(body.total).toBeGreaterThanOrEqual(4650);
    expect(names).toContain("アーバンドック ららぽーと豊洲");
    expect(names).toContain("アリオ亀有");
    expect(names).toContain("アカチャンホンポ");
    expect(names).toContain("(株)西松屋チェーン 群馬前橋店");
    expect(names).toContain("トイザらス");
    expect(names).not.toContain("(株)久米商店");
    expect(names.some((name: string) => name.includes("オートモール"))).toBe(
      false,
    );
    expect(names.some((name: string) => name.includes("パチンコ"))).toBe(false);
    expect(names.some((name: string) => name.includes("駐車場"))).toBe(false);
    await app.close();
  });

  it("serves family-friendly restaurants through the restaurant category", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?category=restaurant`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const names = body.places.map((p: { name: string }) => p.name);
    expect(body.total).toBeGreaterThanOrEqual(6331);
    expect(names).toContain("Bamiyan");
    expect(
      body.places.every(
        (p: { category: string; tags?: string[] }) =>
          p.category === "restaurant" && p.tags?.includes("dining"),
      ),
    ).toBe(true);
    expect(
      names.some((name: string) => /bar|pub|adult|pachinko/i.test(name)),
    ).toBe(false);
    await app.close();
  });

  it("serves Kameido children hall source media links", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places/children-hall-kameido`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().media).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "image",
          url: "https://fukushi.unchusha.com/kameido/kameido.jpg",
          cover: true,
        }),
        expect.objectContaining({
          type: "video",
          url: "https://www.instagram.com/kotojido_kame/",
        }),
        expect.objectContaining({
          type: "video",
          url: "https://twitter.com/kotojido_kame/",
        }),
      ]),
    );
    await app.close();
  });

  it("serves Tokyo Toy Museum official media links", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places/tokyo-toy-museum`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      websiteUrl: "https://art-play.or.jp/ttm/",
      sourceUrl: "https://art-play.or.jp/ttm/",
    });
    expect(res.json().media).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "image",
          url: "https://art-play.or.jp/ttm/assets/img/common/img_ogp.png",
          cover: true,
        }),
        expect.objectContaining({
          type: "video",
          url: "https://art-play.or.jp/ttm/assets/img/index/movie.mp4",
          thumbnailUrl:
            "https://art-play.or.jp/ttm/assets/img/index/img_poster.jpg",
        }),
        expect.objectContaining({
          type: "video",
          url: "https://www.instagram.com/reel/Dbc3FssSMkk/",
        }),
        expect.objectContaining({
          type: "video",
          url: "https://www.youtube.com/channel/UCfMLoKVg_lC4J6YDIfVh8uQ",
        }),
      ]),
    );
    await app.close();
  });

  it("serves generated Japan zoo places from open map data", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?category=zoo`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const names = body.places.map((p: { name: string }) => p.name);
    expect(body.total).toBeGreaterThanOrEqual(80);
    expect(names).toContain("旭山動物園");
    expect(names).toContain("京都市動物園");
    expect(names).toContain("天王寺動物園");
    expect(names).toContain("アフリカンサファリ");
    expect(names).toContain("こども動物園 高島平分園");
    expect(names).toContain("市川市動植物園");
    expect(names).toContain("足立区生物園");
    expect(names).toContain("東武動物公園");
    expect(names).toContain("夢見ヶ崎動物公園");
    expect(names).toContain("千葉市動物公園");
    expect(names).toContain("篠崎ポニーランド");
    expect(names).toContain("ヒノトントンZOO（羽村市動物公園）");
    expect(names).toContain("らぶりー・あにもあ");
    expect(names).toContain("Mofureya Kalahari Zoo");
    expect(names).toContain("わくわくあにまるフィールド");
    expect(names).toContain("横浜市立金沢動物園");
    expect(names.filter((name: string) => name === "上野動物園")).toHaveLength(
      1,
    );
    expect(names).not.toContain("レッサーパンダ舎");
    expect(names).not.toContain("モルモットふれあいコーナー");
    await app.close();
  });

  it("serves generated Japan aquarium places from open map data", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?category=aquarium`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const names = body.places.map((p: { name: string }) => p.name);
    expect(body.total).toBeGreaterThanOrEqual(100);
    expect(names).toContain("鴨川シーワールド");
    expect(names).toContain("海遊館");
    expect(names).toContain("京都水族館");
    expect(names).toContain("名古屋港水族館");
    expect(names).toContain("沖縄美ら海水族館");
    expect(names).toContain("マリンワールド海の中道");
    expect(names).toContain("世界淡水魚園水族館 アクア・トトぎふ");
    expect(names).toContain("島根県立しまね海洋館 アクアス");
    expect(
      names.filter((name: string) => name === "サンシャイン水族館"),
    ).toHaveLength(1);
    expect(names).not.toContain("サンシャイン国際水族館");
    await app.close();
  });

  it("serves generated Japan museum places from open map data", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?category=museum`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const names = body.places.map((p: { name: string }) => p.name);
    expect(body.total).toBeGreaterThanOrEqual(2300);
    expect(names).toContain("国立科学博物館");
    expect(names).toContain("日本科学未来館");
    expect(names).toContain("鉄道博物館");
    expect(names).toContain("京都鉄道博物館");
    expect(names).toContain("江戸東京博物館");
    expect(names).toContain("三鷹の森ジブリ美術館");
    expect(names).toContain("消防博物館");
    expect(names).toContain("東京国立博物館");
    expect(names).toContain("トヨタ産業技術記念館");
    expect(names).not.toContain("Tokyo Toy Museum");
    expect(
      names.some((name: string) => name.includes("ミュージアムショップ")),
    ).toBe(false);
    expect(names.some((name: string) => name.includes("駐車場"))).toBe(false);
    await app.close();
  });

  it("serves generated Japan library places from open map data", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?category=library`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const names = body.places.map((p: { name: string }) => p.name);
    expect(body.total).toBeGreaterThanOrEqual(3400);
    expect(names).toContain("国際こども図書館");
    expect(names).toContain("国立国会図書館・東京本館");
    expect(names).toContain("京都府立図書館");
    expect(names).toContain("大阪府立中央図書館");
    expect(names).toContain("札幌市中央図書館");
    expect(names).toContain("福岡県立図書館");
    expect(names).toContain("沖縄県立図書館");
    expect(names).not.toContain("Library");
    expect(names.some((name: string) => name.includes("大学"))).toBe(false);
    expect(names.some((name: string) => name.includes("書店"))).toBe(false);
    expect(names.some((name: string) => name.includes("駐車場"))).toBe(false);
    await app.close();
  });

  it("serves generated major metro indoor play places from open map data", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?category=indoor-play`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const names = body.places.map((p: { name: string }) => p.name);
    expect(body.total).toBeGreaterThanOrEqual(34);
    expect(names).toContain("アソブーン ~ASOBooN~");
    expect(names).toContain("あっぴぃ高輪子育てひろば");
    expect(names).toContain("ファンタジーキッズリゾート海老名");
    expect(names).toContain("ボーネルンド プレイヴィル");
    expect(names).toContain("子育てひろば江戸川橋");
    expect(names).toContain("子育て支援センター「はんだっこ」");
    expect(names).toContain("親と子のつどいの広場 とぴあ");
    expect(names).not.toContain("カオルキッズランド");
    expect(names).not.toContain("グローバルキッズパーク");
    expect(names).not.toContain("フレンドキッズランド 田柄第二園");
    await app.close();
  });

  it("serves generated major metro children hall places from open map data", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?category=children-hall`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const names = body.places.map((p: { name: string }) => p.name);
    expect(body.total).toBeGreaterThanOrEqual(1700);
    expect(names).toContain("あずさわ児童館");
    expect(names).toContain("くにたち西児童館");
    expect(names).toContain("えびなこどもセンター");
    expect(names).toContain("あま市立美和児童館");
    expect(names).toContain("がまごおり児童館");
    expect(names).toContain("すずらんだい児童館");
    expect(
      names.filter((name: string) => name === "江東区立亀戸児童館"),
    ).toHaveLength(1);
    expect(names).not.toContain("AED(西部児童館)");
    expect(names).not.toContain("カインズ八王子長房店前(児童館前)");
    expect(names.some((name: string) => name.includes("児童相談所"))).toBe(
      false,
    );
    expect(names.some((name: string) => name.includes("児童遊園"))).toBe(false);
    await app.close();
  });

  it("serves toy play places from generated and official public sources", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?category=toy-play`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const names = body.places.map((p: { name: string }) => p.name);
    expect(body.total).toBeGreaterThanOrEqual(12);
    expect(names).toContain("東京おもちゃ美術館");
    expect(names).toContain("柴又のおもちゃ博物館");
    expect(names).toContain("現代玩具博物館・オルゴール夢館");
    expect(names).toContain("檜原森のおもちゃ美術館");
    expect(names).toContain("焼津おもちゃ美術館");
    expect(names).toContain("那賀町山のおもちゃ美術館");
    expect(names).toContain("やんばる森のおもちゃ美術館");
    expect(names.some((name: string) => name.includes("トイザらス"))).toBe(
      false,
    );
    expect(names.some((name: string) => name.includes("販売"))).toBe(false);
    await app.close();
  });

  it("serves generated Japan amusement park places from open map data", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?category=amusement-park`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const names = body.places.map((p: { name: string }) => p.name);
    expect(body.total).toBeGreaterThanOrEqual(65);
    expect(names).toContain("浅草花やしき");
    expect(names).toContain("東京サマーランド");
    expect(names).toContain("ジブリパーク");
    expect(names).toContain("ジャングリア沖縄");
    expect(names).toContain("ナガシマスパーランド");
    expect(names).toContain("ひらかたパーク");
    expect(names).toContain("志摩スペイン村");
    expect(names).toContain("日本モンキーパーク");
    expect(names).toContain("東京ディズニーランド");
    expect(names).not.toContain("Dynam amusement park");
    expect(names).not.toContain("遊園地ゾーン");
    expect(names).not.toContain("石の遊園地");
    expect(names.some((name: string) => name.includes("児童遊園"))).toBe(false);
    await app.close();
  });

  it("serves generated major metro playground places from open map data", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?category=playground`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const names = body.places.map((p: { name: string }) => p.name);
    expect(body.total).toBeGreaterThanOrEqual(2500);
    expect(names).toContain("あかぎ児童遊園");
    expect(names).toContain("にいじゅくプレイパーク");
    expect(names).toContain("北馬込わんぱく児童公園");
    expect(names).toContain("文京区立白山四丁目第二児童遊園");
    expect(names).toContain("西鶴間七丁目児童遊園");
    expect(names).toContain("南千倉児童遊園");
    expect(names).toContain("熊之庄新宮西児童遊園");
    expect(names).toContain("新金岡3丁1番児童遊園");
    expect(names).toContain("あしや児童遊園地");
    expect(names).not.toContain("Airoport Playground");
    await app.close();
  });

  it("serves curated event places without duplicates from generated data", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?category=event`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const names = body.places.map((p: { name: string }) => p.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("すみだまつり・こどもまつり");
    expect(names).toContain("隅田川花火大会");

    const duplicate = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places/tokyo-event-1f5caf26e7f53ae3`,
    });
    expect(duplicate.statusCode).toBe(404);

    const curated = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places/sumida-matsuri-kodomo`,
    });
    expect(curated.statusCode).toBe(200);
    await app.close();
  });

  it("filters by radius from a center point", async () => {
    const app = buildApp();
    // 東京駅付近を中心に半径 2km 以内の地点のみ返す
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?latitude=35.6812&longitude=139.7671&radius=2`,
    });
    expect(res.statusCode).toBe(200);
    const wider = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?latitude=35.6812&longitude=139.7671`,
    });
    expect(wider.statusCode).toBe(200);
    const body = res.json();
    expect(body.places.length).toBeGreaterThan(0);
    expect(body.places.length).toBeLessThan(wider.json().places.length);
    await app.close();
  });

  it("defaults center-point searches to a 3km radius", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?latitude=35.6812&longitude=139.7671`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const publishedCount = seedPlaces.filter(
      (p) => p.status === "published",
    ).length;
    expect(body.places.length).toBeGreaterThan(0);
    expect(body.places.length).toBeLessThan(publishedCount);
    await app.close();
  });

  it("returns no places for a radius around an empty area", async () => {
    const app = buildApp();
    // 太平洋上を中心に半径 5km 以内には地点が存在しない
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places?latitude=35.2&longitude=140.9&radius=5`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(0);
    await app.close();
  });
});

describe("GET /api/v1/places/:placeId", () => {
  it("returns a place by id", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places/ueno-park`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe("ueno-park");
    await app.close();
  });

  it("returns 404 for unknown place", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/places/does-not-exist`,
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
    await app.close();
  });
});

describe("GET /api/v1/content/version", () => {
  it("reports the places count", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/content/version`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().places.count).toBeGreaterThan(0);
    await app.close();
  });
});
