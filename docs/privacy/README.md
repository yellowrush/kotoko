# Privacy

Kodoko First Release is designed as a local-first parenting companion. Child-related data is kept on the user's device by default and is not uploaded to the API.

This document is a product privacy draft for engineering and release review. It is not legal advice. Before production release, fill in the operating entity, contact address, and any jurisdiction-specific wording.

## Data We Store Locally

- Child profiles: nickname, birth date, interests, accessibility needs, and local timestamps.
- User preferences: locale, municipality, usual recommendation distance, and indoor/outdoor preference.
- Local app state: favorites, read knowledge articles, policy reminder status, local place comments, and offline pending correction reports.
- Backup files exported by the user remain under the user's control.

All child profiles and policy matching states are stored through IndexedDB. They are not stored in localStorage and are not sent to the server.

## Data We Request From Public Services

- Public places, knowledge articles, policies, and content versions are fetched from the Kodoko public API.
- Weather uses rounded coordinates, roughly city/neighborhood level, only when the user has granted location permission.
- Exact GPS coordinates are used in memory for recommendations and are not persisted.
- Municipality fallback uses the selected municipality centroid from local preferences.

## Data We Do Not Collect

- Child real names, photos, medical records, precise home address, or family relationship details.
- Child profile data in API requests, URLs, logs, analytics, crash reports, or third-party AI services.
- Personalized recommendation history on the server.
- Policy eligibility results on the server.

## Anonymous Correction Reports

Place correction reports may be sent to the API when the user submits them. The report schema is limited to correction type, detail text, and optional contact email.

- Do not include child names, birth dates, photos, addresses, or medical details in correction text.
- Contact email is for follow-up only and must not be published into public issue text.
- Offline pending reports are queued locally and sent only when the user retries or the app can submit them.

## Third Parties

- Public weather may use Open-Meteo or an equivalent weather endpoint configured by the app.
- Public official links may open Japanese government or municipality websites.
- No child data is sent to external AI services.
- No analytics SDK is enabled in First Release. If analytics is added later, it must stay anonymous and must not include child data, precise location, policy match results, or IndexedDB content.

## User Control

The app must provide local data export, import, and delete-all controls. Because First Release does not cloud-sync child data, clearing browser data or changing devices can remove local profiles unless the user exports a backup.

## Policy And Health Content

Knowledge and policy content is an auxiliary explanation for parents. Official Japanese pages, municipality notices, the Maternal and Child Health Handbook, and medical institutions are the authoritative sources. Kodoko must not provide diagnosis, treatment instructions, or final eligibility promises.

## References

- Japan Personal Information Protection Commission: https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/
- Japan Personal Information Protection Commission Q&A: https://www.ppc.go.jp/personalinfo/faq/APPI_QA/
