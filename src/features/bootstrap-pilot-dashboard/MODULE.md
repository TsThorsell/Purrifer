# Bootstrap Pilot Dashboard

## Syfte
Visar pilotkvalitet och throughput for bootstrap-migrering med KPI:er som ready-rate, review-rate, rejection reasons och confidence-distribution.

## Agarskap
- Slice-id: `bootstrap-pilot-dashboard`
- Owned areas: `bootstrap-pilot-dashboard`, `migration-kpi`

## Scope i denna modul
- Lasa stage/review/commit/preprocess-data och berakna KPI:er.
- Exponera dashboard-data over IPC till renderer.
- Enkel UI for operatorbeslut per batch/kalla.

