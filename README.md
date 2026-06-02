# Housing@UMU – Student Hostel Allocation Platform

  

Housing@UMU is a web-based platform for managing end-to-end student accommodation workflows at a university, with a focus on first-year placement, campus halls of residence, and affiliated private hostels. It is designed to model real warden/dean processes while using modern, production-ready tooling.

  

***
🗓️[Project Management Board](https://booking-umu-project-management.vercel.app/)
***
  

## Project context

  

At this university, there are two categories of accommodation:

  

- **Campus Managed Halls of Residence**

On-campus hostels managed by the Campus Warden.

- **Affiliated Halls of Residence (Private Hostels)**

Off-campus but university-affiliated, each with its own administrator (equivalent powers to the Warden, but only over their hostel).

  

Key real-world rules the system must enforce:

  

- **First-year prioritization**

- First-year students must first be considered for Campus Managed Halls of Residence.

- They may only go to Affiliated Hostels if there is no space on campus or if they have explicit permission from the Dean of Students.

- Dean permission typically lasts one academic year.

- **Stay obligation**

- Students allocated to Campus Managed Halls are required to remain there for their first academic year (two semesters) unless:

- They request to leave,

- Their allocation is revoked, or

- They are excluded due to disciplinary action.

- **Warden and admin control**

- Wardens (campus) and affiliated hostel admins (private) can:

- Allocate, switch, and revoke room/bed assignments.

- Manage waitlists.

- Handle disciplinary evictions.

  

The goal of Housing@UMU is to provide:

  

- A **student portal** to apply for accommodation each semester, track application/allocation status, and view hostel details.

- An **admin portal** (warden, affiliated admins, dean, central admin) to manage hostels, rooms, beds, allocations, and waitlists while respecting capacity and policy rules.

  

***

  

## Core domain model

  

The domain model is centered around hostels, beds, academic terms, and allocation lifecycles.

  

**Entities**

  

- **Student**

- Attributes: `id`, `user_id`, `student_number`, `name`, `gender`, `year_of_study`, `faculty`, etc.

- Relationships: belongs to `User` for auth, has many `Applications`, has many `Allocations`.

- **Hostel**

- Attributes: `id`, `name`, `type` (`campus_managed` or `affiliated`), `gender_policy` (`male`, `female`, `mixed`), `capacity`, `address`, `warden/admin_id`.

- Relationships: has many `Rooms`.

- **Room**

- Attributes: `id`, `hostel_id`, `room_number`, `capacity`, optional `gender_override` (room-level gender policy).

- Relationships: belongs to `Hostel`, has many `Beds`.

- **Bed**

- Attributes: `id`, `room_id`, `bed_label` (e.g., A/B/C), `is_active`.

- Relationships: belongs to `Room`, has many `Allocations`.

- **Semester / AcademicTerm**

- Attributes: `id`, `code`, `name`, `academic_year`, `start_date`, `end_date`.

- Used to scope all applications and allocations.

- **Application**

- Attributes: `id`, `student_id`, `semester_id`, `preference_type` (campus/affiliated), `preferred_hostels` (ordered preferences), `status` (`pending`, `approved`, `rejected`, etc.), `submitted_at`.

- Relationships: belongs to `Student`, `Semester`.

- **Allocation**

- Attributes: `id`, `student_id`, `bed_id`, `semester_id`, `status` (e.g., `not_applied`, `pending`, `allocated`, `waitlisted`, `rejected`, `checked_in`, `checked_out`, `evicted`), `allocated_by`, `reason`, timestamps.

- Relationships: belongs to `Student`, `Bed`, `Semester`.

  

**Key business rules**

  

- **Capacity constraints**

- Total allocations per room/hostel per semester must not exceed defined capacities.

- **Bed uniqueness**

- Each bed can have at most one active allocation per semester (enforced at DB level with unique index on `bed_id + semester_id + active_status`).

- **Gender policy**

- Students may only be allocated to hostels/rooms whose gender policy is compatible with their gender, except where a hostel/room is explicitly `mixed`.

- **First-year constraints**

- First-years must be allocated to campus halls first if capacity exists, and cannot choose affiliated hostels without dean’s permission while campus capacity remains.

- **Retention across academic year**

- Allocations can span both semesters of an academic year for a given student unless they opt out or are revoked/expelled.

- **Lifecycle \& Warden actions**

- Wardens/affiliated admins can switch rooms (update `bed_id`), revoke allocations (set status to `revoked`), and manage waitlists.

  

***

  

## System architecture (high level)

  

The platform is a standard web app with a Laravel backend and a React frontend via Inertia, backed by a relational database and Redis cache.

  

### Frontend

  

- **Tech stack**:

- React (via Inertia)

- Tailwind CSS

- shadcn/ui component library for reusable, minimalist UI components

- **Front-end apps**:

- **Student interface**

- Landing page and auth (login/register).

- Application wizard per semester.

- Allocation status page and basic profile.

- **Admin interface** (role-based)

- Dashboard with metric cards: total beds, occupied, vacant, waitlisted, maintenance issues.

- Hostels/rooms/beds management.

- Allocation and waitlist views.

  

Inertia lets the frontend behave like a SPA while routing and controllers stay in Laravel; controllers return Inertia responses instead of raw JSON.

  

### Backend

  

- **Framework**: Laravel (with Inertia + React starter kit like Breeze or equivalent).

- **Core responsibilities**:

- Enforce domain rules (capacity, uniqueness, gender, first-year/dean permission, retention).

- CRUD for hostels, rooms, beds, students, applications, allocations.

- Expose metrics for dashboards (capacity usage by hostel, semester occupancy, waitlists).

- Handle roles and permissions (e.g., student vs warden vs affiliated admin vs dean).

- **Auth \& roles** (planned):

- Laravel Breeze with Inertia + React for basic auth.

- Laravel Sanctum for future API token support.

- Spatie Laravel Permission (or similar) for multi-role authorization.

  
  

### Database

  

- **Database engine**: MySQL (for main app storage; can be swapped to PostgreSQL if needed depending on hosting constraints).

- **Design**:

- Normalized schema with foreign keys between students, hostels, rooms, beds, applications, allocations, semesters.

- Indexes on `hostel_id`, `room_id`, `semester_id`, `student_id`, and unique constraints for `bed_id + semester_id` active allocations to enforce correctness.

  
  

### Caching \& queues

  

- **Redis** is used for:

- Application cache (frequently accessed lists like hostel capacities).

- Session storage and possibly queues (e.g., running allocation batches asynchronously).

  
  

### Observability and reliability (planned)

  

- **Logging and debugging**:

- Laravel default logging to files.

- Telescope and Debugbar locally for introspection and query profiling.

- Optional integration with Sentry or similar for error tracking in production.

- **Monitoring**:

- UptimeRobot to ping a health endpoint that also performs a small Redis read/write to keep Redis and Laravel “warm”.

- Render’s own service metrics (CPU, memory, response times) for basic infrastructure monitoring.

- **Security**:

- Cloudflare sitting in front of the app for basic WAF, DDoS mitigation, and TLS termination.

- Laravel’s built-in security features (CSRF protection, input validation, encryption, password hashing).

  

***

  

## Deployment and infrastructure

  

- **Hosting**:

- Application deployed as a Web Service on Render free tier for early development and demos.

- Managed MySQL database (or PostgreSQL) on Render for persistent storage.

- **CI/CD**:

- GitHub repository with branch protection on `main`.

- GitHub Actions pipeline to:

- Run automated tests (PHPUnit, frontend tests/lint).

- Optionally trigger deployment to Render on merges/tags.

- **Configuration \& secrets**:

- Configuration managed via `.env` files in development and Render environment variables in production.

- Plan to evaluate tools like Infisical or Doppler if more advanced secret management is needed.

  

***

  

## Development process (Kanban-style)

  

The project uses a simple Kanban workflow to keep work flowing and avoid overloading:

  

- **Columns**:

- Backlog → Ready → In Progress → Review → Done

- **WIP limits**:

- Strict limit on cards in “In Progress” to encourage focus and frequent delivery.

- **Card granularity**:

- Each card represents a small, testable change (e.g., “Implement Application model \& migration”, “Build student application form UI”, “Add first-year allocation rule test”).

  

This style supports incremental delivery from an empty repo, to a deployed skeleton, to a functional MVP suitable for presentation to the university board.

  

***

  

<div  align="center">⁂</div>
