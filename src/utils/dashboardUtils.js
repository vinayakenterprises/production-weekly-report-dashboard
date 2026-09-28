// src/utils/dashboardUtils.js
// Utility functions for Production Dashboard

// Converts decimal hours (32.72) back to human-readable strings (32h 43m)
export const formatTime = (decimalHours) => {
  if (!decimalHours) return "0m";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

// Formats YYYY-MM-DD week strings into readable formats (e.g. "Jun 29, 2026")
export const formatWeekDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return dateStr;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

// Format single ISO date YYYY-MM-DD into "Jun 29, 2026"
export const formatIsoDateLabel = (isoStr) => {
  if (!isoStr) return "";
  const parts = isoStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return isoStr;
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return isoStr;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

// Format Date Range Label
export const formatDateRangeLabel = (startStr, endStr) => {
  if (!startStr && !endStr) return "All Available Dates";
  if (startStr && !endStr) return `From ${formatIsoDateLabel(startStr)}`;
  if (!startStr && endStr) return `Until ${formatIsoDateLabel(endStr)}`;
  if (startStr === endStr) return formatIsoDateLabel(startStr);
  return `${formatIsoDateLabel(startStr)} – ${formatIsoDateLabel(endStr)}`;
};

// Splits a combined fault category and specific cause string (e.g. "Category (Cause)")
export const splitFaultName = (fullName) => {
  if (!fullName) return { category: "Unspecified", cause: "-" };
  const matches = fullName.match(/^([^(]+)(?:\(([^)]+)\))?$/);
  if (!matches) return { category: fullName, cause: "-" };
  const category = matches[1].trim();
  const cause = matches[2] ? matches[2].trim() : "";
  return { category, cause };
};

// Map raw issue name to clean main issue name
export const getCleanMainIssue = (fullName) => {
  if (!fullName) return "";
  return fullName;
};

// True for the synthetic bucket the API emits when Mill Daily Data reports
// lost hours for a day but no logged row can be attributed to a cause.
export const isUnattributedIssue = (name) => !!name && name.startsWith("Unattributed");

// Issues excluded from the Operator & Issues Overview table and overview metrics
export const EXCLUDED_OVERVIEW_ISSUES = [
  "Scheduled Holds (Dross/Maintenance)",
  "Scheduled Holds",
  "Mechanical (Cuppling/Share Pin)",
  "Coiler Change",
  "Ingot unavailable",
  "Ingot Unavailable",
  "Other",
  "Others",
];

export const isExcludedOverviewIssue = (name) => {
  if (!name || typeof name !== "string") return false;
  const clean = name.trim().toLowerCase();
  return EXCLUDED_OVERVIEW_ISSUES.some(
    (item) => item.trim().toLowerCase() === clean,
  );
};

// Helper to get the Monday of the current week in YYYY-MM-DD format
export const getMondayOfCurrentWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(d.setDate(diff));
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Returns current calendar month in YYYY-MM format
export const getCurrentMonthKey = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
};

// Formats YYYY-MM into a friendly month label (e.g. "September 2026")
export const formatMonthLabel = (monthKey) => {
  if (!monthKey) return "";
  const parts = monthKey.split("-").map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) return monthKey;
  const [year, month] = parts;
  const d = new Date(year, month - 1, 1);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Gets sorted list of all available YYYY-MM months covered by weeklyData
export const getAvailableMonths = (weeklyData) => {
  if (!Array.isArray(weeklyData)) return [];
  const monthSet = new Set();
  const currentCalMonth = getCurrentMonthKey();

  weeklyData.forEach((w) => {
    if (!w.week) return;
    monthSet.add(w.week.substring(0, 7));
    const parts = w.week.split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const baseDate = new Date(parts[0], parts[1] - 1, parts[2]);
      for (let i = 0; i < 7; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        monthSet.add(`${yyyy}-${mm}`);
      }
    }
  });

  return Array.from(monthSet)
    .sort()
    .filter(
      (m) =>
        m <= currentCalMonth ||
        weeklyData.some((w) => w.week && w.week.startsWith(m)),
    );
};

// Finds the month (YYYY-MM) that has the majority of days in a week starting on startMondayStr
export const getWeekMajorityMonth = (startMondayStr) => {
  if (!startMondayStr) return "";
  const parts = startMondayStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN))
    return startMondayStr.substring(0, 7);
  const [year, month, day] = parts;
  const baseDate = new Date(year, month - 1, day);
  const monthCounts = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const monthStr = `${yyyy}-${mm}`;
    monthCounts[monthStr] = (monthCounts[monthStr] || 0) + 1;
  }
  return Object.keys(monthCounts).reduce((a, b) =>
    monthCounts[a] > monthCounts[b] ? a : b,
  );
};

// Checks if a week (starting on startMondayStr) has any of its 7 days in the target YYYY-MM month
export const doesWeekOverlapMonth = (startMondayStr, targetMonthStr) => {
  if (!startMondayStr || !targetMonthStr) return false;
  const parts = startMondayStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  const [year, month, day] = parts;
  const baseDate = new Date(year, month - 1, day);
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dayMonthStr = `${yyyy}-${mm}`;
    if (dayMonthStr === targetMonthStr) {
      return true;
    }
  }
  return false;
};

// Helper to add days to a YYYY-MM-DD date string and return YYYY-MM-DD
export const addDaysToStr = (dateStr, days) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Calculate difference in days between two YYYY-MM-DD strings (inclusive)
export const getDaysDifference = (startStr, endStr) => {
  if (!startStr || !endStr) return 0;
  const p1 = startStr.split("-").map(Number);
  const p2 = endStr.split("-").map(Number);
  if (p1.length !== 3 || p2.length !== 3) return 0;
  const d1 = new Date(p1[0], p1[1] - 1, p1[2]);
  const d2 = new Date(p2[0], p2[1] - 1, p2[2]);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays + 1 : 0;
};

// Flattens weeklyData array into a continuous daily array with exact YYYY-MM-DD ISO dates
export const normalizeAllDailyData = (weeklyData) => {
  if (!Array.isArray(weeklyData)) return [];

  const allDays = [];
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  weeklyData.forEach((w) => {
    if (!w.week) return;
    const parts = w.week.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return;
    const [year, month, day] = parts;
    const baseDate = new Date(year, month - 1, day, 12, 0, 0);

    const sourceBreakdown = w.dailyIssueBreakdown || [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const dayNum = d.getDate();
      const monthStr = months[d.getMonth()];
      const dateLabel = `${String(dayNum).padStart(2, "0")} ${monthStr}`;
      const dateLabelAlt = `${monthStr} ${String(dayNum).padStart(2, "0")}`;

      const record = sourceBreakdown.find((r) => {
        if (!r.date) return false;
        const normalized = r.date.trim().toLowerCase();
        return (
          normalized ===
            `${String(dayNum).padStart(2, "0")} ${monthStr}`.toLowerCase() ||
          normalized === `${dayNum} ${monthStr}`.toLowerCase() ||
          normalized ===
            `${monthStr} ${String(dayNum).padStart(2, "0")}`.toLowerCase() ||
          normalized === `${monthStr} ${dayNum}`.toLowerCase()
        );
      });

      allDays.push({
        dateStr,
        dateObj: d,
        weekday: weekdays[i],
        dateLabel,
        dateLabelAlt,
        productionHoursLost: record?.productionHoursLost ?? 0,
        issues: record?.issues ?? [],
      });
    }
  });

  allDays.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  // Deduplicate by dateStr
  const uniqueMap = new Map();
  allDays.forEach((day) => uniqueMap.set(day.dateStr, day));
  return Array.from(uniqueMap.values());
};
