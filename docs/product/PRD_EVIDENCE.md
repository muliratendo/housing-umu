# Housing@UMU PRD Evidence Appendix

**Evidence baseline:** `main` / `5a0c8cd4f68587d8d058426118437a93cceeb084`  
**Inspection date:** 2026-10-28  
**Classification:** source inspected unless explicitly marked otherwise

## 1. Worktree and runtime

- Repository: `/home/tendo_mulira/projects/housing-umu`
- Branch: `main`
- Existing worktree modifications were preserved and excluded from product
  conclusions where unrelated.
- WSL Ubuntu was the native execution environment.
- `http://localhost/` responded in the integrated browser and displayed the
  title “Welcome to UMU Housing | Housing@UMU”.
- Port 80 hosted the Laravel application. Port 5173 was Vite HMR/assets.
- No authenticated browser session was available. No write operation was
  submitted.

## 2. Browser evidence log

| URL/path | Session | Observation | Agreement/limitation |
|---|---|---|---|
| `/` | Guest | Housing@UMU branding, View Hostels, Login, Help, four-step “sign in → apply → allocation → check in & renew” content | Agrees with public routes and README; no backend mutation verified |
| `/get-help` | Guest | Support contact content, message form, FAQs, campus location | Agrees with public route/page; submission intentionally not performed; displayed contacts may be placeholder data and were not treated as operational evidence |
| `/hostels` | Guest | Browser navigation attempt failed in this session | Source route/page exists; browser observation unavailable |
| `/login` | Guest | Browser navigation attempt failed in this session | Source auth route/page exists; authenticated behavior unverified |
| `/how-it-works` | Guest | Browser navigation attempt failed in this session | Source route/page exists; browser observation unavailable |

No personal student details, credentials, tokens, or screenshots are included
in this appendix.

## 3. Repository evidence map

| Area | Evidence | Conclusion |
|---|---|---|
| Product naming/scope | `README.md`, `resources/js/Pages/Public/Welcome.tsx` | Current name Housing@UMU; accommodation portal |
| Public routes | `routes/web.php`, `app/Http/Controllers/PublicHostelController.php` | Public landing, hostel catalogue/detail, help, how-it-works |
| Student routes | `routes/web.php`, `resources/js/Pages/Student/*` | Dashboard, hostels, applications, allocation, maintenance, profile |
| Admin routes | `routes/admin.php`, `resources/js/Pages/Admin/*` | Applications, allocations, waitlist, hostels/rooms/beds, terms, maintenance, reports, registry, users |
| Roles/permissions | `database/seeders/RolePermissionSeeder.php`, `app/Policies/*` | student, student_leader, warden, affiliated_admin, dean, admin, super_admin |
| Hostel scope | `app/Policies/Concerns/ChecksHostelAccess.php`, `app/Policies/HostelPolicy.php`, hostel manager migration | Assigned-hostel isolation is intended and partly enforced |
| Application logic | `app/Services/Housing/ApplicationService.php`, `StoreApplicationRequest.php` | Term, duplicate, active allocation, window, gender, affiliated checks; draft finalization |
| Allocation logic | `app/Services/Housing/AllocationService.php` | Transaction, bed locking, gender/room-type checks, waitlist fallback, manual bed validation |
| Application schema | `database/migrations/2025_01_01_000007_create_applications_table.php` | Unique student/hostel/term, statuses, draft/permission/preferences fields, soft deletion |
| Allocation schema | `database/migrations/2025_01_01_000008_create_allocations_table.php` | Term/room-bed uniqueness, lifecycle statuses, retention/override/check-in/out, soft deletion |
| Domain models | `app/Models/{User,Student,Hostel,Room,Bed,AcademicYear,AcademicTerm,Application,Allocation,MaintenanceRequest}.php` | Core accommodation domain plus maintenance |
| Reports | `app/Services/OccupancyReportService.php`, admin report controller/page | Occupancy report surface exists; export acceptance not established |
| Registry | `VerifiedStudentRecord`, student admin controllers/pages/migrations | Verification surface exists; authoritative import not found |
| Audit | `ActivityLog`, activity-log migrations, client UX logs | Records exist; complete audit UI/retention not verified |
| URLM | `resources/js/lib/urlm/**`, `docs/urlm/IMPLEMENTATION_STATUS.md` | Phase 1 framework-neutral core/tests; no runtime consumer |
| Deployment | `Dockerfile`, `compose.yaml`, `render.yaml` | Docker/Render/Nginx/PHP-FPM direction; MySQL and `/up` health path |
| CI | `.github` workflow inventory | No workflow file was found in the checkout during inspection |

## 4. Test and verification evidence

The URLM status document reports, for commit `5a0c8cd`, that:

- URLM Vitest tests passed: 3 files and 46 tests.
- URLM focused typecheck passed.
- Vite production build passed.
- `git diff --check` passed.
- Full TypeScript check remained blocked by an unrelated
  `resources/js/components/Profile/FooterLinks.patch.tsx` JSX error.
- PHP feature tests could not complete in the current environment because the
  test database hostname `mysql` could not be resolved. The status document
  records historical connected-baseline results, but those are not fresh
  acceptance for this PRD.

The repository's visible PHP tests are primarily authentication/profile
coverage. No verified current end-to-end accommodation suite was found.
Therefore source-level allocation and application evidence is not promoted to
“tested” status.

## 5. URLM boundary

The URLM status and source evidence support these framework-neutral invariants:
identity-safe stale event rejection, bounded retries, latest-wins/single-flight/
FIFO semantics, explicit uncertain outcomes, cancellation results, bounded
retention, and observer isolation.

The same evidence explicitly says:

- no runtime consumer was migrated;
- no Laravel adapter was integrated;
- durable server idempotency/reconciliation is not complete;
- end-to-end authentication verification is not complete;
- Phase 1 acceptance remains pending.

Accordingly, the PRD describes user outcomes (for example, determining
whether an application was submitted before retrying), not internal class
names as delivered product features.

## 6. Evidence limitations

- Browser roles were limited to guest. Student, warden, affiliated admin,
  dean, and super-admin workflows were not visually verified.
- No form was submitted; success, duplicate, conflict, and error responses
  for writes remain unverified.
- No credentials or local secrets were inspected.
- No tests, migrations, seeders, services, or external integrations were
  started or changed for this analysis.
- Source comments and README statements were treated as claims requiring
  corroboration, not as proof.
