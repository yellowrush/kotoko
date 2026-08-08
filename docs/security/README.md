# Security

Kodoko First Release keeps the backend small: authentication placeholders and public content APIs only. Child data stays in the browser and must not be uploaded.

## Browser And API Headers

- API responses use Helmet security headers, including `X-Content-Type-Options` and referrer policy.
- Web CSP should stay restrictive when hosting is configured. Do not add third-party script, analytics, font, or AI endpoints without a privacy review.
- PWA runtime caching is limited to public content such as places. Authentication endpoints must remain network-only.

## CORS

- `WEB_ORIGIN` is a comma-separated allowlist for production and staging web origins.
- Local development allows `http://localhost:5173` and `http://127.0.0.1:5173`.
- Unknown origins must not receive credentialed CORS headers.
- Keep credentials enabled only for the allowlist; do not return wildcard `Access-Control-Allow-Origin` with credentials.

## Logging

- Logs must not include child nickname, birth date, age/months, interests, accessibility needs, precise location, policy match results, or IndexedDB content.
- Frontend error logging should record only anonymous error messages and stack traces when needed.
- API report logs should avoid printing user-submitted correction detail unless a private admin workflow explicitly requires it.

## Anonymous Place Reports

- The public issue/report pipeline may receive only place correction metadata and optional contact email.
- Contact email must remain hidden from public issue text.
- Treat report text as untrusted input and escape it before rendering or forwarding.

## Future Changes Requiring Review

- Cloud sync for child data.
- Family sharing or server-side child profile storage.
- Analytics, crash reporting, or session replay.
- Third-party AI processing.
- Precise location persistence.
- Uploading child photos or medical records.
