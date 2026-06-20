# Test Credentials for iTRAIN

## Test Users

### Regular user (Enterprise tier — for full feature access)
- **Email**: `test@train.com`
- **Password**: `test123456`
- **Tier**: enterprise
- **Use for**: testing all features, subscriptions, calculators, periodization

### Super Admin
- **Email**: `juegolaureado@gmail.com`
- **Password**: *(set by user — ask if needed)*
- **is_super_admin**: True
- **Tier**: enterprise
- **Use for**: testing Super Admin Panel, /admin endpoints, finance, alerts, hierarchy

## API Base URL
- Frontend `.env` → `REACT_APP_BACKEND_URL=https://coach-command-23.preview.emergentagent.com`
- All API routes prefixed with `/api`

## Hotmart Integration Status (FASE 1)
- Code is implemented and registered
- Env vars in `/app/backend/.env` are PLACEHOLDERS (empty) → endpoints return 503 until configured
- Required env vars when going live:
  - `HOTMART_HOTTOK` (webhook validation)
  - `HOTMART_CLIENT_ID`, `HOTMART_CLIENT_SECRET`, `HOTMART_BASIC_TOKEN` (HotConnect API)
  - `HOTMART_OFFER_<TIER>_<CYCLE>` (8 products: starter/basic/pro/enterprise × monthly/annual)
