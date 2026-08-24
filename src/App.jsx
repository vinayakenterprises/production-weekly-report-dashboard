import { CirclePause, ClockFading, Scissors, TriangleAlert, User2, Check, ChevronRight, Activity, Calendar, Filter, RotateCcw, X } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

// UTILITY FUNCTIONS
// Converts decimal hours (32.72) back to human-readable strings (32h 43m)
const formatTime = (decimalHours) => {
  if (!decimalHours) return "0m";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

// Formats YYYY-MM-DD week strings into readable formats (e.g. "Jun 29, 2026")
const formatWeekDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return dateStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

// Format single ISO date YYYY-MM-DD into "Jun 29, 2026"
const formatIsoDateLabel = (isoStr) => {
  if (!isoStr) return "";
  const parts = isoStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return isoStr;
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return isoStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

// Format Date Range Label
const formatDateRangeLabel = (startStr, endStr) => {
  if (!startStr && !endStr) return "All Available Dates";
  if (startStr && !endStr) return `From ${formatIsoDateLabel(startStr)}`;
  if (!startStr && endStr) return `Until ${formatIsoDateLabel(endStr)}`;
  if (startStr === endStr) return formatIsoDateLabel(startStr);
  return `${formatIsoDateLabel(startStr)} – ${formatIsoDateLabel(endStr)}`;
};

// Splits a combined fault category and specific cause string (e.g. "Category (Cause)")
const splitFaultName = (fullName) => {
  if (!fullName) return { category: "Unspecified", cause: "-" };
  const matches = fullName.match(/^([^(]+)(?:\(([^)]+)\))?$/);
  if (!matches) return { category: fullName, cause: "-" };
  const category = matches[1].trim();
  const cause = matches[2] ? matches[2].trim() : "";
  return { category, cause };
};

// Map raw issue name to clean main issue name
const getCleanMainIssue = (fullName) => {
  if (!fullName) return "";
  return fullName;
};

// True for the synthetic bucket the API emits when Mill Daily Data reports
// lost hours for a day but no logged row can be attributed to a cause.
const isUnattributedIssue = (name) => !!name && name.startsWith("Unattributed");

// Helper to get the Monday of the current week in YYYY-MM-DD format
const getMondayOfCurrentWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(d.setDate(diff));
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Finds the month (YYYY-MM) that has the majority of days in a week starting on startMondayStr
const getWeekMajorityMonth = (startMondayStr) => {
  if (!startMondayStr) return "";
  const parts = startMondayStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return startMondayStr.substring(0, 7);
  const [year, month, day] = parts;
  const baseDate = new Date(year, month - 1, day);
  const monthCounts = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const monthStr = `${yyyy}-${mm}`;
    monthCounts[monthStr] = (monthCounts[monthStr] || 0) + 1;
  }
  return Object.keys(monthCounts).reduce((a, b) => monthCounts[a] > monthCounts[b] ? a : b);
};

// Checks if a week (starting on startMondayStr) has any of its 7 days in the target YYYY-MM month
const doesWeekOverlapMonth = (startMondayStr, targetMonthStr) => {
  if (!startMondayStr || !targetMonthStr) return false;
  const parts = startMondayStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  const [year, month, day] = parts;
  const baseDate = new Date(year, month - 1, day);
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dayMonthStr = `${yyyy}-${mm}`;
    if (dayMonthStr === targetMonthStr) {
      return true;
    }
  }
  return false;
};

// Helper to add days to a YYYY-MM-DD date string and return YYYY-MM-DD
const addDaysToStr = (dateStr, days) => {
  if (!dateStr) return "";
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Calculate difference in days between two YYYY-MM-DD strings (inclusive)
const getDaysDifference = (startStr, endStr) => {
  if (!startStr || !endStr) return 0;
  const p1 = startStr.split('-').map(Number);
  const p2 = endStr.split('-').map(Number);
  if (p1.length !== 3 || p2.length !== 3) return 0;
  const d1 = new Date(p1[0], p1[1] - 1, p1[2]);
  const d2 = new Date(p2[0], p2[1] - 1, p2[2]);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays + 1 : 0;
};

// Flattens weeklyData array into a continuous daily array with exact YYYY-MM-DD ISO dates
const normalizeAllDailyData = (weeklyData) => {
  if (!Array.isArray(weeklyData)) return [];

  const allDays = [];
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  weeklyData.forEach((w) => {
    if (!w.week) return;
    const parts = w.week.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return;
    const [year, month, day] = parts;
    const baseDate = new Date(year, month - 1, day);

    const sourceBreakdown = w.dailyIssueBreakdown || [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const dateLabel = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
      const dateLabelAlt = `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;

      let record = sourceBreakdown.find(r => r.date === dateLabel || r.date === dateLabelAlt);
      if (!record && sourceBreakdown[i]) {
        record = sourceBreakdown[i];
      }

      allDays.push({
        dateStr,
        dateObj: d,
        weekday: weekdays[i],
        dateLabel,
        dateLabelAlt,
        productionHoursLost: record?.productionHoursLost ?? 0,
        issues: record?.issues ?? []
      });
    }
  });

  allDays.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  // Deduplicate by dateStr
  const uniqueMap = new Map();
  allDays.forEach(day => uniqueMap.set(day.dateStr, day));
  return Array.from(uniqueMap.values());
};

export default function ProductionDashboard() {
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [filterMode, setFilterMode] = useState('week'); // 'week' or 'range'
  const [selectedWeek, setSelectedWeek] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Floating Popover Filter States
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  // Normalize all daily data across all weeks
  const allNormalizedDays = useMemo(() => normalizeAllDailyData(weeklyData), [weeklyData]);

  const minAvailableDate = allNormalizedDays.length > 0 ? allNormalizedDays[0].dateStr : '';
  const maxAvailableDate = allNormalizedDays.length > 0 ? allNormalizedDays[allNormalizedDays.length - 1].dateStr : '';

  // Get current majority month key for the selected week
  const currentMonthKey = useMemo(() => {
    return selectedWeek ? getWeekMajorityMonth(selectedWeek) : "";
  }, [selectedWeek]);

  // Filter weeks to only those belonging to the current selected week's month
  const currentMonthWeeks = useMemo(() => {
    if (!currentMonthKey) return weeklyData;
    const filtered = weeklyData.filter(w => w.week && doesWeekOverlapMonth(w.week, currentMonthKey));
    return filtered.length > 0 ? filtered : weeklyData;
  }, [weeklyData, currentMonthKey]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        const result = await response.json();
        if (result.status === 'success') {
          setWeeklyData(result.data);
          setLoading(false);

          if (result.data.length > 0) {
            const currentWeekMonday = getMondayOfCurrentWeek();
            const match = result.data.find(w => w.week === currentWeekMonday);
            let defaultWeekStr = '';

            if (match) {
              defaultWeekStr = match.week;
            } else {
              const pastWeeks = result.data.filter(w => w.week <= currentWeekMonday);
              if (pastWeeks.length > 0) {
                defaultWeekStr = pastWeeks[pastWeeks.length - 1].week;
              } else {
                defaultWeekStr = result.data[result.data.length - 1].week;
              }
            }

            setSelectedWeek(defaultWeekStr);
            setStartDate(defaultWeekStr);
            setEndDate(addDaysToStr(defaultWeekStr, 6));
            setTempStartDate(defaultWeekStr);
            setTempEndDate(addDaysToStr(defaultWeekStr, 6));
          }
        } else {
          throw new Error(result.message || 'Failed to fetch data');
        }
      } catch (err) {
        setLoading(false);
        setError(err.message);
      }
    };
    fetchData();
  }, [API_URL]);

  useEffect(() => {
    setExpandedDay(null);
  }, [startDate, endDate]);

  // Handle Week Selection Dropdown Change
  const handleWeekSelect = (weekStr) => {
    setSelectedWeek(weekStr);
    const s = weekStr;
    const e = addDaysToStr(weekStr, 6);
    setStartDate(s);
    setEndDate(e);
    setTempStartDate(s);
    setTempEndDate(e);
    setFilterMode('week');
    setDropdownOpen(false);
  };

  // Apply Filter from Popover Modal
  const handleApplyFilter = () => {
    let s = tempStartDate;
    let e = tempEndDate;
    if (s && e && s > e) {
      // Auto swap if start > end
      [s, e] = [e, s];
    }
    setStartDate(s);
    setEndDate(e);
    setFilterMode('range');
    setFilterPopoverOpen(false);
  };

  // Clear Filter from Popover Modal
  const handleClearFilter = () => {
    const s = selectedWeek || minAvailableDate;
    const e = addDaysToStr(s, 6) || maxAvailableDate;
    setStartDate(s);
    setEndDate(e);
    setTempStartDate(s);
    setTempEndDate(e);
    setFilterMode('week');
    setFilterPopoverOpen(false);
  };

  // Filtered daily entries based on active date range [startDate, endDate]
  const filteredDays = useMemo(() => {
    if (!startDate || !endDate) return allNormalizedDays;
    return allNormalizedDays.filter(d => d.dateStr >= startDate && d.dateStr <= endDate);
  }, [allNormalizedDays, startDate, endDate]);

  // Total production hours lost in range
  const totalProductionHoursLost = useMemo(() => {
    return filteredDays.reduce((sum, d) => sum + (d.productionHoursLost || 0), 0);
  }, [filteredDays]);

  // Total cuts in range
  const totalCuts = useMemo(() => {
    return filteredDays.reduce((sum, d) => {
      const dayCuts = (d.issues || []).reduce((iSum, issue) => iSum + (issue.cuts || 0), 0);
      return sum + dayCuts;
    }, 0);
  }, [filteredDays]);

  // Fault categories & top loss incident in range
  const whereTheHoursWent = useMemo(() => {
    const byCategory = {};
    filteredDays.forEach(day => {
      (day.issues || []).forEach(issue => {
        const cat = issue.name;
        if (!cat) return;
        if (!byCategory[cat]) {
          byCategory[cat] = { name: cat, hours: 0, occurrences: 0 };
        }
        byCategory[cat].hours += (issue.productionHoursLost || 0);
        byCategory[cat].occurrences += (issue.occurrences || 0);
      });
    });
    return Object.values(byCategory).sort((a, b) => b.hours - a.hours);
  }, [filteredDays]);

  const topFault = whereTheHoursWent.length > 0
    ? whereTheHoursWent[0]
    : { name: 'None', hours: 0, occurrences: 0 };

  const faultCategories = useMemo(() => {
    const catSet = new Set();
    filteredDays.forEach(day => {
      (day.issues || []).forEach(issue => {
        if (issue.name) catSet.add(issue.name);
      });
    });
    return Array.from(catSet);
  }, [filteredDays]);

  // Operator Rows matrix in range
  const operatorRows = useMemo(() => {
    const byName = {};
    filteredDays.forEach(day => {
      (day.issues || []).forEach(issue => {
        const cuts = issue.cuts || 0;
        const occurrences = issue.occurrences || 0;
        const operators = issue.operators && issue.operators.length > 0 ? issue.operators : ['Unattributed'];

        operators.forEach(opName => {
          if (!byName[opName]) {
            byName[opName] = { name: opName, total: 0, breakdown: {}, cuts: 0 };
          }
          byName[opName].total += occurrences;
          byName[opName].breakdown[issue.name] = (byName[opName].breakdown[issue.name] || 0) + occurrences;
          byName[opName].cuts += cuts;
        });
      });
    });
    return Object.values(byName).sort((a, b) => b.total - a.total);
  }, [filteredDays]);

  const topOperator = operatorRows.length > 0
    ? operatorRows[0]
    : { name: 'None', total: 0 };

  const mostFrequentIncident = useMemo(() => {
    let maxTotal = 0;
    let maxCategory = 'None';

    faultCategories.forEach(category => {
      const catTotal = operatorRows.reduce((sum, op) => sum + (op.breakdown?.[category] || 0), 0);
      if (catTotal > maxTotal) {
        maxTotal = catTotal;
        maxCategory = category;
      }
    });

    return { name: maxCategory, total: maxTotal };
  }, [faultCategories, operatorRows]);

  const maxDayHours = useMemo(() => {
    return Math.max(0, ...filteredDays.map(d => d.productionHoursLost));
  }, [filteredDays]);

  const hasAnyDailyIssues = filteredDays.some(d => d.issues && d.issues.length > 0);
  const daysCount = getDaysDifference(startDate, endDate);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div role="status">
            <svg aria-hidden="true" className="w-12 h-12 animate-spin text-gray-300 fill-indigo-600" viewBox="0 0 100 101" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
              <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 39.0409Z" fill="currentFill" />
            </svg>
            <span className="sr-only">Loading...</span>
          </div>
          <p className="text-sm text-gray-500 animate-pulse">Loading Production Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-xl text-red-600 border border-red-300 bg-red-50 p-6 rounded-lg shadow-xs">
          Error: {error}
        </div>
      </div>
    );
  }

  if (weeklyData.length === 0) return <div className="p-8 text-center text-gray-500">No production data available.</div>;

  return (
    <div className="min-h-screen text-gray-900 font-sans p-4 sm:p-8 bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER & TOP CONTROL BAR */}
        <header className="border-b border-gray-200 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1 text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Vinayak Enterprises</h1>
            <p className="text-gray-700 text-md font-bold">Production Analytics Dashboard</p>
          </div>

          {/* TOP CONTROLS MATCHING SCREENSHOT */}
          <div className="flex flex-wrap items-center gap-3">

            {/* Container with WEEK dropdown (showing weeks of current month) */}
            <div className="bg-gray-100/90 border border-gray-200/80 rounded-2xl px-3.5 py-1.5 flex items-center gap-2 shadow-2xs">
              <span className="text-xs font-black tracking-wider text-gray-500 uppercase">
                <Calendar size={18} />
              </span>
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="inline-flex items-center gap-x-2 rounded-lg bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-gray-800 shadow-xs ring-1 ring-inset ring-gray-200 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  <span>Week of {formatWeekDate(selectedWeek)}</span>
                  <svg className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.041l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setDropdownOpen(false)}></div>
                    <div className="absolute right-0 sm:left-0 z-30 mt-2 w-64 origin-top-left rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 py-1.5 focus:outline-none">
                      {currentMonthWeeks.map((w) => {
                        const isSelected = w.week === selectedWeek && filterMode === 'week';
                        return (
                          <button
                            key={w.week}
                            onClick={() => handleWeekSelect(w.week)}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between cursor-pointer ${isSelected ? 'bg-indigo-50 text-indigo-900 font-bold' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            <span>Week of {formatWeekDate(w.week)}</span>
                            {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* FILTER BUTTON & FLOATING POPOVER */}
            <div className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => {
                  setTempStartDate(startDate);
                  setTempEndDate(endDate);
                  setFilterPopoverOpen(!filterPopoverOpen);
                }}
                className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer ${filterMode === 'range' ? 'bg-indigo-700 ring-2 ring-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
              >
                <Filter className="size-4 text-white" />
                <span>Filter</span>
              </button>

              {/* FLOATING FILTER POPOVER CARD */}
              {filterPopoverOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setFilterPopoverOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 p-6 z-30 space-y-5 animate-in fade-in zoom-in-95 duration-150">

                    {/* START DATE FIELD */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 tracking-wider uppercase block">
                        START DATE
                      </label>
                      <div className="flex items-center gap-2.5 border border-gray-300 rounded-xl px-3.5 py-2.5 bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 shadow-2xs transition-all">
                        <Calendar className="size-4.5 text-gray-400 shrink-0" />
                        <input
                          type="date"
                          value={tempStartDate}
                          min={minAvailableDate}
                          max={maxAvailableDate}
                          onChange={(e) => setTempStartDate(e.target.value)}
                          className="w-full text-sm font-semibold text-gray-800 focus:outline-none bg-transparent cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* END DATE FIELD */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-gray-400 tracking-wider uppercase block">
                        END DATE
                      </label>
                      <div className="flex items-center gap-2.5 border border-gray-300 rounded-xl px-3.5 py-2.5 bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 shadow-2xs transition-all">
                        <Calendar className="size-4.5 text-gray-400 shrink-0" />
                        <input
                          type="date"
                          value={tempEndDate}
                          min={tempStartDate || minAvailableDate}
                          max={maxAvailableDate}
                          onChange={(e) => setTempEndDate(e.target.value)}
                          className="w-full text-sm font-semibold text-gray-800 focus:outline-none bg-transparent cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* POPOVER ACTIONS */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleClearFilter}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-extrabold hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer shadow-2xs"
                      >
                        Clear Filter
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyFilter}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-extrabold transition cursor-pointer shadow-md hover:shadow-lg"
                      >
                        Apply Filter
                      </button>
                    </div>

                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        {/* ACTIVE FILTER BADGE / INDICATOR (IF RANGE APPLIED) */}
        {filterMode === 'range' && (
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 text-indigo-900 px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xs">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-indigo-600" />
              <span>
                Active Filter Range: <span className="font-extrabold">{formatDateRangeLabel(startDate, endDate)}</span>
              </span>
              {daysCount > 0 && (
                <span className="bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded text-[10px] font-extrabold ml-1">
                  {daysCount} {daysCount === 1 ? 'Day' : 'Days'}
                </span>
              )}
            </div>
            <button
              onClick={handleClearFilter}
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-extrabold cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs transition"
            >
              <X className="size-3.5" />
              Clear Filter
            </button>
          </div>
        )}

        {/* CARDS SECTION */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800 capitalize">Total Hours Lost</span>
              <div className="bg-red-50 p-2 rounded-lg">
                <ClockFading className='text-red-500 size-6' />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xl font-black text-gray-900">
                {formatTime(totalProductionHoursLost)}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800 capitalize">Top Loss Incident</span>
              <div className="bg-amber-50 p-2 rounded-lg">
                <TriangleAlert className='text-amber-500 size-6' />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xl font-bold text-gray-900 truncate" title={topFault.name}>
                {topFault.name !== 'None' ? topFault.name : 'No Faults'}
              </p>
              {topFault.name !== 'None' ? (
                <span className="text-xs text-red-500 font-bold">
                  {formatTime(topFault.hours)} lost
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  No recorded incidents
                </span>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800 capitalize">Top Operator</span>
              <div className="bg-purple-50 p-2 rounded-lg">
                <User2 className='text-purple-500 size-6' />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xl font-black text-gray-900">
                {topOperator.name !== 'None' ? topOperator.name : 'N/A'}
              </p>
              {topOperator.name !== 'None' && (
                <span className="text-xs text-purple-600 font-bold">
                  {topOperator.total} incidents
                </span>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800 capitalize">Most Frequent Issue</span>
              <div className="bg-blue-50 p-2 rounded-lg">
                <Activity className='text-red-500 size-6' />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xl font-bold text-gray-900 truncate" title={mostFrequentIncident.name !== 'None' ? mostFrequentIncident.name : 'No Incidents'}>
                {mostFrequentIncident.name !== 'None' ? getCleanMainIssue(mostFrequentIncident.name) : 'No Incidents'}
              </p>
              {mostFrequentIncident.name !== 'None' ? (
                <span className="text-xs text-red-600 font-bold">
                  {mostFrequentIncident.total} {mostFrequentIncident.total === 1 ? 'incident' : 'incidents'}
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  No recorded incidents
                </span>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800 capitalize">Cuts In Range</span>
              <div className="bg-emerald-50 p-2 rounded-lg">
                <Scissors className='text-emerald-500 size-6' />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xl font-black tracking-tight text-gray-900">
                {totalCuts} cuts
              </p>
            </div>
          </div>
        </section>

        {/* OVERVIEW CONTENT */}
        {filteredDays.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center space-y-3">
            <Calendar className="size-10 text-gray-400 mx-auto" />
            <h3 className="text-base font-bold text-gray-800">No records found for selected date range</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              No daily production data exists between <span className="font-semibold text-gray-700">{formatIsoDateLabel(startDate)}</span> and <span className="font-semibold text-gray-700">{formatIsoDateLabel(endDate)}</span>. Please try adjusting your date filter range.
            </p>
            <button
              onClick={handleClearFilter}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-lg hover:bg-indigo-700 transition cursor-pointer shadow-xs"
            >
              <RotateCcw className="size-3.5" />
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Hours Lost Overview */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-white flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                  Daily Production Hours Lost Overview
                </h2>
              </div>

              {!hasAnyDailyIssues ? (
                <p className="text-gray-500 italic p-6">No specific faults recorded in this date range.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredDays.map((day) => {
                    const isExpanded = expandedDay === day.dateStr;
                    const hasIssues = day.issues.length > 0;
                    const isHighestDay = hasIssues && maxDayHours > 0 && day.productionHoursLost === maxDayHours;
                    const eventCount = day.issues.reduce((sum, i) => sum + i.occurrences, 0);

                    return (
                      <div key={day.dateStr} className="group flex flex-col">
                        <button
                          type="button"
                          onClick={() => hasIssues && setExpandedDay(isExpanded ? null : day.dateStr)}
                          disabled={!hasIssues}
                          aria-expanded={isExpanded}
                          className={`w-full flex items-center justify-between py-4 px-6 transition-colors duration-200 text-left focus:outline-none ${isHighestDay
                            ? `bg-amber-50/80 border-l-4 border-amber-500 ${isExpanded ? 'bg-amber-100/90' : ''} ${hasIssues ? 'hover:bg-amber-100/90 cursor-pointer' : ''}`
                            : `${hasIssues ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default bg-gray-50/50'} ${isExpanded ? 'bg-gray-50' : ''}`
                            }`}
                        >
                          <div className="flex items-center gap-4">
                            {hasIssues ? (
                              <ChevronRight
                                className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isHighestDay
                                  ? `text-amber-500 group-hover:text-amber-600 ${isExpanded ? 'rotate-90 text-amber-600' : ''}`
                                  : `text-gray-400 group-hover:text-blue-500 ${isExpanded ? 'rotate-90 text-blue-600' : ''}`
                                  }`}
                              />
                            ) : (
                              <span className="h-5 w-5 shrink-0" />
                            )}
                            <span className={`font-bold text-sm w-12 sm:w-16 ${hasIssues ? (isHighestDay ? 'text-amber-950' : 'text-gray-900') : 'text-gray-400'}`}>
                              {day.weekday}
                            </span>
                            <span className={`font-medium text-sm ${hasIssues ? (isHighestDay ? 'text-amber-800' : 'text-gray-600') : 'text-gray-400'}`}>
                              {formatIsoDateLabel(day.dateStr)}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 sm:gap-8">
                            {hasIssues ? (
                              <span className={`hidden sm:inline-flex items-center justify-center font-semibold px-2.5 py-1 rounded-full text-xs ${isHighestDay ? 'bg-amber-200/80 text-amber-900' : 'bg-blue-50 text-blue-700'}`}>
                                {eventCount} {eventCount === 1 ? 'event' : 'events'}
                              </span>
                            ) : (
                              <span className="hidden sm:inline text-gray-400 text-xs italic">No faults</span>
                            )}
                            <span className={`font-bold text-right ${hasIssues ? (isHighestDay ? 'text-amber-950' : 'text-gray-900') : 'text-gray-400'}`}>
                              {formatTime(day.productionHoursLost)}
                            </span>
                          </div>
                        </button>

                        <div
                          className={`transition-all duration-300 ease-in-out overflow-hidden bg-gray-50/50 ${isExpanded ? 'max-h-250 opacity-100 border-b border-gray-100' : 'max-h-0 opacity-0 pointer-events-none'
                            }`}
                        >
                          {/* Detailed Issues Table */}
                          <div className="mx-6 sm:mx-12 my-6 border border-gray-200 rounded-lg overflow-x-auto shadow-xs bg-white">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="px-5 py-3.5 font-semibold text-gray-600">Issue Description</th>
                                  <th className="px-5 py-3.5 font-semibold text-gray-600 text-center">Occurrences</th>
                                  <th className="px-5 py-3.5 font-semibold text-gray-600">Operator(s)</th>
                                  <th className="px-5 py-3.5 font-semibold text-gray-600 text-right">Cuts</th>
                                  <th className="px-5 py-3.5 font-semibold text-gray-600 text-right">Time Lost</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {day.issues.map((issue, idx) => {
                                  const unattributed = isUnattributedIssue(issue.name);
                                  return (
                                    <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                                      <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                          {unattributed ? (
                                            <TriangleAlert className="size-4 text-amber-500 shrink-0" />
                                          ) : (
                                            <CirclePause className="size-4 text-gray-400 shrink-0" />
                                          )}
                                          <span className={`font-semibold text-sm ${unattributed ? 'text-amber-700 italic' : 'text-gray-800'}`}>
                                            {issue.name}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-5 py-3.5 text-center">
                                        <span className="inline-flex items-center justify-center bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">
                                          {issue.occurrences}x
                                        </span>
                                      </td>
                                      <td className="px-5 py-3.5">
                                        <div className="flex flex-wrap gap-1.5">
                                          {(!issue.operators || issue.operators.length === 0) ? (
                                            <span className="text-gray-400 text-xs italic">Unknown</span>
                                          ) : (
                                            issue.operators.map((op) => (
                                              <span key={op} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded text-xs font-semibold">
                                                {op}
                                              </span>
                                            ))
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-5 py-3.5 text-right font-bold text-gray-700">
                                        {issue.cuts || 0}
                                      </td>
                                      <td className="px-5 py-3.5 text-right font-bold text-gray-700">
                                        {formatTime(issue.productionHoursLost)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Operator Matrix Table */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs overflow-hidden">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-3 mb-5">
                Operator & Issues Overview
              </h2>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-gray-200/60 border-b border-gray-300">
                      <th className="bg-gray-200 px-3 py-2.5 font-bold text-gray-700 uppercase tracking-wider text-[11px] rounded-l-lg border-r border-gray-300 wrap-break-word">Operator</th>
                      {faultCategories.length === 0 ? (
                        <th className="px-2 py-2.5 font-bold text-gray-700 uppercase tracking-wider text-[10px] text-center">Faults</th>
                      ) : (
                        faultCategories.map(category => {
                          const headerLabel = getCleanMainIssue(category);
                          return (
                            <th key={category} title={category} className="px-2 py-2.5 font-bold text-gray-700 tracking-wider text-[10px] text-center wrap-break-word leading-tight">
                              {headerLabel}
                            </th>
                          );
                        })
                      )}
                      <th className="px-2 py-2.5 font-bold text-gray-700 uppercase tracking-wider text-[10px] sm:text-[11px] text-right border-l border-gray-300 wrap-break-word leading-tight">Total Faults</th>
                      <th className="px-2 py-2.5 font-bold text-gray-700 uppercase tracking-wider text-[10px] sm:text-[11px] text-right rounded-r-lg wrap-break-word leading-tight">Total Cuts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {operatorRows.length === 0 ? (
                      <tr>
                        <td colSpan={faultCategories.length > 0 ? faultCategories.length + 3 : 4} className="px-4 py-8 text-center text-sm text-gray-500 italic">
                          No operator records found for this date range.
                        </td>
                      </tr>
                    ) : (
                      operatorRows.map((operator) => (
                        <tr key={operator.name} className="group hover:bg-gray-50/80 transition-colors">
                          <td className="px-3 py-2.5 font-bold text-gray-900 text-xs border-r border-gray-200 break-words">{operator.name}</td>
                          {faultCategories.map(category => {
                            const count = operator.breakdown ? (operator.breakdown[category] || 0) : 0;
                            return (
                              <td key={category} className="px-1.5 py-2.5 text-center">
                                {count > 0 ? (
                                  <span className="inline-flex items-center justify-center bg-orange-100 text-orange-800 font-extrabold px-2.5 py-0.5 rounded-md text-sm">
                                    {count}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 font-medium text-xs">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2.5 text-right font-extrabold text-gray-900 text-sm border-l border-gray-100">{operator.total}</td>
                          <td className="px-2 py-2.5 text-right font-extrabold text-gray-900 text-sm">{operator.cuts}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {operatorRows.length > 0 && (
                    <tfoot className="border-t-2 border-gray-300 bg-gray-100/90 font-bold">
                      <tr>
                        <td className="px-3 py-2.5 text-gray-900 font-extrabold text-xs uppercase border-r border-gray-300">Total</td>
                        {faultCategories.length === 0 ? (
                          <td className="px-2 py-2.5 text-center text-gray-900 font-extrabold text-sm">0</td>
                        ) : (
                          faultCategories.map(category => {
                            const catTotal = operatorRows.reduce((sum, op) => sum + (op.breakdown?.[category] || 0), 0);
                            const isMostFrequent = category === mostFrequentIncident.name && catTotal > 0;
                            return (
                              <td key={category} className="px-1.5 py-2.5 text-center">
                                {catTotal > 0 ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className={`inline-flex items-center justify-center font-extrabold px-2.5 py-0.5 rounded-md text-xs sm:text-sm ${isMostFrequent
                                      ? 'bg-red-600 text-white ring-2 ring-red-300'
                                      : 'bg-gray-200 text-gray-900'
                                      }`}>
                                      {catTotal}
                                    </span>
                                    {isMostFrequent && (
                                      <span className="text-[9px] font-bold text-red-600 uppercase tracking-tight leading-none">Most Frequent</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 font-medium text-xs">-</span>
                                )}
                              </td>
                            );
                          })
                        )}
                        <td className="px-2 py-2.5 text-right text-gray-900 font-extrabold text-base border-l border-gray-200">
                          {operatorRows.reduce((sum, op) => sum + (op.total || 0), 0)}
                        </td>
                        <td className="px-2 py-2.5 text-right text-gray-900 font-extrabold text-base">
                          {operatorRows.reduce((sum, op) => sum + (op.cuts || 0), 0)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}