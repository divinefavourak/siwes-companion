# 16. Analytics and product metrics

## Purpose

Measure activation, continuity and reduced logbook stress without collecting unnecessary student content.

## Decisions

- Events contain anonymous/user-scoped IDs, programme phase and safe properties, never raw note text or generated content.
- Product analytics is opt-in or privacy-reviewed; operational metrics are separate.
- A stress-reduction measure combines a short voluntary survey with behavior, not a hidden psychological inference.

## Event plan

| Event | Safe properties |
| --- | --- |
| `programme_created` | duration, timezone region, source channel |
| `entry_started` | relative day number, channel |
| `entry_raw_saved` | source, offline/online |
| `entry_generated` | model tier, latency bucket, clarification boolean |
| `entry_reviewed_saved` | edited boolean, conflict boolean |
| `week_viewed` | saved count, missing count |
| `report_started` | phase, completion percentage |
| `defense_started` | difficulty, channel |
| `defense_feedback_viewed` | turns, topics count |
| `stress_checkin_completed` | numeric response only with consent |

## Metrics

- Activation: first programme created and first reviewed entry saved within 24 hours.
- Continuity: 7-day working-day-aware streak, not a calendar streak.
- Retention: active logging in weeks 2, 4 and final month.
- Report readiness: report started/completed before final two weeks.
- Defense preparedness: question coverage and self-reported confidence, not a fabricated AI grade.

## Stress-reduction check-in

Ask optionally before and after a week: “How stressful does keeping up with your logbook feel?” with a simple 1-5 response and “prefer not to answer”. Report aggregate change only when the sample is large enough to reduce identification risk.

## Open questions

- Which analytics provider meets the privacy and budget constraints, or should first release use only internal counters?
- What minimum cohort size is required before showing aggregate survey changes?

## Cross-references

See [01-prd.md](./01-prd.md), [08-security-and-privacy.md](./08-security-and-privacy.md), and [15-observability-and-operations.md](./15-observability-and-operations.md).
