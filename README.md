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

### Key Files

| Module | Purpose |
|--------|---------|
| `src/lib/auth/app-user-context.ts` | `getAppUserContext()` — derives user + centre from DB |
| `src/lib/centres/tenant.ts` | `validateTenantAccess()` — guards cross-tenant access |
| `src/lib/users/user-profile.service.ts` | User profile CRUD |
| `supabase/migrations/20260825*.sql` | Centres table + RLS |
| `supabase/migrations/20260826*.sql` | User profiles table + RLS |

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Dashboard layout and pages
│   │   ├── centres/          # Centre management pages
│   │   │   ├── [id]/         # Centre detail page
│   │   │   ├── new/          # Create centre page
│   │   │   └── page.tsx      # Centres list page
│   │   └── layout.tsx        # Dashboard layout
│   ├── api/centres/          # Centre API routes
│   │   ├── [id]/route.ts     # GET/PATCH/DELETE single centre
│   │   └── route.ts          # GET list / POST create
│   └── layout.tsx            # Root layout
├── config/
│   └── env.ts                # Environment variable validation
├── lib/
│   ├── auth/
│   │   └── app-user-context.ts # Server-side user + centre context
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
│   ├── centre.ts             # Centre types and interfaces
│   ├── database.ts           # Supabase database types
│   └── user-profile.ts       # User profile types
└── middleware.ts              # Next.js middleware
supabase/
└── migrations/
    ├── 20260825000000_create_centres_table.sql
    └── 20260826000000_create_user_profiles_table.sql
tests/
├── centres/
│   ├── centre.service.test.ts
│   ├── centre.validation.test.ts
│   ├── migration.test.ts
│   └── tenant.test.ts
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
