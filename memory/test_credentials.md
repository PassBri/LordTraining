# Test Credentials — LordTraining

## Super Admin (seeded via env SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD)
- email: juegolaureado@gmail.com
- password (preview): LordTraining2026!
- role: admin / is_super_admin: true / subscription: enterprise
- NOTE: Password is deterministically set on startup to the value of
  SUPER_ADMIN_PASSWORD env var (seed_super_admin in server.py).
  In PRODUCTION the user sets their own SUPER_ADMIN_PASSWORD in Secrets.

## Standard test user
- email: test@train.com
- password: test123456

## Athlete Portal (Fase 3) — test accounts
- Athlete (invited): juan.atleta@test.com / 8c6nkWqG  (assigned_plan_id 25b9abc7..., may have must_change_password)
- Athlete (self-registered): maria@test.com / maria123
- Public read-only portal example: /atleta/ATP-dae6712f00504806  (plan 25b9abc7, "Juan Pérez")
- Athlete login route: /atleta/login   | Athlete panel: /atleta/panel
- Coach generates share/account from Dashboard → Datos → (select plan) → "Plan Activo" sub-tab → "Atleta" button.
- NOTE: run "Sembrar datos de ejemplo" (Super Admin → Datos de Ejemplo) so plans have session dates before testing the portal calendar.

## Admin User Management (Super Admin → pestaña "Gestión de Usuarios")
- Endpoints: GET/POST /api/admin/users, PUT /api/admin/users/{id},
  POST /api/admin/users/{id}/reset-password, PATCH /api/admin/users/{id}/status, DELETE /api/admin/users/{id}
- Solo accesible para is_super_admin. Login rechaza cuentas con active:false (403).

## Environments
- Preview: https://lord-deploy-test.preview.emergentagent.com
- Production: https://lordtraining.com  (separate database)
- All API routes prefixed with /api
