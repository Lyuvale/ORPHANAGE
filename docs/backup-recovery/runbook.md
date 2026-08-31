# Backup & Recovery — Quick-Reference Runbook

A condensed, copy-paste orientated version of [`README.md`](./README.md). Read the full strategy before performing a real recovery. This is **platform-operator-only**; normal centre users have no backup/restore access.

## 1. Check current backup capability

```bash
# Linked Supabase project (verified: this platform)
supabase projects list
supabase backups list --project-ref znkpugggtdnauppjjxag
# → walg_enabled:true (daily backups ON), pitr_enabled:false (PITR OFF)
```

- **RPO = 24h** (nearest completed daily backup). **No PITR** unless enabled in the Dashboard.
- Confirm retention / plan in **Supabase Dashboard → Database → Backups** before relying on it.

## 2. Protect the current state before restoring anything

```bash
# If the DB is still reachable, snapshot it first (via Dashboard on-demand backup or:)
supabase db dump --linked --schema public -f before_restore.sql   # requires Docker running
```

## 3. Restore the database

- **Dashboard:** Database → Backups → choose the latest backup **before** the incident → *Restore*.
- **Manual dump:** apply `before_restore.sql` / the chosen dump, then keep migrations in sync:
  ```bash
  supabase db push
  supabase migration list   # expect: all 18 applied, DB in sync
  ```
- If the original project is unrecoverable: create a new project, restore there, update env vars, redeploy.

## 4. Restore document storage (separate from DB)

- Object paths are listed by the `storage_path` column in each module document table.
- Restore objects into the **same bucket and same path** (Dashboard Storage import / Storage API).
- Then run a link check: every `storage_path` in the DB must resolve to an existing object.

## 5. Code rollback (if the app broke)

```bash
vercel ls                        # pick the last good production deployment
vercel rollback <deployment>     # or Dashboard: Deployments → ⋯ → Rollback
```

- **DB-compat rule:** never roll code back to a version incompatible with the current DB schema.

## 6. Verify before going live (checklist)

- [ ] `supabase migration list` in sync (18 applied)
- [ ] RLS enabled; cross-tenant isolation spot-check passes
- [ ] Unauthenticated API calls return `[NOT_AUTHENTICATED]`
- [ ] Every `storage_path` resolves to an object (no broken downloads)
- [ ] Secrets unchanged; prod domain serving the intended build
- [ ] Recovery event recorded in the audit trail + a GitHub issue
- [ ] Fresh on-demand backup taken of the restored state

## 7. When NOT to restore the whole project

- A single centre has bad/missing data → prefer business status reversals (soft-delete) or a **per-centre** Storage/DB correction first. Whole-project restores affect every tenant.
- End users must **escalate**, not attempt recovery.

See the full [`README.md`](./README.md) for details on scope, recovery authority, DR situations, testing, audit, and emergency responsibilities.
