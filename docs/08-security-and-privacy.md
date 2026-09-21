# 08. Security and privacy

## Purpose

Protect student records, employer details, supervisor information, evidence and channel identities while meeting the product's academic-integrity promise.

## Scope

This is the security baseline for web, PostgreSQL, object storage, LLM calls, Telegram and operations. Legal interpretation of the Nigeria Data Protection Act 2023 requires qualified review.

## Trust boundaries

```text
Student browser/Telegram
  -> authenticated adapter boundary
  -> shared services
  -> PostgreSQL / private object storage
  -> external LLM, OAuth, email and Telegram providers
```

External provider responses and all student-supplied text/files are untrusted. The browser is never trusted for user ID, programme ownership, callback authorization or price/cost data.

## STRIDE threats

| Threat | Example | Control |
| --- | --- | --- |
| Spoofing | Stolen session or Telegram link token | Secure HttpOnly cookies, short-lived single-use tokens, re-auth for unlink/delete. |
| Tampering | Changing `programmeId` in a request | Owner-scoped queries and authorization inside repositories/services. |
| Repudiation | Student disputes generated text | Raw/generated/edited provenance and audit events. |
| Information disclosure | Signed evidence URL shared | Short expiry, private bucket, object ownership check, no raw content in logs. |
| Denial of service | Repeated generation or webhook flood | Per-user/IP/chat limits, body caps, queue limits and provider budgets. |
| Elevation of privilege | Callback button reused for another entry | Callback IDs are hints only; server rechecks identity, ownership and version. |

## Auth and authorization

- Auth.js session cookies are Secure, HttpOnly and SameSite=Lax/appropriate for OAuth flow.
- OAuth state/PKCE and provider callback validation are delegated to Auth.js.
- Email magic links expire and are single-use. Unreliable email delivery shows retry and preserves any local draft.
- Every repository query includes `userId`; never fetch by an unscoped ID and authorize later.
- Telegram identity maps to one user. The webhook secret authenticates Telegram as a source, not as a specific student; identity lookup is still mandatory.

## Telegram threats

- Webhook spoofing: verify secret header and HTTPS endpoint.
- Link-token theft: 10-minute expiry, high-entropy token, hash at rest, one use, bind to Telegram identity when consumed.
- Replay: unique update ID and consumed token checks in a transaction.
- Account takeover: do not link if Telegram identity already belongs to another user; require explicit unlink/recovery.
- Malicious callback data: treat it as untrusted input and validate with Zod.

## File security

- Allow-list MIME/type and extension pairs; reject executable, archive and macro-enabled formats initially.
- Default limits: 10 MB per file, 50 MB per request, configurable per deployment.
- Inspect magic bytes, not only browser MIME; quarantine before AVAILABLE.
- Run ClamAV or a managed malware scanner in the upload worker; fail closed for unscanned files in downloads.
- Use random object keys, private bucket policy and signed GET URLs with short expiry.
- Strip EXIF metadata from image previews where practical; do not alter the original without telling the user.

## LLM risks

- Prompt injection: delimit evidence, maintain a fixed system prompt, ignore instructions in evidence, validate output and source IDs.
- Hallucination: structured provenance, claim checks, clarification/refusal behavior and human review.
- Data leakage: send only the minimum programme-scoped context; never send auth tokens, internal IDs beyond source references, other users' data or secrets.
- Provider retention/cross-border transfer: document provider terms, configure no-training/retention controls where available, and obtain legal/privacy review before production.

## OWASP mapping

| OWASP area | Implementation |
| --- | --- |
| Broken access control | Central owner-scoped services, IDOR tests, no client-trusted IDs. |
| Cryptographic failures | TLS, encrypted managed DB/storage, hashed link tokens, secret manager. |
| Injection | Zod input validation, Prisma parameters, output encoding, LLM delimiter policy. |
| Insecure design | Threat model, provenance and non-goal against fake SIWES. |
| Security misconfiguration | Minimal env, secure headers, private buckets, webhook secret. |
| Vulnerable components | Lockfile, Dependabot/npm audit, pinned runtime and review. |
| Identification failures | Auth.js, short sessions/links, Telegram uniqueness. |
| Software/data integrity | CI checks, signed deployment artifacts where supported, migration review. |
| Logging failures | Request IDs and security events without raw PII/content. |
| SSRF | No server-side arbitrary URL fetching in MVP; allow-list storage/provider hosts. |

## NDPA-aligned checklist

This is an implementation checklist, not legal advice:

- Identify controller/processor roles and lawful basis with counsel.
- Publish purpose, categories, retention, rights and processor disclosures.
- Minimize matric number, supervisor contact and employer details.
- Give consent/notice before sending data to an external LLM; provide raw-save/manual path.
- Support access/export, correction, deletion and withdrawal flows.
- Record processor/subprocessor and cross-border transfer review.
- Apply access controls, breach response, retention and deletion procedures.
- Determine whether a data protection impact assessment is appropriate for student/employer data.

## Data-handling table

| Data | Stored where | Who can see it | Retention |
| --- | --- | --- | --- |
| Account identity | PostgreSQL/Auth.js | Student, authorized support | Account lifetime + deletion workflow |
| Matric/programme details | PostgreSQL | Student; future approved supervisors | Programme lifetime + policy |
| Raw/generated/edited entries | PostgreSQL | Student; LLM only for requested operation | Programme lifetime + policy |
| Evidence files | Private object storage | Student via signed URL | Until deletion/retention expiry |
| Telegram ID/state | PostgreSQL | Adapter/core, student settings | Until unlink/account deletion |
| LLM usage totals | PostgreSQL | Operators in aggregate | Operational retention; no raw prompt |
| Audit/security events | PostgreSQL/log system | Restricted operators | Security retention policy |

## Secrets, encryption, backups and response

- Store secrets in Vercel/VPS secret manager, never Git or client bundles.
- TLS for all network calls; rely on managed encryption at rest and private networking where available.
- Daily database backups, point-in-time recovery where available, and quarterly restore drills.
- Incident steps: contain, revoke sessions/tokens, preserve relevant security metadata, assess affected records, notify according to legal advice, remediate and document.

## Privacy policy outline

1. Who operates the service and contact details.
2. What data is collected and why.
3. AI processing and provider disclosure.
4. Telegram and OAuth processing.
5. Storage, retention and deletion.
6. Security measures and limitations.
7. Student rights and complaint route.
8. International transfers/subprocessors.
9. Changes and effective date.

## Design concerns

The app may contain employer-confidential material that the student is not permitted to upload. UX warnings, minimization and a “save locally/manual” path are necessary, but they do not replace an employer confidentiality policy.

## Open questions

- Which legal entity is the data controller?
- Which processor contract and transfer mechanism will cover Anthropic, hosting, storage and email?
- What support identity-verification process is acceptable for deletion requests?

## Cross-references

See [06-ai-llm-design.md](./06-ai-llm-design.md), [07-telegram-bot-design.md](./07-telegram-bot-design.md), [15-observability-and-operations.md](./15-observability-and-operations.md), and [17-legal-and-policy-drafts.md](./17-legal-and-policy-drafts.md).
