# Contributing to Housing@UMU

Thank you for contributing to **Housing@UMU — Student Accommodation Management Platform**.
This document covers the Kanban workflow, project phases, Algolia/Scout integration guidelines,
and coding standards.

All contributions are welcome: code, documentation, tests, UX feedback, and DevOps improvements.

---

## 1. Kanban workflow

We use GitHub Projects (Kanban board) to track all work.

| Column | Meaning |
|--------|---------|
| `Backlog` | Future ideas, not yet ready |
| `Ready` | Clearly defined, acceptance criteria written — pick this up |
| `In Progress` | Actively worked on — **max 2 cards per person** |
| `Review` | PR open, awaiting review |
| `Done` | Merged and closed |

**Core practices:**
- Every task = a GitHub Issue on the board.
- Keep PRs small and focused on one issue.
- Move your card across columns as you work.

---

## 2. Project phases

| Phase | Focus |
|-------|-------|
| **1 — Skeleton** | Laravel + Inertia + React + Tailwind + shadcn/ui, Breeze auth, Render deploy, CI |
| **2 — Domain model** | Student, Hostel, Room, Bed, AcademicTerm, Application, Allocation migrations, CRUD |
| **3 — Allocation engine** | Capacity, gender, first-year priority, Dean permission, retention, waitlist |
| **4 — Dashboards + Search** | Student/admin dashboards, Scout + Algolia integration, Redis cache, monitoring |
| **5 — Auth hardening** | Google OAuth (Socialite), 2FA (PragmaRX Google2FA), email verification |

Issues are labelled `phase:1` … `phase:5` and `area:frontend`, `area:backend`, `area:search`, `area:devops`.

---

## 3. How to pick up work

1. Browse the Kanban board; filter by phase or area.
2. Choose a `Ready` card with clear acceptance criteria.
3. Assign yourself; move to `In Progress`.
4. Create a branch:
   - `feature/p3-allocation-engine`
   - `feature/p4-algolia-hostel-search`
   - `fix/p2-room-capacity-validation`
5. Commit incrementally; reference the issue (`Fixes #34`).
6. Open a PR to `main`; link the issue; move card to `Review`.
7. Address review feedback; merge; move card to `Done`.

---

## 4. Algolia + Laravel Scout integration guide

### Configuration

```dotenv
SCOUT_DRIVER=algolia
ALGOLIA_APP_ID=your_app_id
ALGOLIA_SECRET=your_admin_api_key
```

Use `SCOUT_DRIVER=collection` locally when you do not have Algolia credentials.
The public hostel list degrades gracefully to MySQL `LIKE` queries in this case.

### Searchable models (planned)

| Model | Index name | Searchable fields |
|-------|-----------|------------------|
| `Hostel` | `hostels` | name, location, management_type, gender_scope, description |
| `Student` | `students` | name, student_no, faculty, year_of_study |
| `Application` | `applications` | student name/no, hostel name, status, semester |
| `Allocation` | `allocations` | student name/no, hostel, room, bed, semester, status |

### Adding `Searchable` to a model

```php
use Laravel\Scout\Searchable;

class Hostel extends Model
{
    use Searchable;

    public function toSearchableArray(): array
    {
        return [
            'id'              => $this->id,
            'name'            => $this->name,
            'location'        => $this->location,
            'management_type' => $this->management_type,
            'gender_scope'    => $this->gender_scope,
            'description'     => $this->description,
        ];
    }
}
```

### Importing indices

```bash
$ sail artisan scout:import "App\Models\Hostel"
$ sail artisan scout:import "App\Models\Student"
```

### Public hostel search upgrade path

`PublicHostelController::index()` currently uses MySQL `LIKE`. When `Hostel` gains `Searchable`,
replace the `->when('search')` block with:

```php
$results = Hostel::search($filters['search'])
    ->query(fn ($q) => $q->with('rooms')->where('availability_status', '!=', 'closed'))
    ->get();
```

Wrap it inside the existing `Cache::remember()` block to prevent Algolia quota burn on
repeated identical public searches.

### Infinite reload loop prevention

The public hostel page uses a **debounced, search-only** `useEffect`:

```ts
useEffect(() => {
  // isFirstRender guard skips mount-time request
  const timer = setTimeout(() => router.get(...), 400);
  return () => clearTimeout(timer);
}, [search]); // ← ONLY search — never include filters
```

**Never** put `filters` or `currentFilters` in the dependency array.
Filter application fires only on explicit button click (`applyFilters()`).
This prevents the double-render loop that occurs when a server response updates
`currentFilters` props and triggers another `useEffect` cycle.

---

## 5. Coding standards

| Area | Standard |
|------|---------|
| PHP | PSR-12, `declare(strict_types=1)` in all new files |
| Controllers | Thin — delegate domain logic to Services (`AllocationService`, `ApplicationService`) |
| React | Functional components, TypeScript, no `any` unless unavoidable |
| CSS | Tailwind utility classes only — no inline `style={}` except dynamic values |
| Icons | `lucide-react` only — color via `text-accent-500` (gold), `text-brand-700` (green) |
| Secrets | Never commit `.env`; document new vars in `.env.example` and README |

---

## 6. Environment variables checklist

When adding a new environment variable:
1. Add it to `.env.example` with a descriptive placeholder and comment.
2. Document it in `README.md` under the "Environment variables" section.
3. Use `config()` in PHP (never `env()` outside `config/` files).

---

## 7. Tests

- Add feature tests for new controllers and services.
- For Algolia, use `SCOUT_DRIVER=collection` or Scout test doubles in unit tests.
- Run before marking PR ready:

```bash
$ sail artisan test
npm run type-check   # TypeScript strict mode
```

---

## 8. Reporting issues

1. Search existing issues to avoid duplicates.
2. Open a new issue with: clear title, steps to reproduce (bugs), expected vs actual behaviour, role affected (student / warden / admin / dean).
3. Maintainers will triage, label, and place on the board.

---

## 9. Code of Conduct

By contributing you agree to the project's [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Happy building!
