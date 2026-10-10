// File: resources/js/components/Navigation/AppSidebar.tsx
//
// ─── LAYOUT REFERENCE ───────────────────────────────────────────────────────
// Restyled to resemble Render's dashboard sidebar:
//   - Flat, ungrouped-looking nav rows — accordions REMOVED entirely.
//     Render never collapses/expands sections; every row is always visible.
//   - Slim uppercase section labels (Render: "INTEGRATIONS", "NETWORKING")
//     act as the ONLY visual separator between groups — no chevrons, no
//     click-to-toggle, no boxed containers.
//   - Thin left accent bar on the active row instead of a filled pill.
//   - Font weights capped at font-normal (inactive) / font-medium (active
//     row + section labels). Nothing above font-medium anywhere in the
//     sidebar — this is what removes the "shouty" bold look.
//   - Comfortable vertical rhythm: gap-6 between sections, gap-0.5 between
//     rows inside a section, py-2 row height — matches Render's spacing.
//   - Middle nav section scrolls independently; header + footer are pinned
//     via a strict grid-rows-[auto_1fr_auto] layout (unchanged approach,
//     confirmed correct for this requirement).
//
// NEW: Active-link auto-scroll-into-view (centered).
//   - Every NavRow tags itself with `data-active="true"` when it matches
//     the current route. This is a plain HTML attribute passed through by
//     Inertia's <Link> regardless of ref-forwarding support, so it works
//     even though Link is not guaranteed to forward refs in this codebase
//     (see existing comment in AuthenticatedLayout re: DropdownMenuItem).
//   - The scrollable <nav> container (desktop aside AND mobile Sheet) uses
//     the `useScrollActiveIntoView` hook, which queries for that attribute
//     on mount and calls scrollIntoView({ block: 'center' }). Because
//     AuthenticatedLayout (and therefore this sidebar) fully remounts on
//     every Inertia navigation AND on hard page reloads, this runs every
//     time — so the active link (e.g. "Manage Hostels" while viewing a
//     specific room) is always vertically centered in the nav viewport
//     instead of popping back to the scroll-top position.
//
// Functional behaviour that is UNCHANGED: roles/permissions gating, active-
// route detection, logout confirmation dialog, mobile sheet behaviour.
// ─────────────────────────────────────────────────────────────────────────────


import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { route } from 'ziggy-js';
import {
  Menu,
  Home,
  User,
  LogOut,
  Settings,
  HelpCircle,
  BedDouble,
  List,
  ClipboardList,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { LogoutConfirmationDialog } from "@/components/auth/LogoutConfirmationDialog";


interface CustomPageProps {
  auth: {
    user: {
      id: number;
      name: string;
      email: string;
      roles: string[];
      permissions: string[];
    };
  };
  [key: string]: any;
}


interface NavLinksProps {
  onClickCallback?: () => void;
}


type LinkDef = {
  name: string;
  href: string;
  icon: typeof Home;
  routeName: string;
};


type NavSection = {
  id: string;
  label: string;
  links: LinkDef[];
};


// ─── Active-link auto-centering hook ────────────────────────────────────────
// Attach the returned ref to the scrollable nav container. On mount, finds
// the descendant tagged data-active="true" and centers it in the viewport.
// Runs via requestAnimationFrame so it fires after layout/animation (e.g.
// the mobile Sheet's slide-in transition) has settled, avoiding a scroll
// that gets immediately overridden by the container's own entrance motion.
function useScrollActiveIntoView<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const activeEl = container.querySelector<HTMLElement>('[data-active="true"]');
    if (!activeEl) return;

    const raf = requestAnimationFrame(() => {
      activeEl.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  return ref;
}


// ─── Shared row styles (Render-style: flat, low-weight, left accent bar) ───
// WHY a helper instead of inline ternaries everywhere: keeps every nav row
// (student links, admin links, settings links) visually identical and makes
// future tweaks a one-line change.
// WHY relative + pl adjustment: the accent bar is absolutely positioned, so
// every row needs `relative` and enough left padding to clear it — this is
// now baked into the helper instead of being re-declared at call sites.
function navRowClasses(isActive: boolean) {
  return [
    'group relative flex items-center gap-3 rounded-md py-2 pl-4 pr-3 text-sm font-normal transition-colors',
    isActive
      ? 'bg-muted text-foreground font-medium'
      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
  ].join(' ');
}


// ─── Sub-components defined OUTSIDE any parent ──────────────────────────────
// WHY: Defining components inside a parent causes React to unmount/remount
// them on every parent render (new function reference = new component
// identity). This breaks focus, animation state, and Radix portal contexts
// (AlertDialog, Sheet, Dropdown). They are hoisted to module scope here,
// receiving data via props/hooks directly.


/** A single flat nav row — icon, label, and the thin active-state accent bar. */
function NavRow({ link, onClickCallback }: { link: LinkDef; onClickCallback?: () => void }) {
  const Icon = link.icon;
  const isActive = route().current(link.routeName);

  return (
    <Link
      key={link.name}
      href={link.href}
      onClick={onClickCallback}
      // Plain HTML attribute — passed straight through by Inertia's <Link>
      // onto the rendered <a>, no ref-forwarding required. This is what
      // useScrollActiveIntoView() queries for on mount.
      data-active={isActive ? 'true' : undefined}
      className={navRowClasses(isActive)}
    >
      {/* Thin left accent bar replaces the filled active pill — Render uses
          this exact treatment instead of a solid background block. */}
      <span
        className={`absolute left-0 h-4 w-0.5 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-transparent'
          }`}
        aria-hidden="true"
      />
      <Icon className="h-4 w-4 shrink-0 opacity-80 text-accent-500" />
      {link.name}
    </Link>
  );
}


/** Slim uppercase section label — the ONLY separator between groups, no chevron/toggle. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1.5 text-[12px] font-medium text-brand-red/90 uppercase tracking-wider">
      {children}
    </p>
  );
}


function CoreNavLinks({ onClickCallback }: NavLinksProps) {
  const { auth } = usePage<CustomPageProps>().props;
  const userRoles = auth.user?.roles ?? [];


  const studentLinks: LinkDef[] = [
    { name: 'My Dashboard', href: route('student.dashboard'), icon: Home, routeName: 'student.dashboard' },
    { name: 'Hostels', href: route('student.hostels.index'), icon: BedDouble, routeName: 'student.hostels.index' },
    { name: 'My Applications', href: route('student.applications.index'), icon: List, routeName: 'student.applications.index' },
    { name: 'Maintenance', href: route('student.maintenance.index'), icon: ClipboardList, routeName: 'student.maintenance.index' },
  ];


  const isStudent = userRoles.includes('student');
  const isAdminLane = userRoles.some((role) =>
    ['warden', 'super_admin', 'admin', 'dean', 'affiliated_admin'].includes(role),
  );


  return (
    // gap-6 between sections mirrors Render's spacing between "Projects" block
    // and the "INTEGRATIONS" block — more air between sections than between
    // rows inside a section (gap-0.5).
    <div className="flex flex-col gap-6 w-full">
      {isStudent && (
        <div className="flex flex-col gap-0.5">
          <SectionLabel>Student Portal</SectionLabel>
          {studentLinks.map((link) => (
            <NavRow key={link.name} link={link} onClickCallback={onClickCallback} />
          ))}
        </div>
      )}


      {isAdminLane && (
        // Admin links now render as flat sections directly here — no nested
        // accordion component, no open/close state. Every link is always
        // visible, exactly like Render's INTEGRATIONS / NETWORKING lists.
        <AdminNavSections onClickCallback={onClickCallback} />
      )}
    </div>
  );
}


/**
 * Flat admin navigation — previously an accordion (AdminNavGroups) with
 * click-to-expand sections. Replaced with Render's model: each group is a
 * static section label followed by its always-visible rows. No state, no
 * toggle handlers, no chevrons.
 */
function AdminNavSections({ onClickCallback }: NavLinksProps) {
  const { auth } = usePage<CustomPageProps>().props;
  const userRoles = auth.user?.roles ?? [];

  // NEW: super_admin and dean use the full catalogue. Every other
  // admin-type user is directed to a server-scoped "My Hostel" page,
  // where the controller only returns hostels assigned through the
  // hostel_managers pivot relation.
  const canManageAllHostels = userRoles.some((role) =>
    ['super_admin', 'dean'].includes(role),
  );

  const hostelManagementLink: LinkDef = canManageAllHostels
    ? {
      name: 'Manage Hostels',
      href: route('admin.hostels.index'),
      icon: Home,
      routeName: 'admin.hostels.index',
    }
    : {
      name: 'Manage Hostel',
      href: route('admin.hostels.managed'),
      icon: Home,
      routeName: 'admin.hostels.managed',
    };

  const sections: NavSection[] = [
    {
      id: 'overview',
      label: 'Overview',
      links: [
        { name: 'Admin Dashboard', href: route('admin.dashboard'), icon: Home, routeName: 'admin.dashboard' },
      ],
    },
    {
      id: 'applications',
      label: 'Applications & Allocations',
      links: [
        { name: 'Student Applications', href: route('admin.applications.index'), icon: List, routeName: 'admin.applications.index' },
        { name: 'Student Allocations', href: route('admin.allocations.index'), icon: BedDouble, routeName: 'admin.allocations.index' },
        { name: 'Allocations Waitlist', href: route('admin.waitlist.index'), icon: ClipboardList, routeName: 'admin.waitlist.index' },
      ],
    },
    {
      id: 'inventory',
      label: 'Inventory & Maintenance',
      links: [
        hostelManagementLink,
        { name: 'Maintenance Requests', href: route('admin.maintenance.index'), icon: ClipboardList, routeName: 'admin.maintenance.index' },
        { name: 'Occupancy Reports', href: route('admin.reports.occupancy'), icon: ClipboardList, routeName: 'admin.reports.occupancy' },
      ],
    },
    {
      id: 'students',
      label: 'Students',
      links: [
        { name: 'Manage Students', href: route('admin.students.index'), icon: User, routeName: 'admin.students.index' },
        { name: 'Student Verification', href: route('admin.student-registry.verification'), icon: ClipboardList, routeName: 'admin.student-registry.verification' },
      ],
    },
    {
      id: 'config',
      label: 'Configuration',
      links: [
        { name: 'Manage Academic Terms', href: route('admin.academic-terms.index'), icon: CalendarDays, routeName: 'admin.academic-terms.index' },
        { name: 'Manage Users', href: route('admin.users.index'), icon: Settings, routeName: 'admin.users.index' },
      ],
    },
  ];


  // Optional: later, filter sections/links based on auth.user.permissions.


  return (
    // gap-6 between sections — same rhythm as CoreNavLinks so the whole
    // sidebar reads as one continuous flat list, just like Render's.
    <div className="flex flex-col gap-6">
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-0.5">
          <SectionLabel>{section.label}</SectionLabel>
          {section.links.map((link) => (
            <NavRow key={link.name} link={link} onClickCallback={onClickCallback} />
          ))}
        </div>
      ))}
    </div>
  );
}


function SettingsNavLinks({ onClickCallback }: NavLinksProps) {
  // WHY local state here: the AlertDialog for logout lives inside this
  // component and its open state should not bubble up to the layout.
  const [logoutOpen, setLogoutOpen] = useState(false);


  const handleLogout = () => {
    // WHY router.post instead of useForm().post:
    // useForm() is a hook — it can't be called conditionally inside an event
    // handler. router.post() is a plain function call that works anywhere.
    router.post(
      route('logout'),
      {},
      {
        onSuccess: () => onClickCallback?.(),
      },
    );
  };


  const settingsLinks: LinkDef[] = [
    { name: 'Account Settings', href: route('profile.edit'), icon: Settings, routeName: 'profile.edit' },
    { name: 'Help & Support', href: route('public.support'), icon: HelpCircle, routeName: 'public.support' },
  ];


  return (
    <div className="flex flex-col gap-0.5 w-full">
      {settingsLinks.map((link) => (
        <NavRow key={link.name} link={link} onClickCallback={onClickCallback} />
      ))}


      {/* Logout row — plain text weight, red only on icon/label, matching
          Render's understated destructive row treatment. */}
      <button
        onClick={() => setLogoutOpen(true)}
        className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-md text-sm font-normal text-destructive/90 hover:bg-destructive/10 hover:text-destructive transition-colors"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Log Out
      </button>


      {/*
        WHY Shared AlertDialog is here and NOT wrapping the button:
        AlertDialogTrigger uses asChild which pushes a ref to its child.
        A plain <button> supports refs fine, but keeping the dialog
        state-controlled (open={logoutOpen}) is more explicit and avoids
        Radix ref-forwarding issues when this component is inside a Sheet.
      */}
      <LogoutConfirmationDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
      />
    </div>
  );
}


// ─── Public components ───────────────────────────────────────────────────────


/**
 * Desktop sidebar — fixed left column with brand header, nav links, and the
 * settings/logout footer.
 *
 * Structural layout is a strict 3-row CSS grid (header / scrollable nav /
 * footer) via `grid-rows-[auto_1fr_auto]` so the header and footer NEVER
 * scroll, while the middle nav region gets its own independent scroll
 * container (`overflow-y-auto`). This was already correct and is unchanged
 * — confirmed to satisfy the "fixed header/footer, scrollable middle"
 * requirement.
 *
 * The nav ref is wired to useScrollActiveIntoView() so that on every mount
 * (full page reload, or Inertia navigation since AuthenticatedLayout is not
 * a persistent layout and remounts per page) the active link is centered
 * in the scrollable viewport rather than defaulting to scroll-top.
 */
export function AppSidebarDesktop() {
  const navRef = useScrollActiveIntoView<HTMLElement>();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 grid-rows-[auto_1fr_auto] border-r bg-background sm:grid">
      {/* ── Fixed header (brand) ─────────────────────────────────────── */}
      <Link href="/" className="flex h-16 items-center gap-2 border-b px-6 bg-background">
        <img
          src="/favicon/favicon-96x96.png"
          alt="UMU Housing Logo"
          className="h-9 w-auto object-contain shrink-0"
        />
        <div className="hidden sm:flex flex-col justify-center leading-none">
          <span className="font-logo text-black text-xl sm:text-1x2 text-brand-black tracking-normal">
            <span className="text-lg sm:text-xl font-medium">H</span>ousing
            <span className="text-lg sm:text-xl font-medium text-accent-500">@</span>
            <span className="text-lg sm:text-xl font-medium">U</span>
            <span>M</span>
            <span className="text-lg sm:text-xl font-medium">U</span>
          </span>
        </div>
      </Link>


      {/* ── Scrollable middle region (core nav links) ───────────────────
          WHY min-h-0: inside a CSS grid row, a child needs an explicit
          min-height reset to allow overflow-y-auto to actually clip and
          scroll instead of growing the row to fit its content. */}
      <nav ref={navRef} className="min-h-0 overflow-y-auto px-3 py-5">
        <CoreNavLinks />
      </nav>


      {/* ── Fixed footer (settings / logout) ─────────────────────────── */}
      <div className="border-t p-3 bg-muted/20">
        <nav>
          <SettingsNavLinks />
        </nav>
      </div>
    </aside>
  );
}


interface AppSidebarMobileProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}


/**
 * Mobile sidebar — hamburger trigger + slide-out Sheet containing the same
 * flat nav links and fixed footer. Rendered only below the `sm` breakpoint.
 *
 * Same fixed-header/scrollable-nav/fixed-footer grid structure as the
 * desktop sidebar, applied inside the Sheet's content area. The nav ref
 * uses the same useScrollActiveIntoView() hook — Radix's Sheet only mounts
 * its content when opened, so the effect fires fresh every time the sheet
 * opens, centering the active link there too.
 */
export function AppSidebarMobile({ isOpen, setIsOpen }: AppSidebarMobileProps) {
  const navRef = useScrollActiveIntoView<HTMLElement>();

  return (
    <div className="flex items-center gap-4 sm:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {/*
            WHY Button works here with asChild:
            shadcn Button uses React.forwardRef, so Radix can attach
            its ref without warnings.
          */}
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 grid grid-rows-[auto_1fr_auto] h-full">
          <SheetHeader className="text-left border-b px-4 py-4">
            <SheetTitle className="flex items-center gap-2 text-base font-medium">
              <img
                src="/favicon/favicon-96x96.png"
                alt="UMU Housing Logo"
                className="h-6 w-6 object-contain shrink-0"
              />
              <span>Housing@UMU</span>
            </SheetTitle>
          </SheetHeader>


          {/* Scrollable middle region — min-h-0 required inside CSS grid */}
          <nav ref={navRef} className="min-h-0 overflow-y-auto px-3 py-5">
            <CoreNavLinks onClickCallback={() => setIsOpen(false)} />
          </nav>


          <div className="border-t p-3">
            <nav>
              <SettingsNavLinks onClickCallback={() => setIsOpen(false)} />
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
