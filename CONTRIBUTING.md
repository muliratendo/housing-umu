# Contributing to Booking@UMU

Thank you for considering contributing to **Booking@UMU – Student Hostel Allocation Platform**.  
This document explains how we work, how our **Kanban process** is set up, and how the **project phases** are organized.

We welcome contributions of all kinds: code, documentation, testing, UX feedback, and ideas.

---

## 1. Kanban workflow

We use a simple Kanban board (GitHub Projects) to visualize work and keep flow smooth. [web:49][web:73]

**Board columns:**

- `Backlog` – ideas and future work, not yet ready for implementation.
- `Ready` – clearly defined tasks that are ready to be picked up.
- `In Progress` – tasks actively being worked on (limit this!).
- `Review` – work that has a pull request open and is waiting for review.
- `Done` – completed, reviewed, and merged work.

**Core Kanban practices:**

- **Visualize work** – every task should be an Issue and appear on the board. [web:49]  
- **Limit Work In Progress (WIP)** – try not to have more than **2 cards** in `In Progress` per person.  
- **Manage flow** – move cards across columns as you work; small, frequent updates are preferred over big, infrequent ones.  
- **Continuous improvement** – if something about the process hurts, open an Issue or PR to improve it. [web:49]

---

## 2. Project phases

Work is grouped into **phases** to keep scope under control. Phases overlap in time but help organize the backlog.

- **Phase 1 – Core skeleton & deployment**
  - Set up Laravel + Inertia + React + Tailwind + shadcn/ui.
  - Add basic auth (Breeze) and role scaffolding.
  - Deploy a working skeleton (landing page + dashboards shell) to Render.

- **Phase 2 – Domain model & CRUD**
  - Implement core entities: Student, Hostel, Room, Bed, Semester, Application, Allocation.
  - Build admin CRUD for hostels/rooms/beds/students.
  - Seed realistic test data.

- **Phase 3 – Allocation logic & rules**
  - Implement capacity, gender-policy, and bed-uniqueness rules.
  - Implement first-year vs continuing student rules and dean permission.
  - Build the allocation engine and waitlist handling.

- **Phase 4 – Dashboards, observability & polish**
  - Admin/student dashboards with metrics and tables.
  - Caching (Redis), basic monitoring (health checks, uptime), and logging.
  - Test coverage for critical flows and UI/UX refinements.

Issues are labeled by phase (e.g., `phase:1`, `phase:2`) so you can filter the board.

---

## 3. How to pick up work

1. **Browse the board**  
   - Go to the GitHub Projects Kanban board.  
   - Filter by your area of interest (e.g., `area:frontend`, `area:backend`, `phase:2`).

2. **Choose a task from `Ready`**  
   - Pick a card in `Ready` that:
     - Is well described.
     - Matches your skills or something you want to learn.
   - If something is unclear, ask for clarification in the Issue comments before starting.

3. **Assign yourself & move to `In Progress`**  
   - Assign the Issue to yourself.  
   - Move the card to `In Progress` (respect the WIP limit).

4. **Create a branch**  
   - Use a descriptive name, such as:
     - `feature/p2-applications-form`
     - `fix/p1-deployment-env`
   - Make sure your branch is up to date with `main` before you start.

5. **Do the work and keep the Issue updated**  
   - Commit early and often, with clear commit messages. [web:72]  
   - Reference the Issue in your commits or PR (e.g., `Fixes #34`).

6. **Open a Pull Request (PR)**  
   - When your work is ready, open a PR to `main`.  
   - Link the PR to the Issue.  
   - Move the card to `Review`.

7. **Address review feedback**  
   - Respond to comments, push follow-up commits.  
   - When approved and merged, move the card to `Done`.

---

## 4. Types of contributions we welcome

- **Feature implementation**
  - New pages or components in the Laravel + Inertia + React frontend.
  - Backend services, allocation logic, and domain rules in Laravel.
- **Bug fixes**
  - Fixing logic errors, UI bugs, or performance regressions.
- **Tests**
  - Unit tests for business rules (allocation, capacity, gender policy).
  - Feature tests for critical flows (apply, allocate, retain room).
- **Documentation**
  - Improving `README.md`, `CONTRIBUTING.md`, and architecture docs.
  - Developer setup instructions, API usage examples.
- **Design & UX**
  - Better layouts, shadcn/ui component usage, accessibility improvements.
- **DevOps & tooling**
  - CI/CD improvements, monitoring, log management, infra scripts.

If you’re not sure where to start, look for Issues labeled `good first issue`.

---

## 5. Coding and review guidelines

- **Style & conventions**
  - Follow Laravel and React/TypeScript best practices.
  - Keep functions and components small and focused.
  - Prefer clear naming over clever tricks.

- **Tests**
  - For non-trivial changes, add or update tests.
  - Don’t break existing tests; run the test suite before marking a PR as ready.

- **Pull requests**
  - Keep PRs focused on one topic/Issue.
  - Describe what changed, why, and how to test it.
  - Avoid mixing refactors with new features unless necessary.

---

## 6. Reporting issues and suggesting enhancements

If you find a bug or have an idea:

1. Check existing Issues to avoid duplicates.  
2. If none exist, open a new Issue with:
   - A short, descriptive title.
   - Steps to reproduce (for bugs).
   - Proposed behavior or rationale (for enhancements).
3. The maintainers will triage it, label it (phase, area), and place it on the board.

---

## 7. Code of Conduct

Please be respectful and constructive.  
Be kind in reviews, assume good intent, and help others learn.  
By participating in this project, you agree to follow the project’s Code of Conduct (if present in `CODE_OF_CONDUCT.md`).

---

Happy building!  
If you’re new and want guidance on where to start, open an Issue titled “Onboarding help” and mention your interests (backend, frontend, DevOps, UX, etc.).
