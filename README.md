# Housing@UMU — Student Accommodation Management Platform

**Housing@UMU** is the official web-based accommodation portal for Uganda Martyrs University, Nkozi.
It manages the end-to-end student housing lifecycle: online applications, rule-based room allocation,
semester-scoped occupancy tracking, maintenance requests, and administrative oversight.

---

## Accommodation types

| Type | Managed by | Student eligibility |
|------|-----------|---------------------|
| **Campus-managed Halls of Residence** | Campus Warden | All students; first-years prioritised |
| **Affiliated Hostels** (private, approved) | Affiliated Hostel Admin | First-years only after campus capacity is exhausted, or with Dean/Warden permission |

---

## Key business rules

- First-year students are allocated to campus halls first. They may only access affiliated hostels if on-campus beds are full, or the Dean of Students grants explicit permission for that academic year.
- First-year students in campus halls retain their room for the entire first academic year (both semesters) unless the allocation is revoked or an exception is approved by the Warden, Dean, or Super Admin.
- Gender policies are enforced at both hostel and room level (`male`, `female`, `mixed`). Room-level policy overrides hostel-level (BR-4).
- One active allocation per bed per semester (unique index + `AllocationService`).
- One application per student per hostel per academic term (unique index + `ApplicationService`).

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel (PHP), Sail (`$ sail {flag}`) |
| Frontend | React via Inertia.js |
| Styling | Tailwind CSS v4, shadcn/ui, lucide-react |
| Auth | Laravel Breeze + Spatie Permission; Google OAuth (Socialite) + 2FA (PragmaRX Google2FA) planned |
| Database | MySQL (InnoDB) — ACID transactions, FK constraints, indexed columns |
| Caching | Redis — dashboard summaries, public hostel index |
| Search | Laravel Scout + Algolia (admin full-text; public hostel search via server-side Scout queries) |
| Deployment | Render.com (web service + managed MySQL) |
| CI/CD | GitHub Actions |

---

## Local development setup

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd housing-umu

# 2. Copy environment file and fill in credentials
cp .env.example .env

# 3. Install PHP dependencies
composer install

# 4. Install JS dependencies
npm install

# 5. Generate application key
$ sail artisan key:generate

# 6. Run migrations and seed test data
$ sail artisan migrate --seed

# 7. Configure Algolia search (for admin search features)
#    Set in .env:
#      SCOUT_DRIVER=algolia
#      ALGOLIA_APP_ID=your_app_id
#      ALGOLIA_SECRET=your_admin_api_key
#    Import initial indices:
$ sail artisan scout:import "App\Models\Hostel"
$ sail artisan scout:import "App\Models\Student"

# 8. Start dev servers
$ sail up -d
npm run dev
```

> **Algolia not configured?** Set `SCOUT_DRIVER=collection` in `.env` for local development.
> The public hostel list falls back to MySQL `LIKE` queries automatically.

---

## Environment variables (required)

```dotenv
APP_NAME="Housing@UMU"
APP_ENV=local
APP_KEY=

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=housing_umu
DB_USERNAME=sail
DB_PASSWORD=password

CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

SCOUT_DRIVER=algolia          # set to 'collection' for local without Algolia
ALGOLIA_APP_ID=
ALGOLIA_SECRET=

# Google OAuth (Socialite) — set after provider registration
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"
```

---

## Architecture overview

```
MySQL (InnoDB)
  └─ Eloquent Models
       (Student, Hostel, Room, Bed, Application, Allocation, AcademicTerm, MaintenanceRequest)
       └─ Services (AllocationService, ApplicationService)
            └─ Controllers (enforce business rules, build Inertia props)
                 └─ Inertia::render() → typed props
                      └─ React Pages (Tailwind + shadcn/ui)
                           └─ Shared Components (StatusPill, KpiCard, HostelFiltersPanel, etc.)

Redis:  dashboard cache (student_dashboard:{student_id}:{term_id}, TTL 5 min)
        public hostel index (public_hostels:index:{md5(filters)}, TTL 10 min)
        tagged as ['public_hostels'] for atomic flush via HousingUnitObserver

Algolia: admin full-text search (Hostel, Student, Allocation indices)
         public hostel search upgrades to Scout::search() when Searchable trait is added
```

---

## Core domain models

| Model | Key attributes | Relationships |
|-------|---------------|---------------|
| `Student` | student_no, gender, year_of_study, faculty | hasMany Applications, Allocations |
| `Hostel` | name, slug, management_type, gender_scope, is_religious_order | hasMany Rooms |
| `Room` | name, room_type, capacity, bed_count, gender_scope (override) | belongsTo Hostel |
| `AcademicTerm` | code, semester, academic_year_id, application_window_open/close | scopes Applications, Allocations |
| `Application` | status, notes, preferences (JSON), waitlist_position | belongsTo Student, Hostel, AcademicTerm |
| `Allocation` | status, bed_id, checked_in_at, checked_out_at | belongsTo Student, Hostel, Room, AcademicTerm |
| `MaintenanceRequest` | subject, description, status, priority | belongsTo Student, Allocation |

---

## Allocation status state machine

```
NOT_APPLIED → [submit] → PENDING
PENDING     → [bed found] → ALLOCATED
PENDING     → [no bed] → WAITLISTED
PENDING     → [admin rejects] → REJECTED
ALLOCATED   → [student confirms] → CHECKED_IN
ALLOCATED   → [admin cancels] → REJECTED
CHECKED_IN  → [checkout / term end] → CHECKED_OUT
CHECKED_OUT → [new term] → NOT_APPLIED
WAITLISTED  → [bed freed] → ALLOCATED
```

---

## Reusable overlay components

| Component | Path | Where to use |
|-----------|------|-------------|
| `<BackToTop />` | `resources/js/components/BackToTop.tsx` | Already injected by `GuestLayout` (public pages) and recommended in `AuthenticatedLayout` for long admin/student pages |
| `<ScrollDownIndicator />` | `resources/js/components/ScrollDownIndicator.tsx` | Import per-page inside hero sections: `Welcome.tsx`, `HowItWorks.tsx`, `Hostels/Show.tsx` hero area |

---

## Developer docs

- [CONTRIBUTING.md](CONTRIBUTING.md) — Kanban workflow, phases, PR guidelines, Algolia setup
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — Community standards and enforcement

---

## Deployment (Render.com)

1. Connect the GitHub repo to a Render Web Service.
2. Set all required environment variables in the Render dashboard.
3. Build command: `composer install --no-dev && npm ci && npm run build && php artisan migrate --force`
4. Start command: `php artisan serve --host=0.0.0.0 --port=$PORT`
5. Add a Render managed MySQL database and link via `DATABASE_URL`.
6. Add a Redis instance (Render or Upstash) and set `REDIS_URL`.
