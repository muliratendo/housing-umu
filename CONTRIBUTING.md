# Contributing to Booking@UMU

Thank you for considering contributing to **Booking@UMU – Student Hostel Allocation Platform**.  
This document explains how we work, how our **Kanban process** is set up, and how the **project phases** are organized, including search features powered by **Laravel Scout + Algolia**.

We welcome contributions of all kinds: code, documentation, testing, UX feedback, infrastructure, and ideas.

---

## 1. Kanban workflow

We use a simple Kanban board (GitHub Projects) to visualize work and keep flow smooth.

**Board columns:**

- `Backlog` – ideas and future work, not yet ready for implementation.
- `Ready` – clearly defined tasks that are ready to be picked up.
- `In Progress` – tasks actively being worked on (limit this).
- `Review` – work that has a pull request open and is waiting for review.
- `Done` – completed, reviewed, and merged work.

**Core Kanban practices:**

- **Visualize work** – every task should be an Issue and appear on the board.
- **Limit Work In Progress (WIP)** – aim for at most **2 cards** in `In Progress` per person.  
- **Manage flow** – move cards across columns as you work; ship small, frequent changes.  
- **Continuously improve** – if the workflow hurts, open an Issue or PR to improve it.

---

## 2. Project phases

Work is grouped into **phases** to keep scope under control. Phases overlap, but they help organize the backlog and priorities.

### Phase 1 – Core skeleton & deployment

- Set up Laravel + Inertia + React + Tailwind + shadcn/ui.
- Add auth (Laravel Breeze Inertia stack) and base roles.
- Deploy a working skeleton (landing page + basic dashboards shell) to Render.
- Set up CI (GitHub Actions) for tests and builds.

### Phase 2 – Domain model & CRUD

- Implement core entities:
  - Student, Hostel, Room, Bed, Semester, Application, Allocation.
- Build admin CRUD for hostels/rooms/beds/students.
- Seed realistic test data for hostels, students, and semesters.

### Phase 3 – Allocation logic & rules

- Implement capacity, gender-policy, and bed-uniqueness rules.
- Implement first-year priority, dean-permission logic, and retention across the academic year.
- Build the allocation engine and waitlist handling.
- Add basic search endpoints for entities to prepare for Algolia integration.

### Phase 4 – Dashboards, search, observability & polish

- Build admin and student dashboards with metrics and tables.
- Integrate **Laravel Scout + Algolia** to provide fast search for:
  - Hostels (by name, type, gender, capacity).
  - Students (by name, student number).
  - Applications/Allocations (by semester, hostel, status).
- Add caching (Redis) for heavy read operations.
- Add monitoring (health checks, uptime), logging, and test coverage for critical flows.

Issues are labeled by phase (e.g., `phase:1`, `phase:2`, `phase:3`, `phase:4`) so you can filter the board easily.

---

## 3. How to pick up work

1. **Browse the board**
   - Open the GitHub Projects Kanban board.
   - Filter by phase (`phase:2`, `phase:3`, etc.) or area (`area:frontend`, `area:backend`, `area:search`).

2. **Choose a task from `Ready`**
   - Pick a card that:
     - Has a clear description and acceptance criteria.
     - Matches your skills or something you want to learn.
   - If anything is unclear, ask in the Issue comments before starting.

3. **Assign yourself & move to `In Progress`**
   - Assign the Issue to yourself.
   - Move the card from `Ready` → `In Progress` (respect WIP limit).

4. **Create a branch**
   - Use a descriptive branch name, such as:
     - `feature/p3-allocation-engine`
     - `feature/p4-algolia-hostel-search`
     - `fix/p2-room-validation`
   - Make sure your branch is up to date with `main`.

5. **Implement and keep the Issue updated**
   - Commit in small steps with clear messages.
   - Reference the Issue number in commits or PR description (e.g., `Fixes #34`).

6. **Open a Pull Request (PR)**
   - When ready, open a PR to `main`.
   - Link the PR to the Issue.
   - Move the card to `Review`.

7. **Incorporate review feedback**
   - Address comments and push follow-up commits.
   - Once approved and merged, move the card to `Done`.

---

## 4. Types of contributions we welcome

### Application features

- **Frontend (Laravel + Inertia + React + Tailwind + shadcn/ui)**
  - New pages or components (dashboards, forms, tables, modals).
  - Improvements to layout, responsiveness, and accessibility.
  - Search UIs for Algolia (search boxes, filters, instant results).

- **Backend (Laravel)**
  - Domain services and business rules (allocation engine, constraints).
  - Search indices and query endpoints using **Laravel Scout + Algolia**.
  - Performance optimizations and refactors.

### Search: Algolia + Laravel Scout

- Installing and configuring Laravel Scout.
- Connecting Scout to Algolia with environment-based configuration.
- Defining searchable models and index mappings, for example:
  - `Hostel::class`, `Student::class`, `Application::class`.
- Implementing search APIs or Inertia controller actions to:
  - Search hostels by keyword and filters (type, gender, capacity).
  - Search students and allocations for admin workflows.
- Building UX on top of the search (typeahead, filters, facets).

### Quality and tooling

- **Tests**
  - Unit tests for:
    - Allocation rules (capacity, gender, first-year logic).
    - Search behavior (Scout index sync, Algolia queries).
  - Feature tests for:
    - Submitting applications.
    - Running allocation batches.
    - Searching hostels/students/applications from admin UI.

- **DevOps & infrastructure**
  - Improvements to GitHub Actions workflows.
  - Deployment, environment configuration, and secrets management (env vars for Algolia keys, etc.).
  - Monitoring, logging, and profiling improvements.

- **Documentation**
  - Setup steps for local development.
  - Search integration docs:
    - How to get Algolia API keys.
    - How to run Scout indexing locally.
  - Architecture notes and diagrams.

If you’re not sure where to start, look for Issues labeled `good first issue` or `area:search` (for Algolia/Scout work).

---

## 5. Coding and review guidelines

- **Style & conventions**
  - Follow Laravel and React conventions (PSR-12, idiomatic React).
  - Keep controllers thin; encapsulate complex logic in services or actions.
  - For search, keep index definitions in the models (Scout) and avoid leaking Algolia details into controllers more than necessary.

- **Environment & secrets**
  - Never commit `.env` or real API keys.
  - Use `.env.example` to show required environment variables, including:
    - `ALGOLIA_APP_ID`
    - `ALGOLIA_SECRET`
    - `SCOUT_DRIVER`
  - Document any new env variables in the README.

- **Tests**
  - Add or update tests for non-trivial changes.
  - For Algolia, prefer using Scout’s “array” driver or test doubles in unit tests where possible.
  - Ensure `phpunit` and frontend tests pass before marking PR as ready.

- **Pull requests**
  - Keep PRs focused on one Issue/topic.
  - Include:
    - A short summary of the change.
    - Any schema changes and migrations.
    - How to test locally.
  - Avoid large, unrelated refactors in a single PR.

---

## 6. Reporting issues and suggesting enhancements

If you find a bug or have an idea:

1. **Search existing Issues** to avoid duplicates.  
2. If none exist, open a new Issue with:
   - A clear title.
   - Steps to reproduce (for bugs).
   - Expected vs actual behavior.
   - Screenshots or logs if helpful.
3. For feature ideas, include:
   - The user role (student, warden, affiliated admin, dean).
   - The problem you’re trying to solve.
   - Any constraints or examples (e.g., search filters you’d like to see).

Maintainers will triage, label (phase, area, difficulty), and place new Issues onto the Kanban board.

---

## 7. Code of Conduct

Please be respectful and constructive.  
Be kind in reviews, assume good intent, and help others learn.

By participating in this project, you agree to follow the project’s Code of Conduct (if present in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)).

---

Happy building!  
If you’re new and want guidance on where to start, open an Issue titled **“Onboarding help”** and mention your interests (backend, frontend, search/Algolia, DevOps, UX, etc.).
