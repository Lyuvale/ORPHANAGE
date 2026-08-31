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
| `CENTRE_MANAGER` | Management access — children, staff, finance view/approve, reports, referrals, admissions, placements, guardians |
| `SOCIAL_WORKER` | Case management, referrals, admissions, placements, safeguarding, child welfare, family/guardian management |
| `CAREGIVER` | Daily care, assigned children, check-in/check-out, activities, placement viewing, guardian viewing |
| `RECORDS_OFFICER` | Child records, documents, data quality, imports/exports, admissions, placements, guardian records |
| `ACCOUNTANT_BURSAR` | Finance, donations, budget, expenses, procurement, financial reports, minimal guardian viewing |

**Permission model:** `module.action` (e.g. `children.view`, `finance.approve`, `referrals.review`, `placements.create`, `guardians.relationship.manage`)

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
| `src/lib/referrals/referral.service.ts` | Referral CRUD, search, status transitions |
| `src/lib/referrals/referral.validation.ts` | Zod schemas for referral operations |
| `src/lib/admissions/admission.service.ts` | Admission CRUD, search, status history |
| `src/lib/admissions/admission.validation.ts` | Zod schemas for admission operations |
| `src/lib/placements/placement.service.ts` | Placement CRUD, search, status transitions |
| `src/lib/placements/placement.validation.ts` | Zod schemas for placement operations |
| `src/lib/guardians/guardian.service.ts` | Guardian CRUD, relationships, duplicate detection |
| `src/lib/guardians/guardian.validation.ts` | Zod schemas for guardian/relationship operations |
| `src/lib/cases/case.service.ts` | Case CRUD, assessments, plans, notes, interventions |
| `src/lib/cases/case.validation.ts` | Zod schemas for case/assessment/plan/note operations |
| `src/lib/safeguarding/safeguarding.service.ts` | Safeguarding concerns, actions, escalations |
| `src/lib/safeguarding/safeguarding.validation.ts` | Zod schemas for safeguarding operations |
| `src/lib/visits/visit.service.ts` | Visit CRUD, status, check-in/out, restrictions, contact attempts |
| `src/lib/visits/visit.validation.ts` | Zod schemas for visit operations |
| `src/lib/daily-care/presence.service.ts` | Presence CRUD, check-in/out, off-site, daily summary |
| `src/lib/daily-care/daily-care.service.ts` | Care records, meals, append-only notes, follow-ups |
| `src/lib/daily-care/daily-care.validation.ts` | Zod schemas for presence + daily care operations |
| `src/lib/centres/tenant.ts` | `validateTenantAccess()` — guards cross-tenant access |
| `src/lib/users/user-profile.service.ts` | User profile CRUD |
| `src/types/child.ts` | Child types, status model, display helpers |
| `src/types/referral.ts` | Referral types, status/source/priority models, display helpers |
| `src/types/admission.ts` | Admission types, status model, display helpers |
| `src/types/placement.ts` | Placement types, status/type models, display helpers |
| `src/types/guardian.ts` | Guardian, relationship, document types, display helpers |
| `src/types/case.ts` | Case, assessment, plan, note, intervention types |
| `src/types/safeguarding.ts` | Concern, action, escalation, document types |
| `src/types/visit.ts` | Visit, restriction, contact attempt types, transitions, display helpers |
| `src/types/presence.ts` | Presence types, status/reason models, display helpers |
| `src/types/daily-care.ts` | Daily care, meal, note, follow-up types, display helpers |
| `src/types/audit.ts` | Audit action vocabulary, types, `sanitizeForAudit()` |
| `src/types/role.ts` | Role, permission types + `ROLE_PERMISSIONS` defaults |
| `supabase/migrations/20260825*.sql` | Centres table + RLS |
| `supabase/migrations/20260826*.sql` | User profiles table + RLS |
| `supabase/migrations/20260827000000*.sql` | Roles, permissions, user_roles, role_history + seeds |
| `supabase/migrations/20260827000001*.sql` | Audit logs table + append-only RLS |
| `supabase/migrations/20260828000000*.sql` | Children table, status history, reference generation + RLS |
| `supabase/migrations/20260829000000*.sql` | Referrals, admissions, placements, admission history + RLS + permissions |
| `supabase/migrations/20260902000000*.sql` | Daily care, meals, notes, follow-ups, presence + RLS + permissions |

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

### Referral, Admission & Placement

The child lifecycle workflow module. Tracks a child's journey from external referral through admission review to active placement.

**Lifecycle:** Referral (submitted) → Admitted → Placement (assigned)

**Referral Status Model:**
| Status | Description |
|--------|-------------|
| `submitted` | Just received, awaiting review |
| `under_review` | Being evaluated by staff |
| `admitted` | Approved for admission |
| `rejected` | Declined after review |
| `withdrawn` | Withdrawn by referrer |

**Referral Sources:** Police, Court, Hospital, School, Community, Government, Self Referral, Other

**Admission Status Model:**
| Status | Description |
|--------|-------------|
| `pending` | Awaiting review |
| `approved` | Accepted, ready for placement |
| `denied` | Declined |
| `cancelled` | Withdrawn before decision |

**Placement Status Model:**
| Status | Description |
|--------|-------------|
| `active` | Currently placed |
| `completed` | Placement ended normally |
| `transferred` | Moved to another centre/facility |
| `discharged` | Left care |

**Placement Types:** Residential, Foster Care, Adoption, Transitional, Temporary

**Key properties:**
- **Centre-scoped** — every record has `centre_id` for tenant isolation
- **Unique references** — system-generated for each module, never reused
- **Append-only history** — admission status changes recorded
- **No physical deletes** — soft-delete via status transitions
- **RLS enforced** — database-level tenant isolation
- **Audit logged** — all creates, updates, and status changes recorded in audit_logs
- **Permission-controlled** — granular permissions per module (view, create, review, approve, reject)

**Permissions:**
| Module | Permissions |
|--------|------------|
| Referrals | `view`, `create`, `update`, `review`, `approve`, `reject` |
| Admissions | `view`, `create`, `review` |
| Placements | `view`, `create`, `update` |

### Family & Guardian Management

Records and manages people and family relationships connected to a child, preserving privacy, history, and tenant isolation.

**Guardian Status Model:**
| Status | Description |
|--------|-------------|
| `active` | Currently a known guardian |
| `inactive` | Relationship paused or ended |
| `deceased` | Guardian has passed away |
| `unknown` | Status not determined |

**Relationship Types:** Mother, Father, Grandparent, Sibling, Aunt, Uncle, Legal Guardian, Foster/Responsible Caregiver, Other Relative, Other Authorised Person

**Legal Authority Types:** Parent, Legal Guardian, Court-Authorised, Other Authorised, None

**Key properties:**
- **Guardian entity** — reusable record, not duplicated per child
- **Many-to-many** — one guardian can be linked to multiple children, one child can have multiple guardians
- **Primary guardian** — one active primary per child enforced via unique partial index
- **Relationship history** — relationships are never overwritten; end_date + is_active track lifecycle
- **Contact permissions** — per-relationship flags for contact, visits, meetings, updates, information
- **Restrictions** — contact_restricted, visits_restricted with notes
- **Legal authority** — parent, legal_guardian, court_authorised, other_authorised, none
- **Duplicate detection** — name + phone/email fuzzy matching before create
- **Centre-scoped** — every guardian and relationship belongs to exactly one centre
- **RLS enforced** — database-level tenant isolation
- **Audit logged** — all creates, updates, relationship changes recorded

**Permissions:**
| Module | Permissions |
|--------|------------|
| Guardians | `view`, `create`, `update`, `deactivate`, `relationship.manage`, `documents.view`, `documents.upload`, `documents.download` |

### Visits & Family Contact Management

Manages authorised contact between children and their parents, guardians, relatives or other approved persons. Respects safeguarding restrictions — a guardian being linked to a child does NOT automatically give unrestricted visitation rights.

**Visit Status Model:**
| Status | Description |
|--------|-------------|
| `requested` | Visit request submitted |
| `pending_approval` | Awaiting approval decision |
| `approved` | Approved, ready to schedule/check-in |
| `scheduled` | Confirmed for a specific time |
| `checked_in` | Visitor has arrived and checked in |
| `completed` | Visit finished |
| `cancelled` | Cancelled by authorised user |
| `rejected` | Visit request rejected |
| `no_show` | Approved visitor did not attend |

**Visit Types:** In Person, Phone, Video, Off Site, Other Approved (extensible for future types)

**Visit Outcomes:** Positive, Neutral, Negative, Concern Noted, Incident Reported, Pending Review, None

**Restriction Types:** No Visits, Supervised Only, Limited Frequency, Limited Duration, Phone Only, Temporary Ban, Other

**Key properties:**
- **Visit reference** — system-generated, format `{CENTRE_CODE}-VISIT-{00001}`, never reused
- **Status transitions** — validated, recorded in append-only `visit_status_history`
- **Approval workflow** — request → approve/reject with recorded decision
- **Safeguarding check** — active restrictions prevent normal approval
- **Check-in/check-out** — server-controlled timestamps, staff-recorded
- **Supervised visits** — supervisor assignment with supervision notes
- **Visit outcome** — child/family response, follow-up tracking
- **Contact attempts** — separate structure for unsuccessful contact tracking
- **Visit restrictions** — per child/guardian, type-based with start/end dates
- **Centre-scoped** — every record belongs to exactly one centre
- **RLS enforced** — database-level tenant isolation
- **Audit logged** — all creates, status changes, check-in/out recorded

**Permissions:**
| Module | Permissions |
|--------|------------|
| Visits | `view`, `create`, `update`, `request`, `approve`, `reject`, `checkin`, `checkout`, `complete`, `cancel`, `restrictions.view`, `restrictions.manage`, `contact_attempts.view`, `contact_attempts.create` |

**Role Access:**
| Role | Access |
|------|--------|
| CENTRE_MANAGER | Full access |
| SOCIAL_WORKER | Full access |
| CAREGIVER | View, check-in, check-out only |
| RECORDS_OFFICER | View, restrictions.view, contact_attempts.view |
| ACCOUNTANT_BURSAR | No access |

### Daily Care Management

Tracks daily care activities, meals, notes, and follow-ups for each child. Notes are append-only — amendments create new versions while preserving the original.

**Care Activity Types:** meal, hygiene, clothing, sleep, recreation, special_support, general_wellbeing, other

**Meal Types:** breakfast, lunch, dinner, snack

**Daily Note Types:** general, observation, incident, concern, follow_up, other

**Follow-Up Statuses:** open, in_progress, completed, cancelled

**Key properties:**
- **Centre-scoped** — every record belongs to exactly one centre
- **Append-only notes** — amendments create new note versions with version number and reason
- **Care follow-ups** — can be linked to source notes or care records
- **Staff attribution** — all records tracked to the staff member who created them

**Permissions:**
| Module | Permissions |
|--------|------------|
| daily_care | view, create, update, check_in, check_out, notes.create, notes.amend, meals.create, followups.create, followups.update |

### Child Presence Management

Manages child attendance and on-site/off-site tracking. Provides daily presence summaries showing which children are present, absent, off-site, on leave, or not yet recorded.

**Presence Statuses:** present, absent, on_leave, off_site, transferred, other_approved

**Absence Reasons:** illness, family_leave, unknown, external_programme, approved_absence, other

**Key properties:**
- **Centre-scoped** — every record belongs to exactly one centre
- **Daily uniqueness** — one presence record per child per date
- **Server-controlled timestamps** — check-in/check-out times are server-set
- **Off-site tracking** — records destination, expected return, and authorisation
- **Daily summary** — compares presence records against all active children to find unrecorded

**Permissions:**
| Module | Permissions |
|--------|------------|
| presence | view, create, update, check_in, check_out, off_site, daily_summary |

**Role Access:**
| Role | Access |
|------|--------|
| CENTRE_MANAGER | Full access |
| SOCIAL_WORKER | Full access |
| CAREGIVER | View, create, check-in, check-out, meals.create, notes.create |
| RECORDS_OFFICER | View only |
| ACCOUNTANT_BURSAR | No access |

### Case Management & Safeguarding

Manages child welfare cases, assessments, care plans, and safeguarding concerns. This is the most sensitive module, requiring explicit case/safeguarding permissions — `children.view` does NOT automatically grant access.

**Case Status Model:**
| Status | Description |
|--------|-------------|
| `open` | Case created, not yet assessed |
| `under_assessment` | Being evaluated |
| `active_plan` | Care plan in progress |
| `on_hold` | Temporarily paused |
| `resolved` | Case resolved |
| `closed` | Case permanently closed |

**Case Types:** Protection, Family Reunification, Behavioural, Education, Health, Placement, Legal, Psychosocial, Other

**Case Classifications:** Standard, Confidential, Highly Confidential

**Key properties:**
- **Case reference** — system-generated, format `{CENTRE_CODE}-CASE-{00001}`, never reused
- **Status transitions** — validated, recorded in append-only `case_status_history`
- **Data classification** — STANDARD / CONFIDENTIAL / HIGHLY_CONFIDENTIAL
- **Case notes** — immutable after creation (append-only), versioned, threaded via `parent_note_id`
- **Assessments** — initial, periodic, specialized with findings and recommendations
- **Case plans** — objectives with responsible persons, target dates, status tracking
- **Interventions** — linked to cases and optionally to plan items
- **Centre-scoped** — every record belongs to exactly one centre
- **RLS enforced** — database-level tenant isolation
- **Audit logged** — all creates, updates, status changes recorded

**Safeguarding Concern Status Model:**
| Status | Description |
|--------|-------------|
| `reported` | Initial report received |
| `initial_review` | Under initial review |
| `action_required` | Requires immediate action |
| `under_investigation` | Formal investigation underway |
| `resolved` | Concern resolved |
| `closed` | Permanently closed |

**Safeguarding Concern Types:** Abuse, Neglect, Exploitation, Violence, Missing Child, Self-Harm, Unsafe Environment, Trafficking, Other

**Safeguarding Severity Levels:** Low, Medium, High, Critical

**Key properties:**
- **Strict access** — requires `safeguarding.*` permissions, NOT just `children.view`
- **External referrals** — track external agency involvement
- **Escalation workflow** — escalate concerns with status tracking (pending → acknowledged → in_progress → completed)
- **Actions** — track specific actions taken in response to concerns
- **Status history** — append-only safeguarding status changes

**Permissions:**
| Module | Permissions |
|--------|------------|
| Cases | `view`, `create`, `update`, `status.update`, `close`, `assessments.view`, `assessments.create`, `assessments.update`, `plans.view`, `plans.create`, `plans.update`, `plans.approve`, `notes.view`, `notes.create`, `interventions.view`, `interventions.create`, `interventions.update`, `documents.view`, `documents.upload`, `documents.download`, `documents.delete` |
| Safeguarding | `view`, `create`, `update`, `status.update`, `escalate`, `actions.view`, `actions.create`, `actions.update`, `documents.view`, `documents.upload`, `documents.download`, `documents.delete`, `escalations.view`, `escalations.acknowledge`, `escalations.resolve` |

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Dashboard layout and pages
│   │   ├── admissions/       # Admission management pages
│   │   │   ├── [id]/         # Admission detail page
│   │   │   ├── new/          # Create admission page
│   │   │   └── page.tsx      # Admissions list page
│   │   ├── cases/            # Case management pages
│   │   │   └── page.tsx      # Cases list page
│   │   ├── centres/          # Centre management pages
│   │   │   ├── [id]/         # Centre detail page
│   │   │   ├── new/          # Create centre page
│   │   │   └── page.tsx      # Centres list page
│   │   ├── children/         # Child management pages
│   │   │   ├── [id]/         # Child profile + edit
│   │   │   ├── new/          # Create child page
│   │   │   └── page.tsx      # Children list page
│   │   ├── guardians/        # Guardian management pages
│   │   │   ├── [id]/         # Guardian profile page
│   │   │   ├── new/          # Create guardian page
│   │   │   └── page.tsx      # Guardians list page
│   │   ├── placements/       # Placement management pages
│   │   │   ├── [id]/         # Placement detail page
│   │   │   ├── new/          # Create placement page
│   │   │   └── page.tsx      # Placements list page
│   │   ├── referrals/        # Referral management pages
│   │   │   ├── [id]/         # Referral detail page
│   │   │   ├── new/          # Create referral page
│   │   │   └── page.tsx      # Referrals list page
│   │   ├── safeguarding/     # Safeguarding management pages
│   │   │   └── page.tsx      # Safeguarding list page
│   │   ├── visits/           # Visit management pages
│   │   │   └── page.tsx      # Visits list page
│   │   └── layout.tsx        # Dashboard layout
│   ├── api/admissions/       # Admission API routes
│   │   ├── [id]/route.ts     # GET/PATCH single admission
│   │   └── route.ts          # GET list / POST create
│   ├── api/cases/            # Case management API routes
│   │   ├── [id]/
│   │   │   ├── assessments/  # Case assessments
│   │   │   ├── interventions/ # Case interventions
│   │   │   ├── notes/        # Case notes
│   │   │   ├── plans/        # Case plans
│   │   │   ├── status/       # Case status updates
│   │   │   └── route.ts      # GET/PATCH single case
│   │   └── route.ts          # GET list / POST create
│   ├── api/centres/          # Centre API routes
│   │   ├── [id]/route.ts     # GET/PATCH/DELETE single centre
│   │   └── route.ts          # GET list / POST create
│   ├── api/children/         # Children API routes
│   │   ├── [id]/route.ts     # GET/PATCH/DELETE single child
│   │   └── route.ts          # GET list / POST create
│   ├── api/guardians/        # Guardian API routes
│   │   ├── [id]/route.ts     # GET/PATCH single guardian
│   │   ├── relationships/    # Relationship management
│   │   │   ├── [id]/route.ts # GET/PATCH/END single relationship
│   │   │   └── route.ts      # GET list / POST create relationship
│   │   └── route.ts          # GET list / POST create guardian
│   ├── api/placements/       # Placement API routes
│   │   ├── [id]/route.ts     # GET/PATCH single placement
│   │   └── route.ts          # GET list / POST create
│   ├── api/referrals/        # Referral API routes
│   │   ├── [id]/route.ts     # GET/PATCH single referral
│   │   └── route.ts          # GET list / POST create
│   ├── api/safeguarding/     # Safeguarding API routes
│   │   ├── [id]/
│   │   │   ├── actions/      # Safeguarding actions
│   │   │   ├── escalations/  # Safeguarding escalations
│   │   │   ├── status/       # Safeguarding status updates
│   │   │   └── route.ts      # GET/PATCH single concern
│   │   └── route.ts          # GET list / POST create
│   ├── api/visits/           # Visits & Family Contact API routes
│   │   ├── [id]/
│   │   │   ├── check/        # Check-in / Check-out / Complete
│   │   │   ├── status/       # Visit status updates
│   │   │   └── route.ts      # GET/PATCH single visit
│   │   ├── contact-attempts/ # Contact attempt records
│   │   │   └── route.ts      # GET list / POST create
│   │   ├── restrictions/     # Visit restriction management
│   │   │   └── route.ts      # GET list / POST create
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
│   ├── guardians/
│   │   ├── guardian.service.ts      # Guardian CRUD, relationships, duplicate detection
│   │   └── guardian.validation.ts   # Zod schemas for guardian/relationship operations
│   ├── referrals/
│   │   ├── referral.service.ts     # Referral CRUD, search, status transitions
│   │   └── referral.validation.ts  # Zod schemas for referral operations
│   ├── admissions/
│   │   ├── admission.service.ts    # Admission CRUD, search, status history
│   │   └── admission.validation.ts # Zod schemas for admission operations
│   ├── placements/
│   │   ├── placement.service.ts    # Placement CRUD, search, status transitions
│   │   └── placement.validation.ts # Zod schemas for placement operations
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
│   ├── referral.ts           # Referral types, status/source/priority models
│   ├── admission.ts          # Admission types, status model
│   ├── placement.ts          # Placement types, status/type models
│   ├── guardian.ts           # Guardian, relationship, document types
│   ├── case.ts               # Case, assessment, plan, note, intervention types
│   ├── safeguarding.ts       # Concern, action, escalation, document types
│   ├── role.ts               # Roles, permissions, authorization types
│   └── user-profile.ts       # User profile types
└── middleware.ts              # Next.js middleware
supabase/
└── migrations/
    ├── 20260825000000_create_centres_table.sql
    ├── 20260826000000_create_user_profiles_table.sql
    ├── 20260827000000_create_roles_permissions.sql
    ├── 20260827000001_create_audit_log.sql
    ├── 20260828000000_create_children_table.sql
    ├── 20260829000000_create_referrals_admissions_placements.sql
    ├── 20260830000000_create_guardians_family.sql
    ├── 20260831000000_create_cases_safeguarding.sql
    └── 20260901000000_create_visits_contact.sql
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
├── referrals/
│   ├── referral-migration.test.ts    # 51 tests: migration SQL validation
│   ├── referral.service.test.ts      # 26 tests: CRUD, search, display helpers
│   ├── referral.validation.test.ts   # 26 tests: Zod schema validation
│   └── referral-security.test.ts     # 19 tests: permissions
├── guardians/
│   ├── guardian-migration.test.ts    # 61 tests: migration SQL validation
│   ├── guardian.service.test.ts      # 34 tests: CRUD, relationships, display helpers
│   ├── guardian.validation.test.ts   # 40 tests: Zod schema validation
│   └── guardian-security.test.ts     # 18 tests: permissions
├── admissions/
│   ├── admission.service.test.ts     # 14 tests: CRUD, search, display helpers
│   └── admission.validation.test.ts  # 16 tests: Zod schema validation
├── placements/
│   ├── placement.service.test.ts     # 23 tests: CRUD, search, display helpers
│   └── placement.validation.test.ts  # 23 tests: Zod schema validation
├── cases/
│   ├── case-types.test.ts            # 42 tests: enums, transitions, display helpers
│   ├── case-validation.test.ts       # 32 tests: Zod schema validation
│   └── case-permissions.test.ts      # 32 tests: permission constants and role mappings
├── safeguarding/
│   ├── safeguarding-types.test.ts    # 30 tests: enums, transitions, display helpers
│   └── safeguarding-validation.test.ts # 30 tests: Zod schema validation
├── visits/
│   ├── visit-types.test.ts           # 42 tests: enums, transitions, display helpers
│   ├── visit-validation.test.ts      # 32 tests: Zod schema validation
│   └── visit-permissions.test.ts     # 32 tests: permission constants and role mappings
├── daily-care/
│   ├── presence-types.test.ts        # 18 tests: enums, display helpers, type compliance
│   ├── daily-care-types.test.ts      # 22 tests: enums, display helpers, type compliance
│   ├── daily-care-validation.test.ts # 38 tests: Zod schema validation
│   └── daily-care-permissions.test.ts # 21 tests: permission constants and role mappings
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

## Backup & Recovery

The platform is protected and recoverable at the platform level (not a user-facing module) using the managed services it runs on:

- **Database** — Supabase Cloud scheduled daily backups (verified `walg_enabled: true`; PITR `false`), plus manual exports.
- **Code & schema — GitHub repository including the full `supabase/migrations/` history.
- **Documents** — private Supabase Storage buckets (recovered separately from the DB).
- **Deployment** — Vercel deployment history for instant rollback.

See **[`docs/backup-recovery/README.md`](docs/backup-recovery/README.md)** for the full strategy, and **[`docs/backup-recovery/runbook.md`](docs/backup-recovery/runbook.md)** for the quick-reference runbook.

## License

Proprietary — All rights reserved.
