# 15. Observability and operations

## Purpose

Make failures diagnosable without logging personal content and provide runbooks for the likely production incidents.

## Logging

Structured JSON logs contain timestamp, environment, request ID, route, event, duration, status, safe entity hash and error code. Never log raw notes, generated entries, tokens, signed URLs, email, matric number or Telegram message text.

## Metrics

| Metric | Alert signal |
| --- | --- |
| `http_requests_total` / latency | Sustained 5xx or p95 over budget. |
| `db_pool_wait_ms` / active connections | Pool exhaustion or rising wait. |
| `job_age_seconds`, `job_failures_total` | Old queued work or repeated failure. |
| `llm_timeout_total`, `llm_invalid_output_total` | Provider or prompt regression. |
| `telegram_webhook_failures_total` | Telegram retry storm or secret mismatch. |
| `storage_upload_failures_total` | Evidence availability risk. |
| `llm_cost_usd_total` | Budget anomaly by model/purpose/user aggregate. |

## Runbooks

### LLM outage

1. Confirm provider status and error rate.
2. Stop automatic retries beyond configured cap.
3. Keep raw saves enabled and tell students to edit manually.
4. Queue or pause non-critical summaries/reports.
5. Resume after a low-volume smoke call and reconcile failed jobs.

### Telegram webhook failing

1. Check secret header/config and endpoint health.
2. Inspect duplicate update/5xx metrics without reading message content.
3. Re-register webhook if the deployment URL changed.
4. Confirm database connectivity and return retryable errors for transient failure.

### Database connection exhaustion

1. Check pool metrics and recent deploys.
2. Stop runaway workers/jobs, not user data.
3. Reduce serverless connection concurrency or use provider pooling.
4. Restart only the affected service after preserving logs.

### Storage failure

1. Verify bucket and credentials.
2. Keep evidence metadata pending; do not mark unavailable files as ready.
3. Retry upload worker with bounded backoff.
4. Revoke any incorrectly issued URL.

## Support workflow

Support receives request ID, account verification and a plain-language description, not raw student content by default. Operators can inspect safe metadata; content access requires explicit role, purpose and audit event.

## Open questions

- Which error tracker is approved for potentially sensitive metadata?
- Who owns on-call response for a student project after public release?

## Cross-references

See [08-security-and-privacy.md](./08-security-and-privacy.md), [13-infrastructure-devops-and-deployment.md](./13-infrastructure-devops-and-deployment.md), and [19-risks-open-questions-and-future-roadmap.md](./19-risks-open-questions-and-future-roadmap.md).
