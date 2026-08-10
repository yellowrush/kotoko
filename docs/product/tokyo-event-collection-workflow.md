# Tokyo Event Collection Workflow

This workflow collects public Tokyo event candidates every morning for Kodoko content review.
It covers festivals, parenting events, child-friendly workshops, flea markets, bazaars, and
seasonal family events.

## Boundaries

- Collect public event data only. Do not read, upload, infer, or log child profiles, child
  age, interests, precise private location, IndexedDB contents, contact details, or analytics data.
- Start with Tokyo only. Expanding to Kanagawa, Chiba, Saitama, or all Japan requires updating
  source configuration and review rules.
- Collection output is a review candidate set. It must not be published directly into
  `seedPlaces`.
- Commercial APIs are optional and disabled by default. Enable them only after confirming
  license, cost, attribution, redistribution rights, and cache policy.
- Page scraping should store only structured event metadata and source URLs, not copied article
  bodies or images.

## Source Tiers

1. Official open data: Tokyo Metropolitan Government and municipality CSV/JSON resources.
2. Official event pages: wards, parks, libraries, children halls, culture facilities, and tourism
   associations. Unstructured pages produce low-confidence candidates.
3. Licensed commercial feeds: for example EventBank. These require explicit configuration and
   license review before use.

## Daily Run

GitHub Actions runs at 21:30 UTC, which is 06:30 JST.

Steps:

1. Load `tools/tokyo-events/sources.json`.
2. Search the Tokyo open-data CKAN API for configured event queries.
3. Download matching CSV/JSON resources with per-request timeouts.
4. Normalize rows into `TokyoEventCandidate` records.
5. Categorize by keyword: `festival`, `parenting`, `flea-market`, `seasonal`,
   `child-friendly`, or `general`.
6. Deduplicate by title, start date, venue, and source URL.
7. Keep candidates inside the lookahead window when a date can be parsed. Keep undated
   candidates for human review.
8. Upload the full JSON artifact and write a review-friendly issue body with candidate previews,
   error details, and links.

## Candidate Shape

```ts
type TokyoEventCandidate = {
  id: string;
  title: string;
  category: 'festival' | 'parenting' | 'flea-market' | 'seasonal' | 'child-friendly' | 'general';
  startsAt?: string;
  endsAt?: string;
  venueName?: string;
  address?: string;
  municipalityCode?: string;
  latitude?: number;
  longitude?: number;
  sourceName: string;
  sourceUrl: string;
  fetchedAt: string;
  confidence: 'high' | 'medium' | 'low';
  reviewNotes: string[];
};
```

## Review To Publish

Human review is required before publishing:

- Confirm the event source URL, date, venue, and family relevance.
- Prefer official sources. Treat commercial or copied listings as blocked until the license is clear.
- One-off events should remain event candidates unless a durable venue should be added.
- Repeating markets or permanent event spaces may become public place data in
  `apps/api/src/data/places/`.
- Published records must keep `sourceUrl`, `sourceCheckedAt`, `status: 'published'`, and
  provenance.

## Future Work

- If event volume grows, add a dedicated `Event` domain model and `/api/v1/events` public API
  instead of forcing short-lived events into `Place`.
- If a licensed commercial source is enabled, add an ADR covering terms, cache policy,
  attribution, removal handling, and operating cost.
- If the workflow later opens PRs automatically, PRs must contain only public content changes and
  source references.
