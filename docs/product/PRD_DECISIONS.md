# Housing@UMU Product Decision Register

**Status:** Open decisions for stakeholder review  
**Created:** 2026-10-28  
**Baseline:** `5a0c8cd4f68587d8d058426118437a93cceeb084`

| ID | Decision required | Options/evidence | Owner (role, not named person) | Affected requirements | Deferral consequence |
|---|---|---|---|---|---|
| DEC-001 | First-year campus rule | Campus-first with permission for exceptions (current README/service reading) versus Dean permission before any campus allocation (contradictory original statement) | Institutional accommodation policy owner | BR-005, FR-APP-001, FR-ALLOC-001 | Acceptance criteria and fairness cannot be finalized |
| DEC-002 | Exception authority | Dean only; Warden within assigned campus scope; or delegated combination | University policy owner | BR-010, FR-PERM-001 | Unauthorized or non-auditable exceptions |
| DEC-003 | Permission period | Academic year, term, one transaction, or explicit expiry | University policy owner | BR-006, BR-010 | Expired permissions may remain effective |
| DEC-004 | Application multiplicity | One application per student/hostel/term (current schema) versus one total application per term versus multiple ranked applications | Product owner | BR-003, FR-APP-001, FR-WAIT-001 | Duplicate/fairness behavior remains ambiguous |
| DEC-005 | Active allocation definition | `allocated` and `checked_in` only (current service); include other states or status-plus-deletion rules | Accommodation governance owner | BR-002, FR-ALLOC-002, FR-OCC-001 | Capacity and uniqueness can disagree |
| DEC-006 | Waitlist fairness | FIFO submission time, verified eligibility priority, first-year priority, lottery, or governed combination | Accommodation governance owner | BR-009, FR-WAIT-001 | Promotion may be disputed |
| DEC-007 | Eligible campus capacity | Raw free beds, gender-compatible free beds, room-type-compatible beds, or policy-filtered effective capacity | Product/policy owner | BR-005, FR-ALLOC-001 | “Campus full” cannot be computed consistently |
| DEC-008 | Semester retention | Automatically retain first-year campus allocation across both terms; renew explicitly; or reallocate at rollover | Accommodation policy owner | BR-006, FR-OCC-001 | Students may lose rooms or capacity may be double-counted |
| DEC-009 | Transfer/revocation consequences | Preserve original allocation; close it and create a new record; allow return; define eviction/discipline effects | Accommodation governance owner | FR-OCC-001, data requirements | Historical and current occupancy can diverge |
| DEC-010 | Soft-delete restoration | Super-admin restore, governed restoration request, or permanent archival | Records/privacy owner | Data/NFR-PRIV-001 | Accidental deletion and audit obligations are unclear |
| DEC-011 | Student data authority | Manual verified registry, SIS import, registrar feed, or approved hybrid | Registrar/data owner | FR-STU-001, FR-REG-001 | Eligibility and identity cannot be trusted |
| DEC-012 | Maintenance ownership | Wardens, dedicated maintenance staff, hostel admins, or central facilities team | Operations owner | FR-MAINT-001 | Safety issues can remain unassigned |
| DEC-013 | Notifications | In-app only, email, SMS, or approved combination | Product/operations owner | FR-NOT-001, NFR-REL-002 | Students may miss allocation or maintenance outcomes |
| DEC-014 | URLM release gate | Require Laravel adapters and durable idempotency before MVP, or accept framework-neutral Phase 1 as technical preview | Engineering/product owners | NFR-UX-001, NFR-REL-001 | Reliability claims may exceed evidence |
| DEC-015 | Production operations | Backup schedule, restore objective, monitoring ownership, incident response, and rollback authority | Operations owner | NFR-OBS-001, NFR-OPS-001 | Production launch cannot be responsibly approved |
| DEC-016 | Product naming | Canonical Housing@UMU with Booking@UMU alias, or rename all references | Product/communications owner | Document control, public UX | Stakeholders may receive conflicting product identity |

## Decision recording format

For each approved decision, record:

1. Decision ID and exact policy wording.
2. Scope and effective academic period.
3. Decision authority and approval date.
4. Affected requirements and acceptance scenarios.
5. Data migration/compatibility impact.
6. Test fixture and browser demonstration impact.

Until an entry is approved, it must remain **Decision required** in the PRD;
implementation work must not silently encode both contradictory policies or
promote a documented proposal to a university rule.
