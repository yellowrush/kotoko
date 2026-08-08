# Place Report to GitHub Issue Workflow

`POST /api/v1/places/:placeId/reports` accepts public place correction reports.

Request body:

```json
{
  "type": "business_hours",
  "detail": "Optional correction detail, up to 2000 characters.",
  "contactEmail": "optional@example.com"
}
```

Rules:

- `type` must be one of `business_hours`, `price`, `reservation`, `address`, `media`, `outdated`, `closed`, or `other`.
- Unknown fields are rejected.
- Each IP is limited to 5 reports per 10 minutes.
- The API stores the report in the in-memory admin queue first, then attempts to create a GitHub Issue.
- Missing GitHub configuration or GitHub API failure does not reject the user report.
- `contactEmail` and IP address are not written to the public GitHub Issue body.
- Identical successful GitHub issues are deduplicated in memory for 24 hours by place, type, and detail.

Response:

```json
{
  "id": "report-id",
  "status": "received",
  "issue": {
    "status": "created",
    "issueNumber": 42,
    "issueUrl": "https://github.com/yellowrush/kotoko/issues/42"
  }
}
```

When GitHub is not configured, `issue.status` is `skipped` with reason `missing_config`.
When GitHub fails, `issue.status` is `failed`, but the report remains accepted.

Required production environment variables:

- `GITHUB_TOKEN`: fine-grained token with Issues write access to the target repository.
- `GITHUB_ISSUE_REPO`: target repository, currently `yellowrush/kotoko`.

Optional environment variables:

- `GITHUB_API_URL`: override GitHub API base URL for tests or GitHub Enterprise.

GitHub Actions settings:

- `REPORT_AGENT_ASSIGNEE`: optional repository variable. Defaults to `copilot`; set to `codex` if the Codex GitHub agent is enabled for this repository.
- `REPORT_CODEX_ASSIGNEE`: optional repository variable. Defaults to `codex`; used when a maintainer comments `/codex`.
- `REPORT_OPENCODE_ASSIGNEE`: optional repository variable. Used when a maintainer comments `/opencode`; falls back to `REPORT_AGENT_ASSIGNEE` when empty.
- `REPORT_AGENT_BASE_BRANCH`: optional repository variable. Defaults to `develop`.

Reviewer flow:

1. A user submits a place report.
2. The API creates a GitHub Issue with `report` and `report:{type}` labels.
3. A maintainer verifies the report.
4. Comment `/fix`, `/codex`, or `/opencode` on the issue, or run `Report Issue Agent` manually.
5. The workflow comments the agent instructions and assigns the configured coding agent account.
