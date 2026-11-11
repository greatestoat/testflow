# TestFlow

> Claude creates your tests. TestFlow manages your quality.

Test case management SaaS. Customers connect **their own Claude** through MCP; Claude generates test cases and
calls TestFlow's MCP tools; TestFlow stores, edits and tracks them. **There is no AI inside this app** — no LLM
SDKs, no AI API keys.

This repo contains the backend (`backend/`) and the Part 2 React frontend (`frontend/`).

Stack: Node 20+, Express, TypeScript, Prisma, **MongoDB (Atlas)**, Zod, JWT, bcrypt, `@modelcontextprotocol/sdk`
(Streamable HTTP), Vitest + Supertest.

---

## 1. Install on your computer

| Tool | Version | Check |
|---|---|---|
| Node.js | 20 or newer (https://nodejs.org) | `node -v` |
| Git | any | `git --version` |
| VS Code (optional) | any | |

You do **not** install MongoDB locally. Use a free MongoDB Atlas cluster (step 2). Atlas is a replica set,
which Prisma needs for transactions.

## 2. Create the database (MongoDB Atlas, free)

1. Sign up at https://www.mongodb.com/cloud/atlas and create a **free M0 cluster**.
2. **Database Access** -> *Add New Database User* -> username + password (use letters/numbers only, or URL-encode symbols).
3. **Network Access** -> *Add IP Address*. For local work choose *Add Current IP Address*.
   (For deployment you will add the host's IP or temporarily `0.0.0.0/0` - see section 8.)
4. **Database** -> *Connect* -> *Drivers* -> copy the connection string:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
5. Add a database name before the `?`, e.g. `.../testflow?retryWrites=...`. Do the same for a second DB `testflow_test` used by tests.

## 3. Configure the backend

```bash
cd backend
npm install
cp .env.example .env          # Windows: copy .env.example .env
cp .env.test.example .env.test
```

Edit `.env`:

| Variable | What to put |
|---|---|
| `DATABASE_URL` | Your Atlas string with `/testflow` database name |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `MCP_CREDENTIAL_SECRET` | Generate another one the same way (different value) |
| `FRONTEND_URL` | `http://localhost:5173` for now |
| `PORT` | `4000` |

Edit `.env.test`: same format, but `DATABASE_URL` must point to the **`testflow_test`** database.

> Never commit `.env` files. `.gitignore` already excludes them.

## 4. Create collections and run

MongoDB has no SQL migrations. Prisma's `db push` creates collections, indexes and unique constraints:

```bash
npm run db:push        # sync schema to Atlas
npm run db:generate    # generate Prisma client (also runs inside npm run build)
npm run db:seed        # optional demo account (prints a generated password)
npm run dev            # http://localhost:4000
```

Check: open http://localhost:4000/health -> `{"success":true,"data":{"status":"ok"}}`

## 5. Run the tests

```bash
npm run test
```

Tests hit the real database in `.env.test` (use unique emails, so no cleanup is needed).

## 6. Folder structure

```
testflow/
  README.md
  .gitignore
  frontend/                 (Part 2)
  backend/
    package.json  tsconfig.json  vitest.config.ts
    .env.example  .env.test.example
    prisma/
      schema.prisma         MongoDB models
      seed.ts               demo account (no hardcoded password)
    src/
      config/               env validation (zod), prisma client
      controllers/          HTTP layer
      middleware/           auth, validate, rate-limit, errors
      repositories/         all database access
      routes/               route table
      services/             business rules + workspace checks
      validators/           zod schemas
      mcp/                  MCP server (tools) + HTTP handler
      utils/                errors, http helpers, jwt
      types/                express type augmentation
      app.ts                express app factory
      server.ts             entry point
    tests/                  auth, crud, isolation tests
```

## 7. API

All responses: `{ "success": true, "data": ... }` or `{ "success": false, "error": { code, message, details? } }`.
Authenticated routes need `Authorization: Bearer <token>`.

| Area | Endpoints |
|---|---|
| Health | `GET /health`, `GET /api/health` |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Projects | `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id` |
| Suites | `GET/POST /api/suites`, `PUT/DELETE /api/suites/:id` |
| Test cases | `GET/POST /api/test-cases`, `GET/PUT/DELETE /api/test-cases/:id` |
| Execution | `POST /api/test-cases/:id/execute`, `GET /api/test-cases/:id/executions` |
| Reports | `GET /api/reports/summary`, `GET /api/reports/export` (CSV) |
| MCP credentials | `GET/POST /api/mcp-credentials`, `DELETE /api/mcp-credentials/:id` |
| MCP | `POST /mcp` (Streamable HTTP, `Authorization: Bearer tfm_...`) |

Quick try:

```bash
curl -X POST localhost:4000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Rahul","email":"rahul@example.com","password":"Password123!"}'
```

## 8. Connect Claude (MCP)

1. Log in, then `POST /api/mcp-credentials` with `{"name":"my claude"}`. The response contains `token`
   (starts with `tfm_`) - **shown once**. Only its HMAC is stored.
2. In Claude, add a custom MCP connector pointing at `https://YOUR-BACKEND/mcp` and send the token as a
   Bearer token (exact UI depends on the Claude plan/client; for Claude Code:
   `claude mcp add --transport http testflow https://YOUR-BACKEND/mcp --header "Authorization: Bearer tfm_..."`).
3. Tools exposed: `list_projects`, `create_project`, `list_suites`, `create_suite`, `list_test_cases`,
   `get_test_case`, `create_test_case`, `bulk_create_test_cases`, `update_test_case`, `record_execution`,
   `get_quality_summary`.

The workspace is derived from the token, never from tool arguments, so a credential can only touch its own workspace.
Locally, Claude cannot reach `localhost`; use a tunnel (e.g. `cloudflared`/`ngrok`) or the deployed URL.

## 9. Deploy later (Render example)

Backend (Web Service):
1. Push the repo to GitHub.
2. Render -> *New Web Service* -> pick the repo, **Root Directory** `backend`.
3. Build: `npm install && npm run build`   Start: `npm start`
4. Environment: `DATABASE_URL`, `JWT_SECRET`, `MCP_CREDENTIAL_SECRET`, `FRONTEND_URL` (your frontend's https URL), `NODE_ENV=production`.
5. Atlas **Network Access**: allow Render's outbound IPs (or `0.0.0.0/0` for a demo, with a strong DB password).
6. Run `npm run db:push` once against the production DB (Render Shell, or locally with the production `DATABASE_URL`).
7. Verify `https://YOUR-BACKEND/health`.

Railway/Fly.io/any Node host work the same way. The frontend (Part 2) will deploy to Vercel/Netlify with
`VITE_API_URL` pointing at the backend; no secrets go in frontend code.

## 10. Notes / limits

- JWT logout is client-side (stateless tokens, 7-day expiry). Membership is re-checked on every request.
- MongoDB has no real foreign keys; relations, cascades and `workspaceId` scoping are enforced by Prisma + the service layer, and covered by isolation tests.
- Test pass rate = share of executed test cases whose **latest** result is PASSED (null until something runs).

## 11. Run the frontend

In a second terminal, from `frontend/`:

```bash
npm install
copy .env.example .env.local     # Windows PowerShell
npm run dev                      # http://localhost:5173
```

The frontend uses `VITE_API_URL` to reach the backend (default `http://localhost:4000`). Set it to your deployed API origin for a hosted frontend. Overview and Reports read live summary data; the backend does not expose a day-by-day execution history endpoint.

Build the frontend with `npm run build` from `frontend/`.

## 12. Frontend files, pages, and current features

The frontend source is under `frontend/src/`. In VS Code, expand the `frontend` folder, then `src`; `App.tsx` contains the page components and route tree, `api.ts` calls the existing backend, and `styles.css` contains the visual styles. The root `frontend/` files configure the Vite, React, TypeScript, Tailwind, and PostCSS toolchain.

```text
frontend/
  .env.example          Local API origin (`VITE_API_URL`)
  index.html            Browser document and app mount element
  package.json          Frontend scripts and dependencies
  package-lock.json     Locked frontend dependency versions
  vite.config.ts        Vite development and build configuration
  tsconfig.json         TypeScript compiler settings
  tailwind.config.js    Tailwind content paths and theme
  postcss.config.js     Tailwind and Autoprefixer integration
  src/
    main.tsx            React entry point, router, and TanStack Query provider
    App.tsx             Authentication, protected routes, sidebar, and page UI
    api.ts              JWT-aware REST client and backend data types
    styles.css          Responsive dark theme and component styling
    vite-env.d.ts       Vite environment variable types
```

Current app routes:

| Route | Page | Current behavior |
|---|---|---|
| `/` | Landing | Entry page with sign-in and registration links |
| `/login` | Login | Authenticates against `POST /api/auth/login` |
| `/register` | Registration | Creates an account and workspace through `POST /api/auth/register` |
| `/app` | Overview | Live project, suite, case, execution, and pass-rate metrics; recent cases; quick links |
| `/app/projects` | Projects | Loads, searches, creates, and deletes projects |
| `/app/cases` | Test cases | Loads, searches, creates, and deletes cases |
| `/app/reports` | Reports | Live summary, latest outcomes, priority totals, and CSV export |
| `/app/settings/mcp` | Claude MCP | Shows workspace MCP endpoint and existing credentials |

The protected sidebar uses route-aware active states, collapses behind a menu on small screens, and clears cached workspace queries on logout. Project creation can be opened directly from Overview. Data requests use the API origin from `VITE_API_URL`; the backend must be running and its `FRONTEND_URL` must allow the frontend origin (`http://localhost:5173` locally).

To run it in development, open two terminals:

```powershell
# Terminal 1: backend
cd backend
npm run dev

# Terminal 2: frontend
cd frontend
npm install
npm run dev
```

The frontend expects the backend and MongoDB Atlas configuration described above. `npm run build` in `frontend/` runs TypeScript compilation and creates the production bundle in `frontend/dist/`. The current frontend pages do not yet expose every backend capability: project/case editing, test execution history, suite management, and MCP credential creation/revocation remain follow-up UI work; the REST backend already provides those endpoints.

### Frontend improvements completed (2026-11-11)

- Reworked the signed-in sidebar with Lucide icons, active route highlighting, workspace identity, and a mobile drawer/overlay.
- Made the breadcrumb follow the current page and clear cached workspace data on logout.
- Improved Overview with live summary cards, latest result distribution, recent cases, and direct project/case/MCP actions.
- Connected project creation and deletion, case creation and deletion, report metrics, and CSV download to existing REST endpoints.
- Added visible API loading/error states and responsive layouts for the dashboard and data tables.
- Removed duplicate Tailwind directives and fixed source text encoding artifacts.
- Verified with `npm run build` in `frontend/` (TypeScript compile and Vite production build).

The REST backend has additional features that are not yet exposed in these frontend pages. Track project/case editing, execution recording/history, suite CRUD, and MCP credential creation/revocation as the next frontend work; the current README route table reflects the existing UI scope.
