// Shared (server + client + middleware). Pure data, no secrets.
export type Role = "manager" | "reception" | "operator" | "customer";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name, resolved in components/nav-icons.tsx
  roles: Role[];
}

const S: Role[] = ["manager", "reception", "operator"];
const MR: Role[] = ["manager", "reception"];

export const STAFF_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", roles: ["manager"] },
  { href: "/operations", label: "Live Operations", icon: "Activity", roles: MR },
  { href: "/walk-in", label: "Walk-in", icon: "UserPlus", roles: MR },
  { href: "/queue", label: "Queue", icon: "ListOrdered", roles: S },
  { href: "/my-bay", label: "My Jobs", icon: "Wrench", roles: ["operator"] },
  { href: "/bays", label: "Bays", icon: "Warehouse", roles: MR },
  { href: "/jobs", label: "Job Cards", icon: "ClipboardList", roles: S },
  { href: "/bookings", label: "Bookings", icon: "CalendarClock", roles: MR },
  { href: "/customers", label: "Customers", icon: "Users", roles: MR },
  { href: "/vehicles", label: "Vehicles", icon: "Car", roles: MR },
  { href: "/staff", label: "Staff", icon: "HardHat", roles: ["manager"] },
  { href: "/services", label: "Services", icon: "Sparkles", roles: ["manager"] },
  { href: "/pricing", label: "Pricing", icon: "BadgeIndianRupee", roles: ["manager"] },
  { href: "/payments", label: "Payments", icon: "Wallet", roles: MR },
  { href: "/notifications", label: "Notifications", icon: "Send", roles: MR },
  { href: "/packages", label: "Packages", icon: "Package", roles: MR },
  { href: "/reports", label: "Reports", icon: "BarChart3", roles: ["manager"] },
  { href: "/settings", label: "Settings", icon: "Settings", roles: ["manager"] },
];

export const PORTAL_NAV: NavItem[] = [
  { href: "/portal", label: "Home", icon: "Home", roles: ["customer"] },
  { href: "/portal/book", label: "Book Wash", icon: "CalendarPlus", roles: ["customer"] },
  { href: "/portal/vehicles", label: "Vehicles", icon: "Car", roles: ["customer"] },
  { href: "/portal/bookings", label: "Bookings", icon: "CalendarClock", roles: ["customer"] },
  { href: "/portal/history", label: "History", icon: "History", roles: ["customer"] },
  { href: "/portal/invoices", label: "Invoices", icon: "Receipt", roles: ["customer"] },
  { href: "/portal/packages", label: "Packages", icon: "Package", roles: ["customer"] },
  { href: "/portal/profile", label: "Profile", icon: "User", roles: ["customer"] },
];

/** Bottom navigation (mobile) per role. */
export const MOBILE_NAV: Record<Role, NavItem[]> = {
  operator: [
    { href: "/my-bay", label: "My Jobs", icon: "Wrench", roles: ["operator"] },
    { href: "/queue", label: "Queue", icon: "ListOrdered", roles: ["operator"] },
    { href: "/jobs", label: "History", icon: "ClipboardList", roles: ["operator"] },
    { href: "/profile", label: "Profile", icon: "User", roles: ["operator"] },
  ],
  manager: [
    { href: "/operations", label: "Live", icon: "Activity", roles: ["manager"] },
    { href: "/walk-in", label: "Walk-in", icon: "UserPlus", roles: ["manager"] },
    { href: "/queue", label: "Queue", icon: "ListOrdered", roles: ["manager"] },
    { href: "/dashboard", label: "Stats", icon: "LayoutDashboard", roles: ["manager"] },
    { href: "/more", label: "More", icon: "Menu", roles: ["manager"] },
  ],
  reception: [
    { href: "/operations", label: "Live", icon: "Activity", roles: ["reception"] },
    { href: "/walk-in", label: "Walk-in", icon: "UserPlus", roles: ["reception"] },
    { href: "/queue", label: "Queue", icon: "ListOrdered", roles: ["reception"] },
    { href: "/payments", label: "Payments", icon: "Wallet", roles: ["reception"] },
    { href: "/more", label: "More", icon: "Menu", roles: ["reception"] },
  ],
  customer: [
    { href: "/portal", label: "Home", icon: "Home", roles: ["customer"] },
    { href: "/portal/book", label: "Book", icon: "CalendarPlus", roles: ["customer"] },
    { href: "/portal/vehicles", label: "Vehicles", icon: "Car", roles: ["customer"] },
    { href: "/portal/history", label: "History", icon: "History", roles: ["customer"] },
    { href: "/portal/profile", label: "Profile", icon: "User", roles: ["customer"] },
  ],
};

export function navFor(role: Role): NavItem[] {
  return role === "customer" ? PORTAL_NAV : STAFF_NAV.filter((n) => n.roles.includes(role));
}

export function homeFor(role: Role): string {
  return role === "customer" ? "/portal" : role === "operator" ? "/my-bay" : role === "reception" ? "/operations" : "/dashboard";
}

/** Page-level access check used by middleware. Server routes re-check independently. */
export function canAccessPath(role: Role, path: string): boolean {
  if (path === "/profile" || path === "/more") return role !== "customer";
  if (path.startsWith("/portal")) return role === "customer";
  if (role === "customer") return false;
  const match = STAFF_NAV.filter((n) => path === n.href || path.startsWith(n.href + "/")).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
  return match ? match.roles.includes(role) : false;
}

/** Which job actions each role may perform (re-checked server-side in the API). */
export const JOB_ACTIONS: Record<Role, string[]> = {
  manager: ["assign", "unassign", "start", "pause", "resume", "finish", "qc_pass", "qc_fail", "ready", "deliver", "cancel", "payment", "refund", "invoice"],
  reception: ["assign", "unassign", "cancel", "payment", "refund", "deliver", "invoice", "ready"],
  operator: ["start", "pause", "resume", "finish", "qc_pass", "qc_fail", "ready"],
  customer: [],
};
