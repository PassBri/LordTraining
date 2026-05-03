# Test Credentials

## Main Test Account
- Email: test@train.com
- Password: test123456
- Subscription: **enterprise** (Institucional) — owner of demo organization "iTRAIN Club Demo"
- org_role: admin

## Demo Coach (invited)
- Email: coach1@itrain.com
- Password: temporal generada al invitar (regenerable desde /org/team)
- org_role: coach (Preparador Físico)

## Notes
- This account has 6+ training plans including "TEST Plan Futbol ATR" for existing V1 system
- V2 Seed: "ATR Futbol Pre-temporada" (plan_id varies per seed run) with demo athlete
- V2 API endpoints require Bearer token from /api/auth/login
- The test user is set to `enterprise` plan + org admin so the testing agent can validate `/org/team`, `usePlanGate('org_management')`, and the new `Equipo` FAB in dashboard.

