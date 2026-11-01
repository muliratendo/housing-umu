# Housing@UMU Product Requirements Document

**Status:** DRAFT — pending institutional and product-owner review
**Inspection date:** 2026-10-31
**Baseline:** `main` at `7565a0c0b9f7ee41c91bfbabcd5e6eda13aeae6e`
**Repository:** `/home/tendo_mulira/projects/housing-umu`
**Audience:** University accommodation owners, wardens, Dean/administrative stakeholders, developers, testers, and operations

## 1. Document control and evidence baseline

This PRD is an evidence-based description of the current checkout, not an
implementation authorization. It distinguishes product intent, source
evidence, automated evidence, and browser evidence.

The original product inspection was performed on 2026-10-28 against
`5a0c8cd4f68587d8d058426118437a93cceeb084`. Its scope confirmation described
the worktree and analysis session at that time. This reconciliation pass
inspects the later baseline `7565a0c0b9f7ee41c91bfbabcd5e6eda13aeae6e`; that
commit also contains the `artisan` mode change and metadata-file changes.
Neither those repository changes nor this documentation pass is product
implementation evidence.

The native execution context was WSL Ubuntu. The running application was
observed at `http://localhost/` on port 80. Vite was separately listening on
5173; it is an asset/HMR server, not the application URL. Browser inspection
covered the unauthenticated landing page and support page only. No write
workflow was submitted, no account was created, and no authenticated student
or administrator session was available.

### Status vocabulary

- **Implemented:** present in source and supported by a relevant test or
  direct browser observation; the exact scope is stated.
- **Partial:** some path exists, but important enforcement, integration, or
  verification is incomplete.
- **In development:** explicit current work exists, but it is not a shipped
  product capability.
- **Planned:** documented or commented intent without sufficient implementation.
- **Not found:** no reliable implementation evidence was found.
- **Decision required:** policy or acceptance cannot be inferred safely.
- **Out of scope:** not part of the accommodation MVP.

“Source inspected” never means “browser verified”.

## 2. Executive summary

Housing@UMU is the current product name in the repository and live page title.
The README describes it as Uganda Martyrs University's student accommodation
portal. Older concept material calls it Booking@UMU. The current scope is
student hostel discovery, term-scoped applications, allocation to beds,
waitlisting, occupancy/check-in/check-out, maintenance requests, hostel and
room administration, student verification/registry, reports, and role-scoped
administration. Academic room booking and general campus property management
are not evidenced as functional modules.

The product has moved beyond an empty planning project: the application has
Laravel routes, Eloquent models, React/Inertia pages, authorization policies,
allocation/application services, migrations, and public UI. However, the
university-board MVP is not yet acceptance-ready. The most material gaps are
authenticated browser verification, PHP test execution against a working test
database, durable server-side idempotency/reconciliation, explicit approval
workflow semantics, and resolution of the first-year campus policy
contradiction.

The PHP test-environment blocker is a repository-wide verification limitation,
not a framework-neutral URLM core acceptance condition. URLM Phase 1 core
acceptance is assessed separately from Laravel test-environment recovery.

### Proposed board-review MVP boundary

The MVP should demonstrate, in an isolated seeded environment:

1. Guest hostel discovery and policy information.
2. Verified student sign-in, profile/eligibility visibility, and a
   term-scoped application.
3. Server-authoritative validation of application window, gender/room policy,
   duplicate application, and affiliated-hostel access.
4. Safe allocation of one eligible bed, concurrent conflict handling, and
   waitlist placement when no eligible bed exists.
5. Student-visible application, allocation, and occupancy statuses as separate
   concepts.
6. Authorized warden/affiliated-admin views restricted to assigned hostels.
7. Check-in, check-out, maintenance request, and an occupancy report.
8. Evidence from automated tests, browser flows, and a documented safe demo
   dataset.

The MVP must disclose that URLM Phase 1 is framework-neutral and has no runtime
consumer, and that authenticated and end-to-end acceptance remains incomplete.

## 3. Vision, goals, and non-goals

### Goals

- Give students a clear, fair accommodation application and status journey.
- Give university accommodation staff authoritative, term-scoped allocation
  and occupancy control.
- Preserve historical applications, allocations, permissions, and departures.
- Keep affiliated-hostel administration isolated to authorized hostels.
- Provide actionable maintenance and operational reporting.
- Establish a maintainable Laravel/Inertia stack suitable for institutional
  handover.

### Non-goals for this release

- General-purpose academic classroom/room booking.
- General campus property or facilities-management inventory.
- Payment collection or payment reconciliation.
- Automatic institutional SIS integration unless separately approved.
- Production launch approval, security certification, or uptime commitment.
- Treating dashboard cards, route declarations, or future comments as proof
  of a complete feature.

## 4. Stakeholders, personas, and responsibility boundaries

| Persona | Evidence/status | Primary need |
|---|---|---|
| Guest | Browser observed | Discover hostels, policies, help, and login entry points |
| Student | Role, routes, pages, policies, models | Apply, track status, view allocation, check in, report maintenance |
| Warden | Role, permissions, hostel policy | Manage assigned campus hostels and accommodation decisions |
| Affiliated hostel administrator | Role, permissions, scoped policy | Manage assigned affiliated hostel only |
| Dean | Role, permissions, policy references | Institutional oversight and permission/exception authority; exact approval workflow unresolved |
| Super administrator/admin | Roles and permission seeder | Broad catalogue, user, system, and operational management |
| Maintenance staff | No distinct role found | Maintenance handling is represented through admin maintenance permissions; staffing boundary unresolved |

### Action and scope matrix

| Action | Student | Warden | Affiliated admin | Dean | Admin/super admin |
|---|---|---|---|---|---|
| View public hostels | Public catalogue | Yes | Yes | Yes | Yes |
| Submit application | Own student record | No | No | No | Not ordinary student flow |
| View/process applications | Own status | Assigned scope | Assigned scope | Broad read/process permission | Broad permission |
| Allocate/transfer/revoke | No direct administrative action | Assigned scope | Assigned scope (policy to confirm) | Read/oversight in seeder | Permission-dependent broad scope |
| Manage hostel/rooms/beds | No | Assigned campus scope | Assigned affiliated scope | Catalogue oversight | Broad scope |
| Manage waitlist | No | Assigned scope | Assigned scope | Read only in seeder | Permission-dependent |
| Check in/out | Student check-in; admin check-out | Assigned scope | Assigned scope | Not shown | Permission-dependent |
| Reports/export | Own visible status | Reports permission | Reports permission | Reports permission | Reports permission |
| Audit | No | No explicit audit UI found | No | No explicit audit UI found | Activity-log model exists |

Permission to perform an action is separate from record scope. The
`hostel_managers` assignment is the evidence-backed scope control for
wardens and affiliated administrators; a role alone must not grant access to
every hostel.

## 5. Domain model and terminology

- **User:** authenticated account. A user may have a role and may be linked to
  a student; student-facing routes require authentication, verification, and
  a student/student-leader role.
- **Student:** accommodation subject with student number, gender, year of
  study, and faculty. Verified student records are separately represented.
- **Hostel:** accommodation unit with campus-managed or affiliated management
  type, campus location, gender scope, application availability, rooms, and
  assigned managers.
- **Room:** hostel child with room type, capacity, active state, floor, price,
  and optional gender policy override.
- **Bed:** atomic allocation unit. Allocation logic locks/validates beds and
  database constraints protect term/room-bed uniqueness.
- **Academic year / term:** applications and allocations are term-scoped.
  The model contains academic years, academic terms, and later semester
  migrations; the authoritative calendar relationship and rollover procedure
  need confirmation.
- **Application:** a student's request for a hostel and term. It has its own
  status, preferences, preferred rooms, waitlist position, permissions,
  draft state, and soft deletion.
- **Allocation:** the institutional decision assigning a student to a room/bed
  for a term. Its status and check-in/out timestamps are independent from
  application status.
- **Occupancy:** the physical residency lifecycle represented by allocation
  status/timestamps, not a synonym for an application or a room's total
  capacity.
- **Effective eligible capacity:** currently available beds after term,
  active-room, bed status, gender policy, hostel scope, and application
  preference rules. It is not necessarily raw room capacity.
- **Permission/exception:** an authorized override or access decision. The
  application stores Dean/Warden flags and granting metadata, but the complete
  approval lifecycle is not evidenced.

Soft deletion exists on hostels, applications, allocations, rooms/related
entities in the model layer. Historical records must remain reportable and
must not be silently reused as active capacity. Restoration rights and
retention periods are decision items.

## 6. Functional requirements

### 6.1 Requirement index

| ID | Requirement | Priority | Status | Verification |
|---|---|---|---|---|
| FR-PUB-001 | Public hostel discovery and details | Must | Implemented/partial | Browser observed landing/support; hostel list source inspected |
| FR-AUTH-001 | Account, verification, login, recovery | Must | Partial | Auth source and tests; authenticated browser not verified |
| FR-STU-001 | Verified student identity and eligibility | Must | Partial | Models/routes/source; integration not verified |
| FR-TERM-001 | Active term and application window | Must | Partial | Models, controllers, migrations |
| FR-APP-001 | Term-scoped application submission | Must | Partial | Service/source; PHP feature execution blocked |
| FR-APP-002 | Draft, resume, duplicate-safe finalization | Should | In development/partial | ApplicationService source; no authenticated browser |
| FR-ALLOC-001 | Eligible bed allocation | Must | Partial | AllocationService/migration/source; no end-to-end acceptance |
| FR-ALLOC-002 | Concurrency and duplicate allocation protection | Must | Partial | Transaction and unique index source; tests blocked |
| FR-WAIT-001 | Waitlist placement and promotion | Must | Partial | Routes/controller/service/pages |
| FR-PERM-001 | Hostel-scoped administration | Must | Partial | Policies, roles, pivot relation |
| FR-OCC-001 | Check-in, check-out, retention | Must | Partial | Allocation model/routes; rollover acceptance unresolved |
| FR-MAINT-001 | Student maintenance request and comments | Should | Partial | Routes/models/pages; role boundary incomplete |
| FR-REP-001 | Occupancy reporting | Should | Partial | Controller/service/page |
| FR-REG-001 | Student verification/registry | Should | Partial | Admin routes/pages/models |
| FR-AUD-001 | Administrative activity/audit records | Should | Partial | Activity-log models/migrations; UI/coverage not verified |
| FR-NOT-001 | Notifications | Could | Not found | No reliable notification workflow found |
| FR-INT-001 | Imports/integrations | Could | Not found/planned | Verified records exist; SIS synchronization not found |

### 6.2 Public discovery

#### FR-PUB-001 — Discover accommodation

**Actor/need:** Guest or student; understand available hostels before applying.
**Shall:** The system shall expose a public hostel catalogue and detail view
with management type, gender scope, availability, description, rooms or
amenities where appropriate, and a clear route to login/application.
**Preconditions/trigger:** No authentication required; guest opens `/hostels`
or a hostel slug.
**Authorization/scope:** Publicly visible hostels must exclude closed or
deleted records according to the public controller policy.
**Alternate paths:** Empty catalogue, unavailable hostel, invalid slug, and
loading/error states shall give a meaningful next action.
**Acceptance:** Given an active public hostel, when a guest opens its detail
page, then the page identifies its management type and eligibility guidance
and does not expose private student/allocation data.
**Evidence/status:** Public routes and pages; browser landing page observed.
The list/detail workflow itself was not successfully opened in the browser
session and remains source-verified only. The live footer contains a “View
Hostes” spelling defect and policy links with empty URLs; these are usability
defects, not proof of missing backend routes.

### 6.3 Authentication and student identity

#### FR-AUTH-001 — Authenticate and recover an account

**Actor/need:** Student or administrator; securely access the appropriate
portal.
**Shall:** The system shall provide login, registration, email verification,
password reset, password confirmation, profile update, and role-based
redirects.
**Preconditions:** Valid account and, for protected routes, verified email and
required role.
**Errors:** Invalid credentials, unverified account, expired reset token,
session expiry, and unauthorized role shall be explicit and shall not expose
secrets.
**Acceptance:** Given a registered verified student, when login succeeds, then
the student reaches the student dashboard; given an unverified account, when
the student requests a protected page, then access is blocked with a
verification action.
**Evidence/status:** Laravel auth routes/controllers, Breeze-style React
pages, and auth feature tests. Browser authentication was not verified.
Google OAuth, 2FA, and passkeys are planned/commented rather than
implemented.

#### FR-STU-001 — Establish eligibility

The system shall associate a verified student with the authenticated user and
make the minimum eligibility data needed for term application and
gender/first-year policy decisions available to the authoritative server
logic. Missing or unverified registry data shall block or clearly qualify an
application rather than silently defaulting eligibility. The registry,
verification pages, and `VerifiedStudentRecord` model are present, but
institutional import authority and end-to-end synchronization are unresolved.

### 6.4 Academic term and application

#### FR-TERM-001 — Select an active term and window

**Actor:** Authorized academic administrator.
**Shall:** The system shall define the active academic year/term, its
application open/close dates, and hostel application availability. A student
submission shall be rejected if no active term exists or the window closes
before the authoritative server check.
**Acceptance:** Given a closed term window, when a student submits, then no
application is created/finalized and the UI explains that the window is
closed.
**Evidence/status:** Academic term/year models, migrations, admin routes, and
`ApplicationService`; no completed PHP/browser mutation verification.

#### FR-APP-001 — Submit one term-scoped application

**Actor:** Verified student.
**Need:** Request accommodation without duplicate or ineligible records.
**Shall:** The system shall accept a hostel, term, room type/capacity,
preferred rooms, notes/special needs, and relevant permission evidence; it
shall enforce one application per student/hostel/term, no active allocation
conflict, application window, and effective gender policy.
**Authorization:** Student may create/update only their own application;
administrators process only records in their permitted scope.
**Alternate paths:** Duplicate submission returns an actionable validation
error; no active term, no eligible data, closed hostel, policy mismatch, or
stale page returns an explicit failure. A bed becoming unavailable after the
form opens must be rechecked at allocation, not treated as an application
guarantee.
**Postcondition:** A submitted application is non-draft with `pending` status
and a stable form/application identity.
**Acceptance:** Given an open term and eligible verified student, when the
student submits valid data twice, then exactly one application exists and the
second response identifies the existing record.
**Evidence/status:** `ApplicationService`, `StoreApplicationRequest`,
application migration unique index, React application pages. PHP feature
tests could not be rerun because the configured `mysql` test hostname was
unresolvable; no browser submission was made.

#### FR-APP-002 — Save and finalize a draft

The system shall autosave pre-submission form state, allow the student to
resume or delete a draft, and finalize the same draft row on submission.
Finalization shall be scoped to the current student and draft identity and
shall not create an orphan duplicate. This is evidenced in source and URLM
adjacent UX work, but browser and PHP acceptance are incomplete.

### 6.5 Allocation and waitlist

#### FR-ALLOC-001 — Allocate an eligible bed

**Actor:** Authorized allocator; system service.
**Need:** Assign a real bed without exceeding effective eligibility or
capacity.
**Shall:** Allocation shall be term-scoped and select only an active room and
available bed in the application hostel, respecting room-over-hostel gender
policy, room type preference unless an authorized override is explicit, and
first-year affiliated access rules. A specific manual bed choice shall be
revalidated transactionally.
**Authorization/scope:** Warden/affiliated administrator is limited to
assigned hostels; global roles are broader according to policy.
**Alternate paths:** No eligible bed produces a waitlisted application; a
stale bed selection produces a conflict or waitlist outcome; invalid hostel,
gender, term, or permission produces a visible error.
**Postcondition:** Allocation status is `allocated`; application status is
updated separately and historical allocation data remains retained.
**Acceptance:** Given two eligible applications competing for one bed, when
both allocation requests execute concurrently, then at most one allocation
holds the bed and the other receives a deterministic conflict/waitlist
outcome.
**Evidence/status:** `AllocationService::create`, transaction and
`lockForUpdate`, allocation migration unique index, admin allocation routes.
No end-to-end concurrent test was verified in this inspection.

#### FR-ALLOC-002 — Protect allocation integrity

The system shall enforce one active allocation per student per term and one
active bed assignment per term. The database and service definition of
“active” shall agree; checked-out, cancelled, and evicted historical rows
must not consume current capacity. The current schema unique key is on
`room_id`, `bed_number`, and term, while service queries also inspect
allocation status and `bed_id`; this requires an acceptance test and possibly
schema clarification, not an assumed defect resolution.

#### FR-WAIT-001 — Place and promote fairly

When no eligible bed exists, the system shall preserve the application and
assign a waitlist position. An authorized administrator shall be able to
view and promote candidates only within scope. Ordering, tie-breaking,
fairness, and whether promotion is automatic or manual are product decisions.
Routes/pages and promotion action exist; the policy and automated evidence are
partial.

### 6.6 Permissions, occupancy, maintenance, reporting

#### FR-PERM-001 — Isolate hostel management

The system shall prevent an affiliated administrator or warden from viewing
or mutating records outside assigned hostels, even when a URL or request is
forged. Global access shall be limited to explicitly global roles. Acceptance
requires negative authorization tests for every read and write family.
Policies and `hostel_managers` checks are present; complete route/controller
coverage is not verified.

#### FR-OCC-001 — Manage occupancy lifecycle

The system shall distinguish `allocated`, `checked_in`, `checked_out`,
`evicted`, and `cancelled` allocation states, record check-in/out timestamps,
and display the student's allocation separately from application state.
Students can request/check in through the student route; authorized
administrators can check out. First-year two-semester retention is represented
by `is_retained` and metadata, but semester rollover/renewal behavior and
exception authority require decisions and tests.

#### FR-MAINT-001 — Report and handle maintenance

A student with an accessible allocation shall be able to create a maintenance
request, view it, and add/edit comments within ownership rules. Authorized
maintenance/admin users shall update status and priority within scope.
Routes, model, pages, and permissions exist. A distinct maintenance-staff
role, escalation, notification, SLA, and emergency path are not established.

#### FR-REP-001 / FR-REG-001 / FR-AUD-001

Authorized users shall be able to view occupancy reports, review and verify
student registry records, and inspect activity/audit records. These surfaces
exist in controllers/pages/models, but export formats, audit completeness,
retention, and browser verification remain partial.

### 6.7 Not evidenced as MVP functionality

Notifications (email/SMS/push), SIS imports/synchronization, general academic
room booking, campus property management, payment workflows, and a complete
Dean exception approval UI are not treated as implemented. They remain
Could/Won't until scope and acceptance are approved.

### Must functional requirement traceability

The following is source traceability, not end-to-end acceptance. It was
inspected against baseline
`7565a0c0b9f7ee41c91bfbabcd5e6eda13aeae6e`. “Not verified” and “not
observed” are intentional evidence states.

| Requirement | Route/controller/service symbol present | Authorization or business-rule enforcement | Effective test | Browser scenario |
|---|---|---|---|---|
| FR-PUB-001 | `PublicHostelController::index`, `PublicHostelController::show`; `/hostels`, `/hostels/{hostel}` | Public controller filters public hostel visibility | Not verified | Landing observed; catalogue/detail not observed |
| FR-AUTH-001 | `AuthenticatedSessionController`, `RegisteredUserController`, `VerifyEmailController`, password controllers; `routes/auth.php` | `auth`, `verified`, and role middleware on protected routes | Laravel auth tests present; current PHP run blocked | Not observed |
| FR-STU-001 | `Admin\StudentVerificationController`; `VerifiedStudentRecord` | Verification and student-role middleware/policies; authoritative import source not found | Not verified | Not observed |
| FR-TERM-001 | `Admin\AcademicTermController`, `Admin\AcademicYearController`; `ApplicationService` | Term activity and application-window checks in application service | Not verified | Not observed |
| FR-APP-001 | `Student\ApplicationController`; `ApplicationService::create` / finalization path; `StoreApplicationRequest` | Student ownership, duplicate uniqueness, active allocation, window, gender, and affiliated-hostel checks | Not verified; PHP environment blocked | Not observed |
| FR-ALLOC-001 | `Admin\AllocationController`; `AllocationService::create` | Hostel scope policy, gender/room checks, bed availability, transaction and `lockForUpdate` | Not verified; PHP environment blocked | Not observed |
| FR-ALLOC-002 | `AllocationService::create`; allocation migration unique indexes | Service active-status checks and database uniqueness; agreement for all inactive statuses remains unresolved | Not verified; PHP environment blocked | Not observed |
| FR-WAIT-001 | `Admin\AllocationController`; `AllocationObserver::promoteWaitlistFor` | Waitlist position and assigned-hostel scope; fairness/tie-breaking policy remains a decision | Not verified | Not observed |
| FR-PERM-001 | `ChecksHostelAccess`, `HostelPolicy`, admin route middleware | Assigned-hostel manager scope and explicit global permissions | Not verified; negative matrix absent | Not observed |
| FR-OCC-001 | `Student\AllocationController`, `Admin\AllocationController`; `Allocation` lifecycle fields | Allocation status and check-in/out authorization; rollover, retention, revocation, and exception authority unresolved | Not verified | Not observed |

### Expanded partial functional traceability

- **Reporting and exports (FR-REP-001):** `Admin\OccupancyReportController`
  and `OccupancyReportService::buildReport` provide the observed reporting
  surface. Export format, authorization coverage, and browser behavior are
  **not verified**; no browser scenario was observed.
- **Student registry verification (FR-REG-001):**
  `Admin\StudentVerificationController` and `VerifiedStudentRecord` provide
  the observed verification surface. Import authority, synchronization, and
  end-to-end verification are **not verified**; no browser scenario was
  observed.
- **Audit (FR-AUD-001):** `ActivityLog` and activity-log migrations provide
  record infrastructure, while complete administrative audit UI, retention,
  and coverage are **not verified**; no browser scenario was observed.
- **Transfers:** no authoritative transfer controller/service and no
  approved transfer policy were established; **not verified**, no browser
  scenario observed.
- **Revocation/eviction:** allocation lifecycle fields and administrative
  routes expose related status concepts, but complete authorization,
  consequences, and audit behavior are **not verified**; no browser scenario
  observed.
- **Semester/year retention:** `Allocation` retention fields and academic
  year/term models exist, but rollover/renewal behavior is unresolved;
  **not verified**, no browser scenario observed.
- **Exception approval:** permission fields and policy references exist, but
  no complete authoritative approval controller/state machine was found;
  **not verified**, no browser scenario observed.

## 7. Business rules and decision register summary

| ID | Rule | Current enforcement/evidence | Decision status |
|---|---|---|---|
| BR-001 | Bed is atomic allocation unit | Bed model, allocation service, schema | Implemented in source; concurrency acceptance pending |
| BR-002 | One active allocation per student per term | Service check and allocation statuses | Needs database/test confirmation |
| BR-003 | One application per student/hostel/term | Service and unique index | Implemented in source; soft-delete behavior needs decision |
| BR-004 | Room policy overrides hostel policy | Application and allocation checks | Implemented in source; mixed semantics need acceptance |
| BR-005 | First-years campus-first; affiliated after capacity/permission | README/service validation | Policy contradiction unresolved |
| BR-006 | Campus first-year allocation normally spans two semesters | Retention fields/model | Rollover procedure and authority unresolved |
| BR-007 | Affiliated administrators act only in assigned hostels | Policy and pivot | Implemented in policy; negative tests needed |
| BR-008 | Application, allocation, occupancy statuses are distinct | Separate models/constants | Must be preserved in UI/reporting |
| BR-009 | Waitlist order is fair and reproducible | Position field/routes | Ordering authority and tie-breaker unresolved |
| BR-010 | Permission duration and granting authority | Dean/Warden fields | Decision required |

### Required policy decision: first-year contradiction

The original concept contains both: (a) first-years receive campus-managed
accommodation first and may use affiliated accommodation after eligible campus
capacity is exhausted or with permission; and (b) first-years cannot be
allocated to campus-managed halls without explicit Dean permission. These
statements conflict.

The current README and `ApplicationService` implement the campus-first reading:
affiliated access is restricted unless campus capacity is exhausted or an
exception is present. This is a description of current evidence, not a policy
decision. A likely intended proposal is campus-first, with Dean permission
required for exceptions to the normal pathway; the product owner must approve
it. Acceptance criteria for FR-APP-001 and FR-ALLOC-001 cannot be final until
this is resolved.

Other decisions required: one active allocation per student versus multiple
hostels/applications; whether application uniqueness includes soft-deleted
rows; waitlist ordering; definition of eligible campus capacity; permission
authority/duration; retention across semesters; transfer/revocation effects;
and whether admins can restore soft-deleted records.

## 8. User journeys and state transitions

### Journey summaries

1. **Guest discovery:** landing page → hostel catalogue/detail → policy/help →
   login. Browser observed landing/support; catalogue detail not browser
   verified.
2. **Student onboarding:** register/login → email verification → verified
   student identity → dashboard. Source/test evidence; browser not verified.
3. **Application:** open term → choose hostel/preferences → autosave draft →
   submit → pending → allocated or waitlisted. Submission was not performed.
4. **Allocation:** administrator reviews eligible application → selects or
   runs allocation → transaction rechecks bed → allocation visible to student.
5. **Check-in/departure:** allocated → check-in → maintenance/occupancy →
   checkout, eviction, cancellation, or term rollover.
6. **Exception:** student/request → authorized decision → permission metadata →
   re-evaluated application. UI and authority are incomplete.

### Application states

| State | Evidence |
|---|---|
| Draft (`is_draft=true`) | Source implemented; resume/delete paths |
| Pending | Model/service/schema |
| Allocated | Model/service |
| Waitlisted | Model/service/waitlist routes |
| Rejected | Model/admin routes |
| Withdrawn | Model/student route |
| Checked in/out | Constants exist; application/allocation distinction must be tested |

### Allocation states

`allocated → checked_in → checked_out`; administrative cancellation and
eviction are represented. Proposed transitions must reject check-in from any
non-allocated state and preserve the historical row.

### Occupancy states

`not resident → allocated → checked in → checked out`; `evicted` is an
exceptional departure. The system must not infer “resident” from a pending
application.

### Approval/exception states

No complete authoritative state machine was found. Proposed states are
`requested → under_review → approved/rejected → expired/revoked`, with actor,
scope, academic year, reason, and effective dates. This is a decision and
design requirement, not a claim about current implementation.

## 9. Data and integrity requirements

The observed database direction is MySQL/InnoDB (`pdo_mysql`, `.env.example`,
README, and deployment configuration), not PostgreSQL. No migration should be
proposed merely to match the older concept.

Required integrity:

- foreign keys for student, hostel, room, bed, term, application, and actor
  relationships;
- stable identifiers and term scope on applications/allocations;
- unique form IDs and application uniqueness;
- transactional bed selection with authoritative availability recheck;
- consistent definition of active statuses across services, indexes, reports,
  and UI;
- immutable or auditable historical allocation/permission decisions;
- soft-deleted data excluded from active capacity but retained for reporting;
- import records with source, synchronization time, and conflict outcome;
- migration compatibility for existing semester and application data.

The current schema has foreign keys, indexes, soft deletes, application and
allocation uniqueness, and JSON preferences. It does not by itself prove
fairness, complete auditability, durable idempotency, or correct partial
unique behavior for all inactive statuses.

## 10. Non-functional requirements

Targets below are proposals, not measurements.

| ID | Requirement/target | Evidence/status | Verification | Priority |
|---|---|---|---|---|
| NFR-UX-001 | Every mutation shows pending, success, failure, or uncertain outcome with an actionable next step | React hooks/styles and URLM core; runtime consumers absent | Browser mutation scenarios | Must |
| NFR-UX-002 | A stale response shall not overwrite newer visible state | URLM reducer tests; not integrated | URLM integration tests and browser race test | Must |
| NFR-REL-001 | Retry budgets shall be finite; non-idempotent/auth unknown outcomes require reconciliation rather than blind repeat | URLM Phase 1 tests; no runtime consumer | Adapter and integration tests | Must |
| NFR-REL-002 | Student shall be able to determine whether submission happened before retrying | Draft/service intent; end-to-end unverified | Lost-response test with durable server key | Must |
| NFR-SEC-001 | Authorization shall be enforced server-side and object-scoped for every admin read/write | Policies/routes exist; coverage incomplete | Negative authorization matrix | Must |
| NFR-SEC-002 | Logs and diagnostics shall exclude credentials, tokens, student secrets, and unnecessary personal data | Logger/client log facilities exist; full redaction not verified | Redaction tests and log review | Must |
| NFR-DATA-001 | Allocation concurrency shall produce no duplicate active bed assignment | Transaction/index source; acceptance blocked | Parallel integration test | Must |
| NFR-A11Y-001 | Forms shall have labels, keyboard access, visible focus, and reduced-motion-safe feedback | Not measured; CSS/components exist | Keyboard/screen-reader review | Should |
| NFR-NET-001 | Slow/intermittent networks shall preserve form intent and show progress without unsafe duplicate submission | URLM planned integration | Browser throttling and lost-response tests | Must |
| NFR-OBS-001 | Provide separate liveness, dependency readiness, and synthetic transaction checks | `/up` health path/deployment; synthetic checks not found | Operations test | Should |
| NFR-OPS-001 | Backups, restore rehearsal, retention, and incident ownership shall be documented before production | Not found | Restore exercise | Must |
| NFR-PERF-001 | Set approved response and concurrency targets after measuring representative flows; do not claim targets as current performance | No baseline captured | Load/performance test | Should |
| NFR-MAINT-001 | Keep framework-neutral URLM isolated from adapters and migrate one runtime surface at a time | Phase 1 source/tests; no consumers | Architecture review and integration tests | Should |
| NFR-DEP-001 | Deployment shall use pinned, reviewed dependencies and safe migration/rollback procedure | Docker/Render config; CI workflow not found in checkout | Deployment rehearsal | Must |
| NFR-PRIV-001 | Student data collection/display shall be minimized by role and retained only as institutionally approved | Student/admin snapshots differ; policy approval absent | Privacy review and field-level tests | Must |

The URLM is not currently a product feature. It is framework-neutral source
and tests with no imports outside URLM/docs; Laravel authentication adapters,
durable server idempotency, reconciliation, and end-to-end authentication
verification remain future work. Redis keep-warm behavior is not a reliability
guarantee and is not accepted as a requirement without operational evidence.

Phase 1 core acceptance is a framework-neutral engineering decision. Phase 2
authentication/read integration requires explicit authorization before work
starts. Production mutation readiness is a later boundary requiring durable
server idempotency, reconciliation, database-backed duplicate protection, and
integration evidence; it is not silently included in Phase 2 authentication
scope.

## 11. Technical context and tooling decisions

| Area | Observed choice | Gap/conservative action |
|---|---|---|
| Backend | Laravel 13.x declared/locked evidence in URLM status | Keep; complete PHP environment acceptance |
| Frontend | React 18, Inertia 2, Tailwind 4, Vite 8 | Keep; integrate URLM deliberately |
| Database | MySQL/InnoDB | Keep; validate test isolation and constraints |
| Cache/session/queue | Redis in development direction; Render config uses file/session and sync queue | Document environment-specific guarantees; do not infer production resilience |
| Search | Scout/Algolia planned/configurable, collection fallback | Verify actual use before treating search as a requirement |
| Deployment | Docker, Nginx/PHP-FPM/Supervisor, Render | Rehearse migrations, backups, rollback, health checks |
| Auth | Laravel auth/Breeze-style flows; OAuth/2FA/passkeys planned | Do not advertise planned providers as available |
| CI/monitoring | GitHub Actions in concept; no workflow file found in checkout; `/up` health path configured | Add only after ownership and acceptance targets are agreed |

No new tool is justified solely for fashion or original concept parity.
Pricing/free-tier claims were not used because they require current provider
verification and are not necessary for this PRD.

## 12. Current state versus original concept

| Original expectation | Current evidence | Status/difference | Product action |
|---|---|---|---|
| Booking@UMU name | Live title/README say Housing@UMU | Naming changed | Confirm canonical brand and aliases |
| Accommodation MVP | Broad accommodation implementation | Substantial but incomplete | Define board MVP and exclude adjacent modules |
| PostgreSQL then MySQL | MySQL/pdo_mysql/InnoDB | MySQL selected | Keep; test actual environment |
| First-year campus-first | README/service | Current reading; contradictory source exists | Resolve BR-005 |
| React/Tailwind/shadcn/Laravel/Inertia | Dependencies/source | Implemented direction | Verify UI and runtime versions in CI |
| Redis | Dependency/direction; deployment uses file cache/session | Environment-dependent | Define operational guarantees |
| Waitlists | Routes, model fields, pages | Partial | Approve fairness/promotion rules |
| Maintenance | Models/routes/pages | Partial | Define staff ownership and SLA |
| URLM reliability | Framework-neutral core/tests | In development, no consumers | Do not claim runtime protection |
| CI/monitoring | Render health path; workflow not found | Partial/not found | Establish operational acceptance |

## 13. MVP demonstration and release acceptance

### Must-work demonstrations

- Public discovery at `/`, `/hostels`, and detail route.
- Student login/verification in a seeded test environment.
- Application in an open term, duplicate rejection, and closed-window error.
- Campus-first/affiliated decision using an approved policy fixture.
- One-bed concurrent allocation test with evidence.
- Waitlist placement and approved promotion.
- Student allocation/check-in and administrator check-out.
- Hostel-scoped negative authorization test.
- Maintenance request and occupancy report.

Use synthetic students only. The demo database must be isolated, resettable
by an approved procedure, and contain no real personal data. Do not submit
production-like writes during review.

### Exclusions to disclose

No production readiness, uptime, backup recovery, notification delivery,
SIS synchronization, payment processing, complete URLM integration, or
unresolved policy is implied by a polished dashboard.

## 14. Delivery roadmap and Kanban backlog

Recommended WIP limits: Ready 5, In Progress 2, Review/Test 2. Work moves
Backlog → Ready → In Progress → Review/Test → Done only with evidence.

| ID | Outcome | Links | Priority/size | Status |
|---|---|---|---|---|
| KB-001 | Approve first-year policy and exception authority | BR-005, BR-010, FR-APP-001 | Must/L | Backlog |
| KB-002 | Establish isolated MySQL test service and rerun PHP suite | NFR-DATA-001, FR-APP-001 | Must/M | Blocked — repository verification |
| KB-003 | Build authenticated browser evidence pack | FR-AUTH-001, FR-APP-001 | Must/M | Ready |
| KB-004 | Complete allocation concurrency and status acceptance tests | FR-ALLOC-001/002, BR-002 | Must/L | Ready |
| KB-005 | Specify waitlist fairness and promotion evidence | FR-WAIT-001, BR-009 | Must/M | Backlog |
| KB-006 | Complete hostel-scope negative authorization matrix | FR-PERM-001, NFR-SEC-001 | Must/M | Ready |
| KB-007 | Integrate URLM with authentication/read/mutation adapters | NFR-UX-001, NFR-REL-001 | Must/L | Backlog — no adapter implementation evidence |
| KB-008 | Define retention, rollover, revocation, and historical reporting | FR-OCC-001, BR-006 | Must/L | Backlog |
| KB-009 | Repair public navigation/policy links and verify responsive/accessibility states | FR-PUB-001, NFR-A11Y-001 | Should/S | Ready |
| KB-010 | Document backup/restore, monitoring, support ownership, and rollback | NFR-OBS-001, NFR-OPS-001 | Must/M | Backlog |
| KB-011 | Decide notifications, imports, payments, and adjacent modules | FR-NOT-001, FR-INT-001 | Could/M | Backlog |

**Definition of Ready:** approved requirement/decision, scoped actor and
records, fixtures, dependencies, and test evidence plan.
**Definition of Done:** implementation, server-side authorization and
validation, relevant automated tests, browser evidence where applicable,
documentation updated, `git diff --check` clean, and no unrelated worktree
changes absorbed.

## 15. Risks, assumptions, and open questions

| Rank | Risk/question | Decision owner | Affected requirements | Consequence of deferral |
|---|---|---|---|---|
| 1 | Which first-year campus/affiliated rule is authoritative? | Institutional accommodation policy owner | BR-005, FR-APP-001, FR-ALLOC-001 | Unfair or contradictory allocation acceptance |
| 2 | Who may approve exceptions, for what academic period? | University policy owner | BR-010, FR-PERM-001 | Unauthorized or non-expiring access |
| 3 | Can a student hold multiple applications/allocations per term? | Product owner | BR-002/003, FR-APP-001 | Duplicate and capacity ambiguity |
| 4 | What is fair waitlist ordering and tie-breaking? | Accommodation governance owner | BR-009, FR-WAIT-001 | Disputed allocation outcomes |
| 5 | Is test MySQL isolated and repeatable? | Engineering/operations owner | All PHP requirements | No trustworthy server acceptance |
| 6 | Who owns maintenance and emergency escalation? | Operations owner | FR-MAINT-001 | Unactioned safety issues |
| 7 | What is the authoritative student registry/import source? | Registrar/data owner | FR-STU-001, FR-REG-001 | Incorrect eligibility |
| 8 | What are retention, deletion, and restoration obligations? | Privacy/records owner | Data/NFR-PRIV-001 | Loss or over-retention of student history |
| 9 | What support/backup/incident service is funded? | Institutional operations owner | NFR-OPS-001 | Unsafe production launch |

These are role descriptions, not invented named people.

## 16. Traceability and acceptance gates

| Gate | Evidence required | Current status |
|---|---|---|
| PRD draft approval | Stakeholder review of this document and decisions | Pending |
| Repository verification | Source/test evidence tied to SHA | Performed, with limits |
| Phase 1 URLM acceptance | URLM tests/typecheck/build plus PHP baseline resolution and explicit review | Pending; PHP environment blocked |
| Integration acceptance | Runtime URLM adapters and durable idempotency/reconciliation | Not started |
| University MVP acceptance | Demonstration scenarios and synthetic browser evidence | Pending |
| Production launch approval | Security/privacy, backup/restore, monitoring, support owner, rollback | Not granted |

## 17. Evidence references

Detailed code and browser references are in
[PRD_EVIDENCE.md](./PRD_EVIDENCE.md). Institutional ambiguities are in
[PRD_DECISIONS.md](./PRD_DECISIONS.md).
