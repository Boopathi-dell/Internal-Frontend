// Single source of truth for Admin Panel modules & Result Hub (Dashboard/Sidebar) pages.
// Any page added here automatically appears in Sidebar Navigation, Dashboard Cards, and Admin User Access checkboxes.

export const ADMIN_PANEL_TABS = [
  { id: "classes", label: "Class Setup" },
  { id: "roster", label: "Roster, Subjects & Staff" },
  { id: "access", label: "Mark Entry Access" },
  { id: "reports", label: "Mark Entry Reports" },
  { id: "users", label: "User Access" },
  { id: "activity", label: "Activity Logs" },
  { id: "recycle", label: "Recycle Bin" },
  { id: "eseList", label: "Uploaded Classes" },
  { id: "approvals", label: "Result Approvals" },
  { id: "extensions", label: "Extension Requests" },
  { id: "advisors", label: "Class Advisors" },
  { id: "announcements", label: "Notices" },
  { id: "security", label: "Security" },
  { id: "lettertemplate", label: "Letter Template" },
  { id: "reportsettings", label: "Report Settings" },
  { id: "seating", label: "Seating" },
  { id: "attendance-tracker", label: "Attendance Tracker" },
  { id: "internal-marks", label: "Internal Mark Templates" },
  { id: "timetable", label: "Time Table & Workload" }
];

export const RESULT_HUB_PAGES = [
  {
    id: "daily-attendance",
    label: "Daily Attendance",
    path: "/daily-attendance",
    iconKey: "calendar",
    desc: "View and manage daily attendance records.",
    color: "#0ea5e9",
    showInPrintAdmin: true
  },
  {
    id: "attendance",
    label: "Attendance Entry",
    path: "/attendance",
    iconKey: "usersOrEdit",
    desc: "Enter student attendance for classes.",
    color: "#8b5cf6",
    showInPrintAdmin: true
  },
  {
    id: "entry",
    label: "Mark Statement",
    dashboardTitle: "Mark Entry",
    path: "/entry",
    iconKey: "fileEdit",
    desc: "Securely input student marks with real-time validation and autosave.",
    color: "#10b981",
    showInPrintAdmin: true
  },
  {
    id: "internal-mark",
    label: "Internal Marks",
    path: "/internal-mark",
    iconKey: "fileEdit",
    desc: "Generate Theory & Lab internal mark sheets with auto calculations and print layouts.",
    color: "#6366f1",
    showInPrintAdmin: true
  },
  {
    id: "analysis",
    label: "Class Analysis",
    path: "/analysis",
    iconKey: "barChart",
    desc: "Generate statistical reports, overall pass rates, and performance trends.",
    color: "#0ea5e9",
    showInPrintAdmin: true
  },
  {
    id: "department-analysis",
    label: "Dept. Analysis",
    path: "/department-analysis",
    iconKey: "barChart",
    desc: "Analyze performance across the entire department.",
    color: "#6366f1",
    showInPrintAdmin: true
  },
  {
    id: "rank",
    label: "Rank List",
    path: "/rank",
    iconKey: "trophy",
    desc: "View automatically calculated student rankings based on weighted scores.",
    color: "#f59e0b",
    showInPrintAdmin: true
  },
  {
    id: "parent-letters",
    label: "Parent Letters",
    path: "/parent-letters",
    iconKey: "letter",
    desc: "Generate and manage letters to parents.",
    color: "#ef4444",
    showInPrintAdmin: true
  },
  {
    id: "timetable",
    label: "Time Table",
    path: "/timetable",
    iconKey: "calendar",
    desc: "View class, lab, and faculty timetable schedules.",
    color: "#14b8a6",
    showInPrintAdmin: false
  },
  {
    id: "requests",
    label: "Mark Requests",
    path: "/requests",
    iconKey: "requests",
    desc: "View and approve student mark correction requests.",
    color: "#f43f5e",
    showInPrintAdmin: true,
    hasPendingBadge: true
  }
];
