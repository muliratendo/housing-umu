# Booking@UMU – Student Hostel Allocation Platform

Booking@UMU is a web-based platform for managing end-to-end student accommodation at the university, from online applications to room/bed allocation and semester-by-semester occupancy tracking. It is designed around the real processes and rules used by Campus Managed Halls of Residence and Affiliated (private) Hostels.

## Project context

At this university, there are two main types of accommodation:

- **Campus Managed Halls of Residence** – on-campus hostels managed by the Campus Warden.
- **Affiliated Halls of Residence (Private Hostels)** – off-campus but university-affiliated hostels with their own administrators.

The system models the actual business rules, including:

- First-year students must be considered for Campus Managed Halls first. They may only go to affiliated hostels if:
  - There is no space in campus halls, or
  - They have explicit permission from the Dean of Students (typically valid for one academic year).
- Students allocated to Campus Managed Halls are expected to remain there for their entire first academic year (two semesters) unless:
  - They request to leave,
  - Their allocation is revoked, or
  - They are excluded due to disciplinary action.
- Wardens manage campus halls; affiliated hostel admins manage their own hostels with similar powers:
  - Allocate students to rooms/beds,
  - Switch room/bed assignments,
  - Revoke allocations and manage disciplinary evictions.

Booking@UMU aims to:

- Give **students** a self-service portal to apply for accommodation, see hostel options, and track allocation status.
- Give **wardens, affiliated admins, the Dean and central staff** a controlled, auditable way to manage capacity, apply policies, and generate reports.
- Provide **fast, intuitive search** across students, hostels, rooms, and allocations using Laravel Scout and Algolia.

## Core features (MVP)

- Student portal:
  - Login/register, view profile.
  - Apply for accommodation per semester with hostel preferences.
  - View application and allocation status (pending, allocated, waitlisted, rejected, etc.).
- Admin portals:
  - Warden and affiliated-hostel admin dashboards with metrics (total beds, occupied, vacant, waitlisted).
  - CRUD for hostels, rooms, beds, students.
  - Run allocation processes respecting capacity, gender, and first-year/dean rules.
  - Manage waitlists, switch rooms, revoke allocations, and track occupancy per semester.
- Allocation engine:
  - Enforces:
    - Capacity constraints at room and hostel level.
    - One active allocation per bed per semester.
    - Gender compatibility (hostel/room policy vs student gender).
    - First-year priority and dean permission rules.
    - Retention for first-year campus allocations across both semesters of an academic year.
- Search & discovery (via Scout + Algolia):
  - Full-text search across students, hostels, rooms, and allocations for admins.
  - Quick search for hostels and rooms in student-facing flows (e.g., selecting preferences).
  - Algolia-backed indices for fast, typo-tolerant search and filtering.
- Reporting & dashboards:
  - Capacity utilization per hostel and semester.
  - Counts of allocated vs vacant vs waitlisted students.
  - Data suitable for board-level discussion and planning.

## High-level architecture

Booking@UMU is a monolithic web application built with Laravel on the backend and React via Inertia on the frontend, using a relational database, Redis for caching, and Laravel Scout + Algolia for search.

### Frontend

- **Stack**
  - React (via Inertia.js)
  - Tailwind CSS
  - shadcn/ui component library

- **Responsibilities**
  - Provide separate UX for:
    - Students (applications, status, profile).
    - Admins/wardens/affiliated admins/dean (dashboards, hostel management, allocations).
  - Use Inertia to render server-driven pages with SPA-like navigation.
  - Use Tailwind + shadcn/ui for a consistent, minimal, accessible UI (cards, tables, forms, dialogs).
  - Integrate Algolia-powered search widgets or custom search UIs that call backend endpoints using Scout queries.

### Backend

- **Framework**
  - Laravel (with Breeze Inertia/React starter kit, or equivalent).

- **Responsibilities**
  - Implement domain logic and business rules:
    - Capacity checks, gender policy checks.
    - First-year campus priority and dean-permission constraints.
    - Allocation lifecycle (pending, allocated, waitlisted, checked_in, checked_out, evicted, etc.).
  - Provide controllers that return Inertia responses for pages and APIs for background jobs if needed.
  - Implement role-based access control:
    - `student`, `warden`, `affiliated_admin`, `dean`, `super_admin` roles (e.g., via Spatie Permission).
  - Expose metrics and lists for dashboards:
    - Hostels, rooms, beds, allocations, waitlists, maintenance records (future), student details.
  - Provide search endpoints backed by Laravel Scout:
    - Models such as `Hostel`, `Room`, `Student`, `Allocation` implement the `Searchable` trait and are indexed in Algolia. 
    - Admin and student UIs trigger Scout searches for fast filtering and discovery.

### Domain model (core entities)

- **Student**
  - Linked to `users` table for auth.
  - Attributes: student number, gender, year of study, faculty, etc.
  - Relationships: has many Applications and Allocations.
  - Searchable fields (via Scout/Algolia): name, student number, faculty, year of study (for admin search).

- **Hostel**
  - Attributes: name, type (`campus_managed` or `affiliated`), gender policy (male, female, mixed), capacity.
  - Relationships: has many Rooms.
  - Searchable fields: name, type, gender policy, location.

- **Room**
  - Attributes: hostel, room identifier, capacity, optional room-level gender override.
  - Relationships: has many Beds.
  - Searchable fields: hostel name, room identifier, occupancy status.

- **Bed**
  - Atomic allocation unit.
  - Relationships: belongs to Room, has many Allocations.
  - Mostly used in search via allocations (e.g., “find a student’s bed”).

- **Semester / AcademicTerm**
  - Attributes: code, name, academic year, start/end dates.
  - Scopes Applications and Allocations over time.

- **Application**
  - Links a Student to a Semester and their preferences.
  - Tracks application status and history.
  - Searchable fields: status, semester, student identifiers, preferred hostels (for admin queries).

- **Allocation**
  - Links a Student to a Bed for a Semester.
  - Tracks allocation lifecycle status and who made changes.
  - Searchable fields: student identifiers, hostel, room, bed, semester, status (for quick lookup by admin).

### Data storage and constraints

- **Database**
  - Relational database (MySQL in development/production, can be swapped to PostgreSQL if needed).
  - Referential integrity via foreign keys between:
    - Students, hostels, rooms, beds, applications, allocations, semesters.
  - Indexes for frequently queried relationships:
    - `hostel_id`, `room_id`, `bed_id`, `semester_id`, `student_id`, `status`.

- **Key constraints**
  - Capacity:
    - Room capacity: number of beds.
    - Hostel capacity: sum of room capacities.
    - Total allocations per room/hostel per semester must not exceed capacity.
  - Uniqueness:
    - Each bed can have at most one active allocation per semester (enforced via unique index and application logic).
  - Gender:
    - Student gender must align with hostel/room gender policy, except for hostels/rooms configured as mixed.
  - First-year & retention rules:
    - First-year students must be allocated to campus halls first if space exists, and may only go to affiliated hostels with dean permission.
    - First-year students in campus halls retain their rooms across both semesters of their first academic year unless they leave or are revoked.

### Search architecture (Laravel Scout + Algolia)

- **Laravel Scout**
  - Provides a driver-based abstraction for full-text search on Eloquent models.
  - Models that should be searchable (e.g., `Hostel`, `Room`, `Student`, `Allocation`) use the `Searchable` trait.
  - `toSearchableArray()` is implemented to control which fields are sent to Algolia.

- **Algolia**
  - Hosted search engine used as the Scout driver for fast, typo-tolerant indexing and querying.
  - Stores search indices for key models to power:
    - Admin search bars (find a student by name/number, search hostels/rooms by name or policy).
    - Student-facing hostel search when selecting preferences.
  - Algolia credentials (app ID, API key, index names) are stored via environment variables and configured in `config/scout.php`.

- **Frontend integration**
  - Simple search forms call Laravel controllers, which use Scout to query Algolia and return paginated results.
  - Optionally, Algolia’s JavaScript helpers or custom React components can be used for richer search UIs.

### Caching and performance

- **Redis**
  - Used for:
    - Application cache (e.g., hostel capacity summaries).
    - Session storage and queues (for background jobs like allocation batches).
- **Performance profiling**
  - Local tools like Laravel Telescope and Debugbar for inspecting queries and performance (non-production).

### Observability, security, and deployment

- **Logging & monitoring**
  - Laravel’s logging system (daily logs).
  - Health endpoint for monitoring (DB + Redis checks).
  - External uptime monitoring (e.g., UptimeRobot) pinging the health endpoint.
  - Optional error tracking integration (e.g., Sentry) for production.

- **Security**
  - Laravel’s built-in features: CSRF protection, input validation, password hashing.
  - Cloudflare in front of the app for TLS, basic WAF, and DDoS mitigation.

- **Deployment**
  - Hosted on Render.com (web service).
  - Database: managed MySQL (or PostgreSQL) on Render.
  - CI/CD: GitHub Actions pipeline for tests and deployments.

## Development approach

The project uses a Kanban-style workflow with a GitHub Projects board:

- Columns: Backlog → Ready → In Progress → Review → Done.
- Work is grouped by phases:
  1. Repo & core skeleton (Laravel + Inertia + React + Tailwind + shadcn/ui).
  2. Domain model & CRUD.
  3. Allocation engine & business rules.
  4. Dashboards, reporting, observability, search (Scout + Algolia), and polish.

Each card represents a small, testable change (1–2 days of work) to keep progress incremental and visible.

## Getting started (high level)

> Detailed steps will be added as the project evolves.

1. Clone the repository.
2. Copy `.env.example` to `.env` and configure your local DB and Algolia credentials.
3. Install PHP and JS dependencies:
   - `composer install`
   - `npm install`
4. Generate app key and run migrations + seeders:
   - `php artisan key:generate`
   - `php artisan migrate --seed`
5. Configure Scout and Algolia:
   - Set `SCOUT_DRIVER=algolia` and Algolia keys in `.env`. 
   - Run initial indexing (e.g., `php artisan scout:import "App\\Models\\Hostel"`).
6. Start dev servers:
   - `php artisan serve`
   - `npm run dev`
7. Open the dev URL in your browser and log in with a seeded user.

---

For more detailed contribution guidelines and task breakdowns, see [CONTRIBUTING.md](CONTRIBUTING.md) and the project Kanban board.
