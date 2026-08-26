# Children's Care Management & Accountability Platform

A production-grade multi-tenant SaaS platform for managing children's care centres, resources, and accountability.

## Tech Stack

- **Framework:** Next.js 15 (App Router) with TypeScript
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth
- **File Storage:** Supabase Storage
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18.17 or later
- [npm](https://www.npmjs.com/)
- A [Supabase](https://supabase.com/) project (local or cloud)

### 1. Clone the repository

```bash
git clone <repository-url>
cd orphanage
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your Supabase credentials:

- **Local development:** Run `supabase start` and use the printed keys
- **Cloud:** Use keys from Supabase Dashboard → Project Settings → API

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Start the development server         |
| `npm run build`      | Build for production                 |
| `npm run start`      | Start the production server          |
| `npm run lint`       | Run ESLint                           |
| `npm run typecheck`  | Run TypeScript type checking         |
| `npm run test`       | Run tests with Vitest                |
| `npm run test:watch` | Run tests in watch mode              |
| `npm run format`     | Format code with Prettier            |
| `npm run format:check` | Check code formatting              |

## Environment Variables

| Variable                     | Description                              | Required |
| ---------------------------- | ---------------------------------------- | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`   | Supabase project URL                     | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public API key     | Yes      |
| `SUPABASE_SERVICE_ROLE_KEY`  | Supabase service role key (server only)  | Yes      |
| `NEXT_PUBLIC_APP_NAME`       | Application display name                 | No       |
| `NEXT_PUBLIC_APP_URL`        | Application base URL                     | No       |

> **Security:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put secrets in `NEXT_PUBLIC_*` variables.

## Architecture

### Multi-Tenant Isolation

Every user belongs to exactly one centre. Tenant isolation is enforced at two layers:

1. **Database (RLS):** PostgreSQL Row-Level Security policies ensure queries can only access rows belonging to the authenticated user's centre.
2. **Application:** `getAppUserContext()` derives the user's centre_id from the `user_profiles` table (never from client input). All API routes call this before any data access.

```
Auth Session → user_profiles table → centre_id → RLS policies enforce isolation
```

### Roles & Permissions

Every centre user has exactly one operational role. Access to data and actions is controlled by granular permissions assigned to roles.

**Official Centre Roles:**
| Role | Purpose |
|------|---------|
| `CENTRE_MANAGER` | Management access — children, staff, finance view/approve, reports |
| `SOCIAL_WORKER` | Case management, referrals, safeguarding, child welfare |
| `CAREGIVER` | Daily care, assigned children, check-in/check-out, activities |
| `RECORDS_OFFICER` | Child records, documents, data quality, imports/exports |
| `ACCOUNTANT_BURSAR` | Finance, donations, budget, expenses, procurement, financial reports |

**Permission model:** `module.action` (e.g. `children.view`, `finance.approve`)

**Authorization rules:**
- Deny by default — ungranted permissions are denied
- Server-side enforcement — no client-side-only checks
- Permission + centre context — both must be satisfied
- Roles cannot be self-assigned — admin-only operation

**Usage in API routes:**
```typescript
const ctx = await requireAppAccess(supabase);
await requirePermission(supabase, ctx, "children.view");
// — or —
const allowed = await can(supabase, ctx, "children.view");
```

### Audit Trail

Every meaningful business and security event is recorded in an append-only `audit_logs` table. This provides a tamper-evident record for accountability and compliance.

**Principles:**
- **Centre-scoped** — every record has `centre_id` for tenant isolation
- **Actor-identified** — `actor_user_id` derived server-side from the authenticated session, never from client input
- **Append-only** — normal users cannot update or delete audit records
- **Sensitive data stripped** — passwords, tokens, keys are automatically redacted from `previous_values` / `new_values`

**Action vocabulary:**
| Category | Actions |
|----------|---------|
| Business | `CREATE`, `UPDATE`, `DELETE`, `VIEW`, `EXPORT`, `DOWNLOAD`, `APPROVE`, `REJECT` |
| Security | `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `ACCOUNT_DEACTIVATED`, `ACCOUNT_ACTIVATED`, `ROLE_CHANGED` |

**Usage in API routes:**
```typescript
// With authenticated context (centre_id derived automatically)
const ctx = await requireAppAccess(supabase);
await recordAuditEvent(adminSupabase, ctx, {
  action: "CREATE",
  entity_type: "child",
  entity_id: child.id,
  new_values: { first_name: "Amina" },
});

// Security event without full context (centre_id passed explicitly)
await recordAuditEvent(adminSupabase, null, {
  action: "LOGIN_FAILED",
  entity_type: "session",
  centre_id: centreId,
  actor_user_id: userId,
  metadata: { reason: "Invalid credentials" },
});

// Convenience helpers
await auditCreate(adminSupabase, ctx, "child", child.id, childData);
await auditUpdate(adminSupabase, ctx, "child", child.id, oldData, newData);
await auditDelete(adminSupabase, ctx, "child", child.id, childData);
await auditSecurityEvent(adminSupabase, null, "LOGIN_FAILED", "session", { centre_id, actor_user_id });
```

### Key Files

| Module | Purpose |
|--------|---------|
| `src/lib/auth/app-user-context.ts` | `getAppUserContext()` — derives user + centre from DB |
| `src/lib/auth/authorization.service.ts` | `can()`, `requirePermission()` — server-side permission checks |
| `src/lib/audit/audit.service.ts` | `recordAuditEvent()`, convenience helpers — append-only audit logging |
| `src/lib/children/child.service.ts` | Child CRUD, search, status history — centre-scoped |
| `src/lib/children/child.validation.ts` | Zod schemas for child create/update/status/search |
| `src/lib/centres/tenant.ts` | `validateTenantAccess()` — guards cross-tenant access |
| `src/lib/users/user-profile.service.ts` | User profile CRUD |
| `src/types/child.ts` | Child types, status model, display helpers |
| `src/types/audit.ts` | Audit action vocabulary, types, `sanitizeForAudit()` |
| `src/types/role.ts` | Role, permission types + `ROLE_PERMISSIONS` defaults |
| `supabase/migrations/20260825*.sql` | Centres table + RLS |
| `supabase/migrations/20260826*.sql` | User profiles table + RLS |
| `supabase/migrations/20260827000000*.sql` | Roles, permissions, user_roles, role_history + seeds |
| `supabase/migrations/20260827000001*.sql` | Audit logs table + append-only RLS |
| `supabase/migrations/20260828000000*.sql` | Children table, status history, reference generation + RLS |

### Child Management

The central child record module. Every child belongs to exactly one centre and is identified by a unique, system-generated reference number.

**Child Status Model:**
| Status | Description |
|--------|-------------|
| `active` | Currently in care |
| `transferred` | Moved to another centre or facility |
| `graduated` | Completed the programme |
| `alumni` | Former child, historical record |
| `deactivated` | Soft-deactivated, no longer operationally active |

**Key properties:**
- **Centre-scoped** — every child belongs to exactly one centre via `centre_id`
- **Unique reference** — system-generated, format `{CENTRE_CODE}-{000001}`, never reused
- **Immutable reference** — does not change when child information is updated
- **Append-only status history** — every status change is recorded with timestamp, actor, and reason
- **Soft lifecycle** — children are never physically deleted
- **RLS enforced** — database-level tenant isolation, no cross-centre access possible

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Dashboard layout and pages
│   │   ├── centres/          # Centre management pages
│   │   │   ├── [id]/         # Centre detail page
│   │   │   ├── new/          # Create centre page
│   │   │   └── page.tsx      # Centres list page
│   │   ├── children/         # Child management pages
│   │   │   ├── [id]/         # Child profile + edit
│   │   │   ├── new/          # Create child page
│   │   │   └── page.tsx      # Children list page
│   │   └── layout.tsx        # Dashboard layout
│   ├── api/centres/          # Centre API routes
│   │   ├── [id]/route.ts     # GET/PATCH/DELETE single centre
│   │   └── route.ts          # GET list / POST create
│   ├── api/children/         # Children API routes
│   │   ├── [id]/route.ts     # GET/PATCH/DELETE single child
│   │   └── route.ts          # GET list / POST create
│   └── layout.tsx            # Root layout
├── config/
│   └── env.ts                # Environment variable validation
├── lib/
│   ├── auth/
│   │   ├── app-user-context.ts     # Server-side user + centre context
│   │   └── authorization.service.ts # can(), requirePermission(), assignRole()
│   ├── audit/
│   │   └── audit.service.ts         # recordAuditEvent(), audit helpers
│   ├── children/
│   │   ├── child.service.ts        # Child CRUD, search, status history
│   │   └── child.validation.ts     # Zod schemas for child operations
│   ├── centres/
│   │   ├── centre.service.ts   # Centre CRUD operations
│   │   ├── centre.validation.ts # Zod validation schemas
│   │   └── tenant.ts           # Tenant isolation helpers
│   ├── users/
│   │   ├── user-profile.service.ts # User profile CRUD
│   │   └── user-profile.validation.ts # Zod schemas
│   └── supabase/
│       ├── admin.ts          # Service-role client (server only)
│       ├── client.ts         # Browser client
│       ├── middleware.ts     # Session refresh helper
│       └── server.ts         # Server-side client
├── types/
│   ├── audit.ts              # Audit actions, types, sanitizeForAudit()
│   ├── centre.ts             # Centre types and interfaces
│   ├── child.ts              # Child types, status model, display helpers
│   ├── database.ts           # Supabase database types
│   ├── role.ts               # Roles, permissions, authorization types
│   └── user-profile.ts       # User profile types
└── middleware.ts              # Next.js middleware
supabase/
└── migrations/
    ├── 20260825000000_create_centres_table.sql
    ├── 20260826000000_create_user_profiles_table.sql
    ├── 20260827000000_create_roles_permissions.sql
    ├── 20260827000001_create_audit_log.sql
    └── 20260828000000_create_children_table.sql
tests/
├── audit/
│   ├── audit.test.ts               # 28 tests: action vocabulary, sanitization, security
│   └── audit-migration.test.ts     # 29 tests: migration SQL validation
├── auth/
│   ├── authorization.test.ts          # 47 tests: roles, permissions, tenant isolation
│   └── authorization-migration.test.ts # 31 tests: migration SQL validation
├── centres/
│   ├── centre.service.test.ts
│   ├── centre.validation.test.ts
│   ├── migration.test.ts
│   └── tenant.test.ts
├── children/
│   ├── child-migration.test.ts       # 52 tests: migration SQL validation
│   ├── child.service.test.ts         # 29 tests: CRUD, search, status history
│   ├── child.validation.test.ts      # 35 tests: Zod schema validation
│   └── child-security.test.ts        # 38 tests: permissions, tenant isolation
└── users/
    ├── app-user-context.test.ts
    ├── user-profile.migration.test.ts
    ├── user-profile.service.test.ts
    └── user-profile.validation.test.ts
```

## Deployment

### Vercel

1. Push to GitHub
2. Import the repository on [vercel.com](https://vercel.com)
3. Set environment variables in the Vercel dashboard
4. Deploy

Vercel auto-detects Next.js projects. No additional configuration is needed.

### Environment-Specific Configuration

| Environment   | `NEXT_PUBLIC_SUPABASE_URL`          | Notes                |
| ------------- | ------------------------------------ | -------------------- |
| Local         | `http://localhost:54321`            | Supabase local CLI   |
| Preview       | Supabase cloud preview project URL   | Per-PR preview env   |
| Production    | Supabase cloud production project URL| Live environment     |

## License

Proprietary — All rights reserved.
