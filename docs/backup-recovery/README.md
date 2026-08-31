# Backup & Recovery Strategy

**Maintainer-facing.** This document defines how the **Children's Care Management & Accountability Platform** is protected against data loss and how it is recovered after an incident. It is intentionally **not** a new application module — backup and recovery are operational concerns handled at the **platform level** using the services the platform already runs on (GitHub, Supabase Cloud, Vercel).

> Follow the principles: **PROTECT → RECOVER → VERIFY → CONTINUE**. Never attempt recovery until you have read this document and understood what is included in each backup layer.

## Table of Contents

1. [Scope & What Is Protected](#1-scope--what-is-protected)
2. [Recovery Objectives (RPO / RTO)](#2-recovery-objectives-rpo--rto)
3. [Backup Strategy Overview](#3-backup-strategy-overview)
4. [Database Protection & Backup](#4-database-protection--backup)
5. [Code & Deployment Protection](#5-code--deployment-protection)
6. [Document (File) Storage Protection](#6-document-file-storage-protection)
7. [Recovery Process — Step by Step](#7-recovery-process--step-by-step)
8. [Recovery Authority & Who Can Restore](#8-recovery-authority--who-can-restore)
9. [Tenant Data & Security After Recovery](#9-tenant-data--security-after-recovery)
10. [Accidental Deletion & Soft-Delete Recovery](#10-accidental-deletion--soft-delete-recovery)
11. [Deployment Rollback](#11-deployment-rollback)
12. [Document-Storage Recovery](#12-document-storage-recovery)
13. [Disaster Recovery Situations](#13-disaster-recovery-situations)
14. [Testing Recovery](#14-testing-recovery)
15. [Audit & Accountability of Recovery](#15-audit--accountability-of-recovery)
16. [Post-Recovery System-Health Checklist](#16-post-recovery-system-health-checklist)
17. [Responsibilities & Emergency Contacts](#17-responsibilities--emergency-contacts)

---

## 1. Scope & What Is Protected

The platform stores four distinct kinds of data. Each is backed up and recovered **separately**:

| Layer | What it holds | Recovery source |
|-------|---------------|-----------------|
| **1. Database (PostgreSQL)** | All business records across every centre. This includes: children, referrals, admissions, placements, guardians & relationships, cases, assessments, care plans, case notes, interventions, safeguarding concerns & escalations, visits & contact attempts & restrictions, daily care, presence, meals, follow-ups, health & medical, education & development, staff, resources & support, assets, notifications, user profiles, roles & permissions, role history, centre records, and **audit logs**. | Supabase Cloud daily scheduled backups + manual exports (see [§4](#4-database-protection--backup)). |
| **2. Code & configuration** | Source code, API routes, UI, permissions model, and the full `supabase/migrations/` history. | GitHub repository (`Lyuvale/ORPHANAGE`). |
| **3. Document files (Supabase Storage)** | Uploaded files (health documents, case documents, safeguarding documents, guardian documents, staff documents, resource documents, etc.) stored as objects in private Storage buckets. | Supabase Storage — recovered **separately** from the database (see [§6](#6-document-file-storage-protection) and [§12](#12-document-storage-recovery)). |
| **4. Deployment** | The hosted application on Vercel (aliased to the production domain). | Vercel deployment history + code re-deploy (see [§11](#11-deployment-rollback)). |

> **Important:** A database backup does **not** include uploaded document files, and vice versa. Both layers must be considered when restoring.

## 2. Recovery Objectives (RPO / RTO)

These are the operational targets the platform is designed to meet. Where a target depends on the Supabase plan, the currently **verified** capability is stated and any plan-dependent assumption is flagged.

| Metric | Definition | Target |
|--------|-----------|--------|
| **RPO (Recovery Point Objective)** | Maximum acceptable data loss | **24 hours** — the platform has **scheduled daily database backups** enabled (WAL-G). |
| **RTO (Recovery Time Objective)** | Maximum acceptable downtime | **2 hours** for database recovery; **15–30 minutes** for a code/deployment rollback. |

**Verified capability (as of this writing):**
- `supabase backups list` reports `walg_enabled: true` → **scheduled daily backups are enabled**.
- `pitr_enabled: false` → **Point-in-Time Recovery is NOT currently enabled**.

Because PITR is **disabled**, you can restore to the latest completed scheduled backup, **not** to an arbitrary minute. If you need a finer-grained RPO (e.g. restore to a specific moment), you must **enable PITR** (a paid-plan feature) in the Supabase Dashboard before relying on it. **Do not assume PITR is available until it has been enabled and verified in the dashboard.**

## 3. Backup Strategy Overview

- The platform follows a **redundant, layered** back&recovery philosophy — no single point of failure:
  - **GitHub** is the source of truth for code, policies, permissions, and the migration history (regenerable schema).
  - **Supabase Cloud** provides managed daily database backups plus Storage.
  - **Vercel** keeps a full deployment history for instant rollback.
- Backups are **automatic and managed** by the hosting services — the platform does not need a custom backup job.
- There is **no backup data written into the application database**. Backup/restore tooling and snapshots live with the hosting providers, not as rows in the app DB.
- **Secrets are never committed.** `.env*` is git-ignored; keys live only in environment variables (local `.env.local`, Vercel dashboard/CLI).

## 4. Database Protection & Backup

### 4.1 Primary protection: Supabase Cloud managed backups

The live database runs on **Supabase Cloud** (project `znkpugggtdnauppjjxag`, region `eu-central-1`, PostgreSQL 17). Supabase automatically:

- Runs **daily scheduled backups** (WAL-G based) of the whole PostgreSQL database — this is verified enabled.
- Stores backups within Supabase's managed infrastructure, **outside** the application's reach, so they survive application-level failures.

**To view and download backups** (a platform operator, not an end user):
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) → select the project.
2. Go to **Database → Backups**.
3. You will see scheduled backup history, retention, and options to create an on-demand backup or restore.

> **Retention & plan:** Scheduled-backup retention and PITR availability depend on the billing plan. Confirm the current plan and retention window in the Dashboard before relying on a specific retention promise. **This document only asserts what has been verified (`walg_enabled: true`, `pitr_enabled: false`).**

### 4.2 Manual export (additional layer)

In addition to managed backups, an operator can produce a manual, portable dump of the schema and data:

```bash
# Produce a full SQL dump of the 'public' schema (data + schema)
supabase db dump --linked --schema public -f backup_public.sql

# Produce a schema-only dump (from migrations) when a fresh environment is needed
supabase db dump --linked --schema public --data-only -f backup_data.sql
```

**Prerequisite:** `supabase db dump` requires the Supabase CLI and a running **Docker daemon** in the recovery environment (this is an environment/tooling dependency, not a limitation of the platform or of Supabase). If Docker is unavailable in the recovery environment, use the Dashboard export path instead (Database → Backups → create on-demand backup / export via the SQL editor).

> These dumps contain sensitive data. Store them in a **private** location (encrypted, restricted) and never in the repository or any public bucket.

### 4.3 Schema is reproducible from code

Even without any backup, the database **schema** (tables, RLS policies, roles, permissions, seeds) is completely reproducible from the migration history in the repository:

```
supabase/migrations/20260825000000_create_centres_table.sql
supabase/migrations/20260826000000_create_user_profiles_table.sql
... (18 migrations total, ending 20260910000000_create_centres_access.sql)
```

```
supabase db push  # applies any pending migrations to the linked project
```

So a total database loss can be rebuilt structurally, but managed daily backups are required to recover the **data**.

## 5. Code & Deployment Protection

- **GitHub** (`Lyuvale/ORPHANAGE`, branch `master`) is the protected source of truth. All code, including `supabase/migrations/`, is versioned there.
- Every release is a **Deploy** on **Vercel** (`orphanage` project → production alias `orphanage-lyuvale.vercel.app`). Vercel retains a **full history of previous production deployments** (`vercel ls` shows many `Ready` production builds), enabling instant rollback.
- The production deployment is **SSO-protected**; public/unauthenticated requests to the production API return `[NOT_AUTHENTICATED]`, which is expected behaviour and is verified working.

## 6. Document (File) Storage Protection

Uploaded documents are stored as **objects in private Supabase Storage buckets** (`health-documents`, plus equivalent per-module buckets for cases, safeguarding, guardians, staff, resources, etc.). Records in the database store only the object location (`storage_path`) plus metadata (`file_name`, `file_type`, `file_size`, `uploaded_by`).

Characteristics relevant to backup & recovery:

- Objects use a **tenant-aware, entity-scoped path**, e.g. `health/{centre_id}/{child_id}/{uuid}.pdf`, which makes scoping a restore by centre feasible.
- Files are served only via **short-lived signed URLs** generated server-side (15-minute expiry) — there is no public bucket exposure.
- Storage buckets are **not** included in the PostgreSQL database backup. They must be backed up/recovered through **Supabase Storage** (Dashboard → Storage can export objects; or the Storage API/CLI can download/upload object contents), and the object paths must remain consistent with the `storage_path` values in the database after a restore.

See [§12](#12-document-storage-recovery) for the recovery procedure.

## 7. Recovery Process — Step by Step

This is the standard runbook for restoring the platform after a database or deployment incident. **It is a platform-level operation and must not be performed by individual centre users.**

### Step 0 — Declare & contain
- Confirm the incident (what is lost/failing), notify the **recovery authority** ([§8](#8-recovery-authority--who-can-restore)), and stop further writes to the affected resource where possible.
- Decide which layer(s) need recovery: DB, Storage, and/or deployment.

### Step 1 — Identify the correct backup
- For a database restore, pick the most recent **completed scheduled backup** that contains the data you need. Because PITR is disabled, you cannot exceed the backup's point-in-time coverage.
- Prefer a backup taken **before** the incident occurred. If the incident was a corrupting/bad write, do **not** restore from a backup that already contains the bad data.

### Step 2 — Snapshot what you can before you change anything
- If the current database is still reachable, take an **on-demand backup / SQL export first**. This preserves the option to reverse an incorrect restore.

### Step 3 — Restore the database
- In the Supabase Dashboard → **Database → Backups**, select the chosen backup and **Restore** (into the same project, or into a new project if the original is unrecoverable).
- If using a manual dump (from [§4.2](#42-manual-export-additional-layer)), apply it to the target database with `supabase db push`/psql, being careful to match the coded schema (migrations) with the restored data.

### Step 4 — Restore document storage (if lost)
- Follow the Storage recovery procedure in [§12](#12-document-storage-recovery), ensuring `storage_path` values match the restored database.

### Step 5 — Redeploy or roll back the application
- If the DB schema is compatible with the currently deployed app, simply keep the current deployment.
- If a code regression caused the incident, **roll back** the deployment (see [§11](#11-deployment-rollback)).
- If a new migration is not yet reflected, apply pending migrations (`supabase db push`).

### Step 6 — Verify data & tenant isolation
- Run the [post-recovery system-health checklist](#16-post-recovery-system-health-checklist), including cross-tenant isolation checks ([§9](#9-tenant-data--security-after-recovery)).

### Step 7 — Record & learn
- Record a recovery event in the **audit trail** ([§15](#15-audit--accountability-of-recovery)) and file the incident in GitHub so future recoveries are faster.

## 8. Recovery Authority & Who Can Restore

- **Restore/backup operations are platform-level and restricted.** Normal centre roles — `CENTRE_MANAGER`, `SOCIAL_WORKER`, `CAREGIVER`, `RECORDS_OFFICER`, `ACCOUNTANT_BURSAR` — are **operationally scoped to their own centre** and have **no** backup/restore capability exposed through the application. There is deliberately no "restore" action for end users.
- Only a **platform operator / project owner** with access to the **Supabase Dashboard**, the **GitHub repository**, and the **Vercel project** can:
  - create/download/restore database backups;
  - export/reimport Storage objects;
  - roll back deployments; and
  - apply migrations.
- Restores affect **all tenants**. Restoring a whole-project backup replaces the database for every centre, so a recovery is a coordinated, tightly-controlled event (see [§9](#9-tenant-data--security-after-recovery) for tenant safety).

## 9. Tenant Data & Security After Recovery

The platform is multi-tenant: every record is centre-scoped and RLS-enforced, with each user bound to exactly one `centre_id`. After any restore these guarantees must be **re-verified**:

- **RLS is intact.** Confirm that RLS policies are present and enabled on all protected tables (the full RLS policy set ships in migrations and is reapplied on any schema restore).
- **centre_id is correct.** Spot-check that records on the restored data still carry the correct `centre_id` and that no cross-centre leakage occurred.
- **Migrations match.** Ensure `supabase migration list` shows the restored DB is **in sync** with the repository (all 18 migrations applied). A schema/data mismatch is a common restore failure — verify it before going live.
- **Secrets unchanged.** Confirm service-role/anon keys in the restored environment still match the ones referenced by the deployed app (environment variables are **not** restored from a DB backup).
- **Storage↔DB consistency.** Confirm every `storage_path` in the restored DB still resolves to an object in Storage (see [§12](#12-document-storage-recovery)).

## 10. Accidental Deletion & Soft-Delete Recovery

The application is designed to **avoid physical deletes** in normal operation:

- Children use a **soft lifecycle** (`active → transferred → graduated → alumni → deactivated`); they are never physically deleted.
- Referrals/admissions/placements use status transitions (`cancelled`, `discharged`, `denied`, etc.) rather than hard deletes.
- **Case notes** are immutable/append-only and versioned; amendments create new versions.
- **Guardian relationships** end via `end_date`/`is_active` rather than being overwritten.

Consequences for recovery:

- Most "I deleted it" situations are already handled by **reversing a status** (a normal, permission-controlled business action) rather than a database restore. Prefer that path first.
- Hard deletes (Storage objects, or any accidental physical delete) can be recovered from:
  - the **audit trail** (identifies what existed and who changed it); and
  - a **managed daily backup** (if the delete predates the latest backup and PITR is disabled, the backup before the delete is your restore point).
- Restore **only** if there is no supported soft-delete reversal. Always snapshot first (§7 Step 2).

## 11. Deployment Rollback

Because every release is deployed through Vercel with a retained build history, rolling back the application is fast:

```bash
vercel ls                      # list recent production deployments (many Ready builds)
vercel rollback <deployment>   # or use the Vercel Dashboard: Deployments → ⋯ → Rollback
```

- Vercel keeps a **full history of previous production deployments** (verified: many `Ready` production builds are retained), so you can roll back to any prior working build.
- **DB-compatibility check before serving old code:** if rolling back code, ensure the code version you roll back to is compatible with the currently deployed database schema. If the DB has moved ahead of the old code, you must either restore the DB to a matching point or apply migrations carefully. **Never roll back code in a way that leaves new DB columns/constraints orphaned.**

## 12. Document-Storage Recovery

Document files live in **Supabase Storage**, outside the PostgreSQL backup. To recover them:

1. Identify the object paths that are missing. The database `storage_path` column in each module's document table (e.g. `health_documents`, `case_documents`, `safeguarding_documents`, `guardian_documents`, `staff_documents`, `resource_documents`) lists every expected object.
2. Restore the **Storage objects** from whatever layer protects them, **in the same bucket and at the same `storage_path`**:
   - Use Supabase Storage export/import in the Dashboard, or
   - Download object contents programmatically (Storage API) from the back-up source and re-upload to the same paths.
3. Re-verify every `storage_path` in the DB resolves to an existing object (a link check). Any mismatch shows up as a "broken download" for users.
4. Because objects are tenant-scoped by `centre_id` in their path, a **per-centre** recovery is possible without restoring the whole project when that is all that is needed.

## 13. Disaster Recovery Situations

| Situation | What to do |
|-----------|-----------|
| **Application is broken (bad deploy/code)** | Roll back the Vercel deployment (§11). No DB action needed if schema is compatible. |
| **A centre reports wrong/missing records (specific tenant)** | Check soft-delete reversal first (§10). If needed, use a per-centre Storage restore/DB correction. Avoid a whole-project restore for one tenant. |
| **Database corrupted/modified by a bad operation** | Restore the latest good scheduled backup (§7). Snapshot first, choose a pre-incident backup, then re-verify tenant isolation (§9). |
| **Whole database lost/destroyed** | Recreate schema from migrations + point to the last good daily backup; restore data; re-verify. RPO limited by the daily backup because PITR is disabled. |
| **Whole region/hosted DB unavailable** | Create a new Supabase project in the same/nearest region, restore the selected backup there, update environment variables, redeploy, and re-verify. |
| **Storage bucket lost** | Recreate the bucket(s) with the same names and RLS, restore objects at the same paths, and run the link check (§12). |
| **Accidental hard delete** | Audit trail identifies the affected entities; restore from the pre-delete backup or per-centre Storage import (§10). |

## 14. Testing Recovery

A backup that has never been restored is not proven. On a schedule (at minimum quarterly, and after any major schema change), the platform operator should validate the strategy with a **restore drill**:

1. Create a **disposable** Supabase project (or schema copy) — never a production centre.
2. Restore the latest database backup into it.
3. Verify record counts across representative tables (children, cases, documents metadata, audit logs).
4. Verify RLS/tenant isolation on the restored copy (§9).
5. Verify every `storage_path` resolves to an object (§12).
6. Document results (pass/fail) as a GitHub issue noting the backup date and any gaps.

Per-centre and code-only drill variants can be run more frequently (monthly).

## 15. Audit & Accountability of Recovery

Recovery actions are significant, security-relevant events and must be accountable:

- Use the platform's existing append-only **audit trail** (`audit_logs`) to record recovery-related events. The existing action vocabulary supports security events (`LOGIN`, `LOGOUT`, `ROLE_CHANGED`, `ACCOUNT_*`, plus `CREATE`/`UPDATE`/`DELETE` for business records).
- **Platform-level recovery events are recorded outside the normal user flow**, by a platform operator, using the audit helpers (e.g. `auditSecurityEvent` / `recordAuditEvent` with the actor identifying the operator) so that "who did what to backups/restores" is traceable. Example:

  ```ts
  await auditSecurityEvent(adminSupabase, null, "ROLE_CHANGED", "recovery",
    { centre_id, actor_user_id, metadata: { event: "db_restore", backup_ref: "<backup-id>" } });
  ```

- Because `audit_logs` is included in database backups, a restore preserves the audit history — but note that **restore events themselves are platform-level** and are also captured in GitHub issue history (document what was restored, when, from which backup, and by whom).
- Sensitive values (keys, tokens) are redacted automatically and must never be written into audit metadata.

## 16. Post-Recovery System-Health Checklist

After any restore/rollback, run all of the following before declaring the platform operational:

- [ ] All 18 migrations applied and `supabase migration list` shows the DB **in sync** with the repository.
- [ ] Database responsive; representative query against a protected table returns expected rows for the correct `centre_id`.
- [ ] **RLS enabled** on all protected tables; cross-tenant isolation spot-check passes (data from one `centre_id` is not visible under another).
- [ ] Authentication works in production; `requireAppAccess` + `requirePermission` protect API routes (public/unauthenticated requests return `[NOT_AUTHENTICATED]`).
- [ ] Every `storage_path` in the DB resolves to an existing Storage object (no broken document downloads).
- [ ] Environment variables (keys) unchanged and correct for production; no secrets in the repo.
- [ ] Production domain (`orphanage-lyuvale.vercel.app`) serving the intended deployment.
- [ ] Recovery event and incident documented in GitHub (what, when, from which backup, who).
- [ ] A fresh on-demand backup is taken so the post-recovery state is itself protected.

## 17. Responsibilities & Emergency Contacts

| Role | Responsibility |
|------|----------------|
| **Platform operator / project owner** (primary) | Owns backups, restores, migrations, rollbacks, Storage recovery, and the recovery runbook. The only personnel with Dashboard/CLI restore rights. |
| **GitHub owner** | Maintains repository history, protected `master`, and the migration history that makes schema recoverable. |
| **Vercel account admin** | Manages the `orphanage` project, environment variables, and deployment history/rollback. |
| **Centre managers & end users** | Use normal business operations (status reversals, corrections) and **escalate** any suspected data-loss incident to the platform operator. They have **no** backup/restore capability. |

- **Escalation:** any suspected data loss, missing document, or wrongful record change → open a GitHub issue immediately and contact the platform operator (who authenticates to Supabase Dashboard / Vercel / GitHub console). Do **not** attempt ad-hoc SQL or restores from the application.
- **Contact list placeholder** — keep an up-to-date privately-managed list of who holds the dashboard/console credentials. Never store credentials in this repository.

---

## Notes for Maintainers

- **Do not create backup tables or backup-application modules in the app database.** Backups live with the hosting providers. Adding backup rows/tables to the app DB would bloat the very data being backed up and complicate restores.
- **Do not claim PITR or specific retention until confirmed** in the Supabase Dashboard for the current billing plan. Document only verified capabilities (`walg_enabled: true`, `pitr_enabled: false`).
- **Environment is win32/PowerShell:** `vercel ls` / `vercel rollback` and `supabase ...` commands work from the Supabase/Vercel CLIs; `supabase db dump` additionally needs a running Docker daemon.
- Keep secrets out of all documentation and the repository (`.env*` is git-ignored).
