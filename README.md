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
- Reporting & dashboards:
  - Capacity utilization per hostel and semester.
  - Counts of allocated vs vacant vs waitlisted students.
  - Data suitable for board-level discussion and planning.

## High-level architecture

Booking@UMU is a monolithic web application built with Laravel on the backend and React via Inertia on the frontend, using a relational database and Redis for caching.

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

### Domain model (core entities)

- **Student**
  - Linked to `users` table for auth.
  - Attributes: student number, gender, year of study, faculty, etc.
  - Relationships: has many Applications and Allocations.

- **Hostel**
  - Attributes: name, type (`campus_managed` or `affiliated`), gender policy (male, female, mixed), capacity.
  - Relationships: has many Rooms.

- **Room**
  - Attributes: hostel, room identifier, capacity, optional room-level gender override.
  - Relationships: has many Beds.

- **Bed**
  - Atomic allocation unit.
  - Relationships: belongs to Room, has many Allocations.

- **Semester / AcademicTerm**
  - Attributes: code, name, academic year, start/end dates.
  - Scopes Applications and Allocations over time.

- **Application**
  - Links a Student to a Semester and their preferences.
  - Tracks application status and history.

- **Allocation**
  - Links a Student to a Bed for a Semester.
  - Tracks allocation lifecycle status and who made changes.

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
  4. Dashboards, reporting, observability, and polish.

Each card represents a small, testable change (1–2 days of work) to keep progress incremental and visible.

## Getting started (high level)

> Detailed steps will be added as the project evolves.

1. Clone the repository.
2. Copy `.env.example` to `.env` and configure your local DB.
3. Install PHP and JS dependencies:
   - `composer install`
   - `npm install`
4. Generate app key and run migrations + seeders:
   - `php artisan key:generate`
   - `php artisan migrate --seed`
5. Start dev servers:
   - `php artisan serve`
   - `npm run dev`
6. Open the dev URL in your browser and log in with a seeded user.

---

For more detailed contribution guidelines and task breakdowns, see `CONTRIBUTING.md` and the project Kanban board.
