// src/components/CompanyDashboard.jsx
import {
  CirclePause,
  ClockFading,
  Scissors,
  TriangleAlert,
  User2,
  Check,
  ChevronLeft,
  ChevronRight,
  Activity,
  Calendar,
  Filter,
  RotateCcw,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  formatTime,
  formatWeekDate,
  formatIsoDateLabel,
  formatDateRangeLabel,
  getCleanMainIssue,
  isUnattributedIssue,
  isExcludedOverviewIssue,
  getMondayOfCurrentWeek,
  getCurrentMonthKey,
  formatMonthLabel,
  getAvailableMonths,
  getWeekMajorityMonth,
  doesWeekOverlapMonth,
  addDaysToStr,
  getDaysDifference,
  normalizeAllDailyData,
} from "../utils/dashboardUtils";

export default function CompanyDashboard({
  companyId = "vinayak",
  companyName = "Vinayak Enterprises",
  subtitle = "Production Analytics Dashboard",
  companySelector = null,
}) {
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter States
  const [filterMode, setFilterMode] = useState("week"); // 'week' or 'range'
  const [selectedWeek, setSelectedWeek] = useState("");
  const [activeMonth, setActiveMonth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Floating Popover Filter States
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);

  // Shift Selector Tab State for Operator & Issues Overview Table ('all' | 'Day' | 'Night')
  const [selectedShiftTab, setSelectedShiftTab] = useState("all");

  const API_URL = import.meta.env.VITE_API_URL;

  // Normalize all daily data across all weeks
  const allNormalizedDays = useMemo(
    () => normalizeAllDailyData(weeklyData),
    [weeklyData],
  );

  const minAvailableDate =
    allNormalizedDays.length > 0 ? allNormalizedDays[0].dateStr : "";
  const maxAvailableDate =
    allNormalizedDays.length > 0
      ? allNormalizedDays[allNormalizedDays.length - 1].dateStr
      : "";

  // Available unique months from dataset
  const availableMonths = useMemo(
    () => getAvailableMonths(weeklyData),
    [weeklyData],
  );

  // Active month key for weeks dropdown (e.g. "2026-09")
  const currentMonthKey = useMemo(() => {
    if (activeMonth) return activeMonth;
    const currentCalMonth = getCurrentMonthKey();
    if (
      weeklyData.some(
        (w) => w.week && doesWeekOverlapMonth(w.week, currentCalMonth),
      )
    ) {
      return currentCalMonth;
    }
    if (selectedWeek) return selectedWeek.substring(0, 7);
    return availableMonths[availableMonths.length - 1] || currentCalMonth;
  }, [activeMonth, selectedWeek, weeklyData, availableMonths]);

  // Filter weeks to only those belonging to or overlapping the current month (sorted in ascending order)
  const currentMonthWeeks = useMemo(() => {
    if (!currentMonthKey) return weeklyData;
    const filtered = weeklyData.filter(
      (w) => w.week && doesWeekOverlapMonth(w.week, currentMonthKey),
    );
    const sorted = [...(filtered.length > 0 ? filtered : weeklyData)].sort(
      (a, b) => a.week.localeCompare(b.week),
    );
    return sorted;
  }, [weeklyData, currentMonthKey]);

  const fetchData = async (showFullLoader = true) => {
    if (showFullLoader) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const url = `${API_URL}?company=${companyId}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.status === "success") {
        const data = result.data || [];
        setWeeklyData(data);
        setLoading(false);
        setIsRefreshing(false);

        if (data.length > 0) {
          const currentWeekMonday = getMondayOfCurrentWeek();
          const match = data.find((w) => w.week === currentWeekMonday);
          let defaultWeekStr = "";

          if (match) {
            defaultWeekStr = match.week;
          } else {
            const pastWeeks = data.filter((w) => w.week <= currentWeekMonday);
            if (pastWeeks.length > 0) {
              defaultWeekStr = pastWeeks[pastWeeks.length - 1].week;
            } else {
              defaultWeekStr = data[data.length - 1].week;
            }
          }

          setSelectedWeek(defaultWeekStr);
          setStartDate(defaultWeekStr);
          setEndDate(addDaysToStr(defaultWeekStr, 6));
          setTempStartDate(defaultWeekStr);
          setTempEndDate(addDaysToStr(defaultWeekStr, 6));
          setFilterMode("week");
          setDropdownOpen(false);
          setExpandedDay(null);
          setSelectedShiftTab("all");

          // Initialize activeMonth to current calendar month if overlapping data exists,
          // otherwise default to the selected week's month
          const currentCalMonth = getCurrentMonthKey();
          const hasCurrentMonth = data.some(
            (w) => w.week && doesWeekOverlapMonth(w.week, currentCalMonth),
          );
          if (hasCurrentMonth) {
            setActiveMonth(currentCalMonth);
          } else if (defaultWeekStr) {
            setActiveMonth(defaultWeekStr.substring(0, 7));
          } else {
            setActiveMonth(currentCalMonth);
          }
        } else {
          setSelectedWeek("");
          setStartDate("");
          setEndDate("");
          setTempStartDate("");
          setTempEndDate("");
        }
      } else {
        throw new Error(result.message || "Failed to fetch data");
      }
    } catch (err) {
      setLoading(false);
      setIsRefreshing(false);
      setError(err.message || "Failed to fetch data");
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [companyId, API_URL]);

  const handleRefresh = () => {
    fetchData(false);
  };

  // Handle Week Selection Dropdown Change
  const handleWeekSelect = (weekStr) => {
    setSelectedWeek(weekStr);
    const s = weekStr;
    const e = addDaysToStr(weekStr, 6);
    setStartDate(s);
    setEndDate(e);
    setTempStartDate(s);
    setTempEndDate(e);
    setFilterMode("week");
    setDropdownOpen(false);
    setExpandedDay(null);

    // If selected week does not overlap current activeMonth, sync activeMonth
    if (!doesWeekOverlapMonth(weekStr, currentMonthKey)) {
      setActiveMonth(weekStr.substring(0, 7));
    }
  };

  // Month navigation inside dropdown
  const handlePrevMonth = (e) => {
    e.stopPropagation();
    const idx = availableMonths.indexOf(currentMonthKey);
    if (idx > 0) {
      setActiveMonth(availableMonths[idx - 1]);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    const idx = availableMonths.indexOf(currentMonthKey);
    if (idx >= 0 && idx < availableMonths.length - 1) {
      setActiveMonth(availableMonths[idx + 1]);
    }
  };

  // Apply Filter from Popover Modal
  const handleApplyFilter = () => {
    let s = tempStartDate;
    let e = tempEndDate;
    if (s && e && s > e) {
      [s, e] = [e, s];
    }
    setStartDate(s);
    setEndDate(e);
    setFilterMode("range");
    setFilterPopoverOpen(false);
    setExpandedDay(null);
  };

  // Clear Filter from Popover Modal
  const handleClearFilter = () => {
    const s = selectedWeek || minAvailableDate;
    const e = addDaysToStr(s, 6) || maxAvailableDate;
    setStartDate(s);
    setEndDate(e);
    setTempStartDate(s);
    setTempEndDate(e);
    setFilterMode("week");
    setFilterPopoverOpen(false);
    setExpandedDay(null);
  };

  // Filtered daily entries based on active date range [startDate, endDate]
  const filteredDays = useMemo(() => {
    if (!startDate || !endDate) return allNormalizedDays;
    return allNormalizedDays.filter(
      (d) => d.dateStr >= startDate && d.dateStr <= endDate,
    );
  }, [allNormalizedDays, startDate, endDate]);

  // Total production hours lost in range
  const totalProductionHoursLost = useMemo(() => {
    return filteredDays.reduce(
      (sum, d) => sum + (d.productionHoursLost || 0),
      0,
    );
  }, [filteredDays]);

  // Total cuts in range (from weeklyData.totalCuts or operatorRows)
  const totalCuts = useMemo(() => {
    let apiTotalCuts = 0;
    let hasWeeklyTotalCuts = false;

    weeklyData.forEach((w) => {
      if (!w.week || typeof w.totalCuts !== "number") return;
      const weekParts = w.week.split("-").map(Number);
      if (weekParts.length !== 3) return;
      const weekStart = new Date(weekParts[0], weekParts[1] - 1, weekParts[2]);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const matchesFilter = filteredDays.some(
        (d) => d.dateObj >= weekStart && d.dateObj <= weekEnd,
      );
      if (matchesFilter) {
        hasWeeklyTotalCuts = true;
        apiTotalCuts += w.totalCuts;
      }
    });

    if (hasWeeklyTotalCuts) {
      return apiTotalCuts;
    }

    return filteredDays.reduce((sum, d) => {
      const dayCuts = (d.issues || []).reduce(
        (iSum, issue) => iSum + (issue.cuts || 0),
        0,
      );
      return sum + dayCuts;
    }, 0);
  }, [filteredDays, weeklyData]);

  // Fault categories & top loss incident in range (excluding overview excluded issues)
  const whereTheHoursWent = useMemo(() => {
    const byCategory = {};
    filteredDays.forEach((day) => {
      (day.issues || []).forEach((issue) => {
        const cat = issue.name;
        if (!cat || isExcludedOverviewIssue(cat)) return;
        if (!byCategory[cat]) {
          byCategory[cat] = { name: cat, hours: 0, occurrences: 0 };
        }
        byCategory[cat].hours += issue.productionHoursLost || 0;
        byCategory[cat].occurrences += issue.occurrences || 0;
      });
    });
    return Object.values(byCategory).sort((a, b) => b.hours - a.hours);
  }, [filteredDays]);

  const topFault =
    whereTheHoursWent.length > 0
      ? whereTheHoursWent[0]
      : { name: "None", hours: 0, occurrences: 0 };

  const faultCategories = useMemo(() => {
    return whereTheHoursWent
      .filter((item) => !isUnattributedIssue(item.name))
      .map((item) => item.name);
  }, [whereTheHoursWent]);

  // Operator Rows matrix in range
  const operatorRows = useMemo(() => {
    const byName = {};

    const normalizeOpName = (name) => {
      if (!name) return "Unattributed";
      const trimmed = String(name).trim();
      if (
        trimmed.toLowerCase() === "uncommented" ||
        trimmed.toLowerCase() === "unknown"
      )
        return "Unattributed";
      if (trimmed.includes("/")) {
        return trimmed
          .split("/")
          .map((part) => {
            const p = part.trim();
            return p.charAt(0).toUpperCase() + p.slice(1);
          })
          .join(" / ");
      }
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    };

    const getOrCreateOp = (rawName) => {
      const normName = normalizeOpName(rawName);
      const existingKey = Object.keys(byName).find(
        (k) => k.toLowerCase() === normName.toLowerCase(),
      );
      const targetKey = existingKey || normName;
      if (!byName[targetKey]) {
        byName[targetKey] = {
          name: targetKey,
          total: 0,
          breakdown: {},
          cuts: 0,
          hoursLost: 0,
          shiftCounts: { Day: 0, Night: 0 },
        };
      }
      return byName[targetKey];
    };

    // Find weeks matching current filteredDays
    const matchingWeeks = weeklyData.filter((w) => {
      if (!w.week) return false;
      const weekParts = w.week.split("-").map(Number);
      if (weekParts.length !== 3) return false;
      const weekStart = new Date(weekParts[0], weekParts[1] - 1, weekParts[2]);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return filteredDays.some(
        (d) => d.dateObj >= weekStart && d.dateObj <= weekEnd,
      );
    });

    const hasOperatorMatrix = matchingWeeks.some(
      (w) => Array.isArray(w.operatorMatrix) && w.operatorMatrix.length > 0,
    );

    if (hasOperatorMatrix) {
      // Use exact individual operator data provided by API in operatorMatrix
      matchingWeeks.forEach((w) => {
        (w.operatorMatrix || []).forEach((op) => {
          if (!op.name) return;
          const entry = getOrCreateOp(op.name);

          // 1. Process exact hours lost per issue
          if (op.hoursLostByIssue && typeof op.hoursLostByIssue === "object") {
            Object.entries(op.hoursLostByIssue).forEach(([issueName, hrs]) => {
              if (
                !issueName ||
                isExcludedOverviewIssue(issueName) ||
                isUnattributedIssue(issueName)
              )
                return;
              entry.hoursLost += Number(hrs) || 0;
            });
          } else if (typeof op.hoursLost === "number" && op.hoursLost > 0) {
            entry.hoursLost += op.hoursLost;
          }

          // 2. Process occurrences breakdown
          if (op.breakdown && typeof op.breakdown === "object") {
            Object.entries(op.breakdown).forEach(([issueName, count]) => {
              if (
                !issueName ||
                isExcludedOverviewIssue(issueName) ||
                isUnattributedIssue(issueName)
              )
                return;
              const c = Number(count) || 0;
              entry.breakdown[issueName] =
                (entry.breakdown[issueName] || 0) + c;
              entry.total += c;
            });
          }

          // 3. Shifts from operatorMatrix
          if (Array.isArray(op.shifts)) {
            op.shifts.forEach((s) => {
              if (!s) return;
              const str = String(s).trim();
              const normalized =
                str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
              if (normalized === "Day" || normalized === "Night") {
                entry.shiftCounts[normalized] =
                  (entry.shiftCounts[normalized] || 0) + 1;
              }
            });
          }
        });

        // 4. Cuts from operatorCuts
        if (Array.isArray(w.operatorCuts)) {
          w.operatorCuts.forEach((oc) => {
            if (!oc.name) return;
            const entry = getOrCreateOp(oc.name);
            entry.cuts += oc.cuts || 0;
          });
        }
      });

      // 5. Supplement shifts from daily breakdown in case op.shifts was unpopulated in historical records
      filteredDays.forEach((day) => {
        (day.issues || []).forEach((issue) => {
          let rawShifts = [];
          if (Array.isArray(issue.shifts) && issue.shifts.length > 0) {
            rawShifts = issue.shifts;
          } else if (typeof issue.shifts === "string" && issue.shifts.trim()) {
            rawShifts = [issue.shifts.trim()];
          } else if (typeof issue.shift === "string" && issue.shift.trim()) {
            rawShifts = [issue.shift.trim()];
          } else if (Array.isArray(issue.shift) && issue.shift.length > 0) {
            rawShifts = issue.shift;
          }

          const rawOperators =
            issue.operators && issue.operators.length > 0
              ? issue.operators
              : [];

          rawOperators.forEach((opName, opIdx) => {
            if (!opName) return;
            const entry = getOrCreateOp(opName);
            const opDetail =
              issue.operatorDetails?.find(
                (d) =>
                  d.name?.trim().toLowerCase() === opName.trim().toLowerCase(),
              ) || issue.operatorDetails?.[opIdx];

            const opShifts =
              opDetail &&
              Array.isArray(opDetail.shifts) &&
              opDetail.shifts.length > 0
                ? opDetail.shifts
                : rawShifts;

            opShifts.forEach((s) => {
              if (!s) return;
              const str = String(s).trim();
              const normalized =
                str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
              if (normalized === "Day" || normalized === "Night") {
                entry.shiftCounts[normalized] =
                  (entry.shiftCounts[normalized] || 0) + 1;
              }
            });
          });
        });
      });
    } else {
      // Fallback: Legacy daily breakdown calculation
      filteredDays.forEach((day) => {
        (day.issues || []).forEach((issue) => {
          if (!issue.name || isExcludedOverviewIssue(issue.name)) return;
          const occurrences = issue.occurrences || 0;
          const hours = issue.productionHoursLost || 0;

          let rawShifts = [];
          if (Array.isArray(issue.shifts) && issue.shifts.length > 0) {
            rawShifts = issue.shifts;
          } else if (typeof issue.shifts === "string" && issue.shifts.trim()) {
            rawShifts = [issue.shifts.trim()];
          } else if (typeof issue.shift === "string" && issue.shift.trim()) {
            rawShifts = [issue.shift.trim()];
          } else if (Array.isArray(issue.shift) && issue.shift.length > 0) {
            rawShifts = issue.shift;
          }

          const rawOperators =
            issue.operators && issue.operators.length > 0
              ? issue.operators
              : ["Unattributed"];

          const operators = rawOperators.map(normalizeOpName);

          operators.forEach((opName, opIdx) => {
            const entry = getOrCreateOp(opName);
            const originalOpName = rawOperators[opIdx] || opName;
            const opDetail =
              issue.operatorDetails?.find(
                (d) =>
                  d.name?.trim().toLowerCase() === originalOpName.toLowerCase(),
              ) || issue.operatorDetails?.[opIdx];

            const opShifts =
              opDetail &&
              Array.isArray(opDetail.shifts) &&
              opDetail.shifts.length > 0
                ? opDetail.shifts
                : rawShifts;

            const opOccurrences =
              opDetail &&
              Array.isArray(opDetail.shifts) &&
              opDetail.shifts.length > 0
                ? opDetail.shifts.length
                : occurrences / operators.length;

            entry.total += opOccurrences;
            entry.breakdown[issue.name] =
              (entry.breakdown[issue.name] || 0) + opOccurrences;

            const proportion =
              occurrences > 0
                ? opOccurrences / occurrences
                : 1 / operators.length;

            const actualOpHours =
              typeof opDetail?.productionHoursLost === "number"
                ? opDetail.productionHoursLost
                : typeof opDetail?.hoursLost === "number"
                ? opDetail.hoursLost
                : typeof opDetail?.hours === "number"
                ? opDetail.hours
                : hours * proportion;

            entry.hoursLost += actualOpHours;

            opShifts.forEach((s) => {
              if (!s) return;
              const str = String(s).trim();
              const normalized =
                str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
              if (normalized === "Day" || normalized === "Night") {
                entry.shiftCounts[normalized] =
                  (entry.shiftCounts[normalized] || 0) + 1;
              }
            });
          });
        });
      });

      let hasExactAPICuts = false;
      matchingWeeks.forEach((w) => {
        if (Array.isArray(w.operatorCuts) && w.operatorCuts.length > 0) {
          hasExactAPICuts = true;
          w.operatorCuts.forEach((oc) => {
            if (!oc.name) return;
            const entry = getOrCreateOp(oc.name);
            entry.cuts += oc.cuts || 0;
          });
        }
      });

      if (!hasExactAPICuts) {
        filteredDays.forEach((day) => {
          (day.issues || []).forEach((issue) => {
            if (!issue.name || isExcludedOverviewIssue(issue.name)) return;
            const cuts = issue.cuts || 0;
            const occurrences = issue.occurrences || 0;
            const rawOperators =
              issue.operators && issue.operators.length > 0
                ? issue.operators
                : ["Unattributed"];
            const operators = rawOperators.map(normalizeOpName);

            operators.forEach((opName, opIdx) => {
              const entry = getOrCreateOp(opName);
              const originalOpName = rawOperators[opIdx] || opName;
              const opDetail =
                issue.operatorDetails?.find(
                  (d) =>
                    d.name?.trim().toLowerCase() === originalOpName.toLowerCase(),
                ) || issue.operatorDetails?.[opIdx];
              const opOccurrences =
                opDetail &&
                Array.isArray(opDetail.shifts) &&
                opDetail.shifts.length > 0
                  ? opDetail.shifts.length
                  : occurrences / operators.length;
              const proportion =
                occurrences > 0
                  ? opOccurrences / occurrences
                  : 1 / operators.length;
              entry.cuts += cuts * proportion;
            });
          });
        });
      }
    }

    Object.values(byName).forEach((op) => {
      op.cuts = Math.round(op.cuts);
      op.total = Math.round(op.total);
      if (op.breakdown) {
        Object.keys(op.breakdown).forEach((k) => {
          op.breakdown[k] = Math.round(op.breakdown[k]);
        });
      }
    });

    return Object.values(byName)
      .filter((op) => op.total > 0 || op.cuts > 0 || op.hoursLost > 0)
      .sort(
        (a, b) =>
          b.cuts - a.cuts || b.hoursLost - a.hoursLost || b.total - a.total,
      );
  }, [filteredDays, weeklyData]);

  // Filter operator rows by selectedShiftTab ('all' | 'Day' | 'Night')
  const displayedOperatorRows = useMemo(() => {
    if (selectedShiftTab === "Day") {
      return operatorRows.filter((op) => (op.shiftCounts?.Day || 0) > 0);
    }
    if (selectedShiftTab === "Night") {
      return operatorRows.filter((op) => (op.shiftCounts?.Night || 0) > 0);
    }
    return operatorRows;
  }, [operatorRows, selectedShiftTab]);

  const topOperator =
    operatorRows.length > 0 ? operatorRows[0] : { name: "None", total: 0 };

  const mostFrequentIncident = useMemo(() => {
    let maxTotal = 0;
    let maxCategory = "None";

    faultCategories.forEach((category) => {
      const catTotal = operatorRows.reduce(
        (sum, op) => sum + (op.breakdown?.[category] || 0),
        0,
      );
      if (catTotal > maxTotal) {
        maxTotal = catTotal;
        maxCategory = category;
      }
    });

    return { name: maxCategory, total: maxTotal };
  }, [faultCategories, operatorRows]);

  const maxDayHours = useMemo(() => {
    return Math.max(0, ...filteredDays.map((d) => d.productionHoursLost));
  }, [filteredDays]);

  const maxDayCuts = useMemo(() => {
    if (filteredDays.length === 0) return 0;
    return Math.max(
      0,
      ...filteredDays.map((d) =>
        (d.issues || []).reduce((sum, i) => sum + (i.cuts || 0), 0),
      ),
    );
  }, [filteredDays]);

  const hasAnyDailyIssues = filteredDays.some(
    (d) => d.issues && d.issues.length > 0,
  );
  const daysCount = getDaysDifference(startDate, endDate);

  return (
    <div className="space-y-6">
      {/* HEADER & TOP CONTROL BAR */}
      <header className="border-b border-gray-200 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1 text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            {companyName}
          </h1>
          <p className="text-gray-700 text-md font-bold">{subtitle}</p>
        </div>

        {/* Top Controls */}
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
                disabled={loading || weeklyData.length === 0}
                className="inline-flex items-center gap-x-2 rounded-lg bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-gray-800 shadow-xs ring-1 ring-inset ring-gray-200 hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-60"
              >
                <span>Week of {formatWeekDate(selectedWeek)}</span>
                <svg
                  className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.041l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setDropdownOpen(false)}
                  ></div>
                  <div className="absolute right-0 sm:left-0 z-30 mt-2 w-64 origin-top-left rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 py-1.5 focus:outline-none">
                    {currentMonthWeeks.map((w) => {
                      const isSelected =
                        w.week === selectedWeek && filterMode === "week";
                      return (
                        <button
                          key={w.week}
                          type="button"
                          onClick={() => handleWeekSelect(w.week)}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-indigo-50 text-indigo-900 font-bold"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span>Week of {formatWeekDate(w.week)}</span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-indigo-600" />
                          )}
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
              disabled={loading || weeklyData.length === 0}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-60 ${
                filterMode === "range"
                  ? "bg-indigo-700 ring-2 ring-indigo-300"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              <Filter className="size-4 text-white" />
              <span>Filter</span>
            </button>

            {/* FLOATING FILTER POPOVER CARD */}
            {filterPopoverOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setFilterPopoverOpen(false)}
                ></div>
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
                      Clear filter
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyFilter}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-extrabold transition cursor-pointer shadow-md hover:shadow-lg"
                    >
                      Apply filter
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* COMPANY SELECTOR TABS AFTER TITLE */}
      {companySelector}

      {/* DASHBOARD BODY (LOADING / ERROR / EMPTY / DATA) */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin"></div>
          <p className="text-sm font-semibold text-gray-500 animate-pulse">
            Loading {companyName} data...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center justify-between shadow-xs">
          <div>
            <span className="font-bold">
              Error loading {companyName} data:{" "}
            </span>
            {error}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-3.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 cursor-pointer shadow-xs"
          >
            Retry
          </button>
        </div>
      ) : weeklyData.length === 0 ? (
        <div className="py-16 text-center text-gray-500 bg-white rounded-2xl border border-gray-200/80 shadow-xs font-medium">
          No production data available for {companyName}.
        </div>
      ) : (
        <>
          {/* ACTIVE FILTER BADGE / INDICATOR (IF RANGE APPLIED) */}
          {filterMode === "range" && (
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 text-indigo-900 px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xs">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-indigo-600" />
                <span>
                  Active filter range:{" "}
                  <span className="font-extrabold">
                    {formatDateRangeLabel(startDate, endDate)}
                  </span>
                </span>
                {daysCount > 0 && (
                  <span className="bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded text-[10px] font-extrabold ml-1">
                    {daysCount} {daysCount === 1 ? "day" : "days"}
                  </span>
                )}
              </div>
              <button
                onClick={handleClearFilter}
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-extrabold cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs transition"
              >
                <X className="size-3.5" />
                Clear filter
              </button>
            </div>
          )}

          {/* CARDS SECTION */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-800">
                  Total Hours Lost
                </span>
                <div className="bg-red-50 p-2 rounded-lg">
                  <ClockFading className="text-red-500 size-6" />
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
                <span className="text-sm font-bold text-gray-800">
                  Top Loss Incident
                </span>
                <div className="bg-amber-50 p-2 rounded-lg">
                  <TriangleAlert className="text-amber-500 size-6" />
                </div>
              </div>
              <div className="mt-4">
                <p
                  className="text-xl font-bold text-gray-900 truncate"
                  title={topFault.name}
                >
                  {topFault.name !== "None" ? topFault.name : "No faults"}
                </p>
                {topFault.name !== "None" ? (
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
                <span className="text-sm font-bold text-gray-800">
                  Top Operator
                </span>
                <div className="bg-purple-50 p-2 rounded-lg">
                  <User2 className="text-purple-500 size-6" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-black text-gray-900">
                  {topOperator.name !== "None" ? topOperator.name : "N/A"}
                </p>
                {topOperator.name !== "None" && (
                  <span className="text-xs text-purple-600 font-bold">
                    {topOperator.total}{" "}
                    {topOperator.total === 1 ? "incident" : "incidents"}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-800">
                  Most Frequent Issue
                </span>
                <div className="bg-blue-50 p-2 rounded-lg">
                  <Activity className="text-red-500 size-6" />
                </div>
              </div>
              <div className="mt-4">
                <p
                  className="text-xl font-bold text-gray-900 truncate"
                  title={
                    mostFrequentIncident.name !== "None"
                      ? mostFrequentIncident.name
                      : "No incidents"
                  }
                >
                  {mostFrequentIncident.name !== "None"
                    ? getCleanMainIssue(mostFrequentIncident.name)
                    : "No incidents"}
                </p>
                {mostFrequentIncident.name !== "None" ? (
                  <span className="text-xs text-red-600 font-bold">
                    {mostFrequentIncident.total}{" "}
                    {mostFrequentIncident.total === 1
                      ? "incident"
                      : "incidents"}
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
                <span className="text-sm font-bold text-gray-800">
                  Cuts In Range
                </span>
                <div className="bg-emerald-50 p-2 rounded-lg">
                  <Scissors className="text-emerald-500 size-6" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-black tracking-tight text-gray-900">
                  {totalCuts} {totalCuts === 1 ? "cut" : "cuts"}
                </p>
              </div>
            </div>
          </section>

          {/* OVERVIEW CONTENT */}
          {filteredDays.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center space-y-3">
              <Calendar className="size-10 text-gray-400 mx-auto" />
              <h3 className="text-base font-bold text-gray-800">
                No records found for selected date range
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                No daily production data exists between{" "}
                <span className="font-semibold text-gray-700">
                  {formatIsoDateLabel(startDate)}
                </span>{" "}
                and{" "}
                <span className="font-semibold text-gray-700">
                  {formatIsoDateLabel(endDate)}
                </span>
                . Please try adjusting your date filter range.
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
                    DAILY PRODUCTION HOURS LOST OVERVIEW
                  </h2>
                </div>

                {!hasAnyDailyIssues ? (
                  <p className="text-gray-500 italic p-6">
                    No specific faults recorded in this date range.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredDays.map((day) => {
                      const isExpanded = expandedDay === day.dateStr;
                      const hasIssues = day.issues.length > 0;
                      const isHighestDay =
                        hasIssues &&
                        maxDayHours > 0 &&
                        day.productionHoursLost === maxDayHours;
                      const eventCount = day.issues.reduce(
                        (sum, i) => sum + i.occurrences,
                        0,
                      );

                      return (
                        <div key={day.dateStr} className="group flex flex-col">
                          <button
                            type="button"
                            onClick={() =>
                              hasIssues &&
                              setExpandedDay(isExpanded ? null : day.dateStr)
                            }
                            disabled={!hasIssues}
                            aria-expanded={isExpanded}
                            className={`w-full flex items-center justify-between py-4 px-6 transition-colors duration-200 text-left focus:outline-none ${
                              isHighestDay
                                ? `bg-amber-50/80 border-l-4 border-amber-500 ${isExpanded ? "bg-amber-100/90" : ""} ${hasIssues ? "hover:bg-amber-100/90 cursor-pointer" : ""}`
                                : `${hasIssues ? "hover:bg-gray-50 cursor-pointer" : "cursor-default bg-gray-50/50"} ${isExpanded ? "bg-gray-50" : ""}`
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              {hasIssues ? (
                                <ChevronRight
                                  className={`h-5 w-5 shrink-0 transition-transform duration-300 ${
                                    isHighestDay
                                      ? `text-amber-500 group-hover:text-amber-600 ${isExpanded ? "rotate-90 text-amber-600" : ""}`
                                      : `text-gray-400 group-hover:text-blue-500 ${isExpanded ? "rotate-90 text-blue-600" : ""}`
                                  }`}
                                />
                              ) : (
                                <span className="h-5 w-5 shrink-0" />
                              )}
                              <span
                                className={`font-bold text-sm w-12 sm:w-16 ${hasIssues ? (isHighestDay ? "text-amber-950" : "text-gray-900") : "text-gray-400"}`}
                              >
                                {day.weekday}
                              </span>
                              <span
                                className={`font-medium text-sm ${hasIssues ? (isHighestDay ? "text-amber-800" : "text-gray-600") : "text-gray-400"}`}
                              >
                                {formatIsoDateLabel(day.dateStr)}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 sm:gap-8">
                              {hasIssues ? (
                                <span
                                  className={`hidden sm:inline-flex items-center justify-center font-semibold px-2.5 py-1 rounded-full text-xs ${isHighestDay ? "bg-amber-200/80 text-amber-900" : "bg-blue-50 text-blue-700"}`}
                                >
                                  {eventCount}{" "}
                                  {eventCount === 1 ? "event" : "events"}
                                </span>
                              ) : (
                                <span className="hidden sm:inline text-gray-400 text-xs italic">
                                  No faults
                                </span>
                              )}
                              <span
                                className={`font-bold text-right ${hasIssues ? (isHighestDay ? "text-amber-950" : "text-gray-900") : "text-gray-400"}`}
                              >
                                {formatTime(day.productionHoursLost)}
                              </span>
                            </div>
                          </button>

                          <div
                            className={`transition-all duration-300 ease-in-out overflow-hidden bg-gray-50/50 ${
                              isExpanded
                                ? "max-h-250 opacity-100 border-b border-gray-100"
                                : "max-h-0 opacity-0 pointer-events-none"
                            }`}
                          >
                            {/* Detailed Issues Table */}
                            <div className="mx-6 sm:mx-12 my-6 border border-gray-200 rounded-lg overflow-x-auto shadow-xs bg-white">
                              <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr>
                                    <th className="px-5 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs">
                                      ISSUE DESCRIPTION
                                    </th>
                                    <th className="px-5 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs text-center">
                                      OCCURRENCES
                                    </th>
                                    <th className="px-5 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs">
                                      OPERATOR(S)
                                    </th>
                                    <th className="px-5 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs text-right">
                                      CUTS
                                    </th>
                                    <th className="px-5 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs text-right">
                                      TIME LOST
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {day.issues.map((issue, idx) => {
                                    const unattributed = isUnattributedIssue(
                                      issue.name,
                                    );
                                    return (
                                      <tr
                                        key={idx}
                                        className="hover:bg-gray-50/70 transition-colors"
                                      >
                                        <td className="px-5 py-3.5">
                                          <div className="flex items-center gap-2.5">
                                            {unattributed ? (
                                              <TriangleAlert className="size-4 text-amber-500 shrink-0" />
                                            ) : (
                                              <CirclePause className="size-4 text-gray-400 shrink-0" />
                                            )}
                                            <span
                                              className={`font-semibold text-sm ${unattributed ? "text-amber-700 italic" : "text-gray-800"}`}
                                            >
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
                                            {!issue.operators ||
                                            issue.operators.length === 0 ? (
                                              <span className="text-gray-400 text-xs italic">
                                                Unknown
                                              </span>
                                            ) : (
                                              issue.operators.map((op) => (
                                                <span
                                                  key={op}
                                                  className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded text-xs font-semibold"
                                                >
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
                                          {formatTime(
                                            issue.productionHoursLost,
                                          )}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 mb-5 gap-3">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                    OPERATOR & ISSUES OVERVIEW
                  </h2>

                  {/* Shift Selector Buttons */}
                  <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedShiftTab("all")}
                      className={`px-3 py-1.5 rounded-lg font-extrabold cursor-pointer transition-all duration-150 ${
                        selectedShiftTab === "all"
                          ? "bg-gray-900 text-white shadow-xs border border-gray-900"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
                      }`}
                    >
                      All Operators ({operatorRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedShiftTab(
                          selectedShiftTab === "Day" ? "all" : "Day",
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-extrabold cursor-pointer transition-all duration-150 ${
                        selectedShiftTab === "Day"
                          ? "bg-amber-500 text-white shadow-xs border border-amber-600 ring-2 ring-amber-300"
                          : "text-amber-900 bg-amber-100/60 hover:bg-amber-200/70 border border-amber-200/50"
                      }`}
                    >
                      <Sun
                        className={`size-3.5 ${selectedShiftTab === "Day" ? "text-white" : "text-amber-600"}`}
                      />
                      Day Shift
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedShiftTab(
                          selectedShiftTab === "Night" ? "all" : "Night",
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-extrabold cursor-pointer transition-all duration-150 ${
                        selectedShiftTab === "Night"
                          ? "bg-indigo-600 text-white shadow-xs border border-indigo-700 ring-2 ring-indigo-300"
                          : "text-indigo-900 bg-indigo-100/60 hover:bg-indigo-200/70 border border-indigo-200/50"
                      }`}
                    >
                      <Moon
                        className={`size-3.5 ${selectedShiftTab === "Night" ? "text-white" : "text-indigo-600"}`}
                      />
                      Night Shift
                    </button>
                  </div>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-xs border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-gray-200/60 border-b border-gray-300">
                        <th className="bg-gray-200 px-3 py-2.5 font-bold text-gray-700 uppercase tracking-wider text-[11px] rounded-l-lg border-r border-gray-300 wrap-break-word">
                          Operator
                        </th>
                        {faultCategories.length === 0 ? (
                          <th className="px-2 py-2.5 font-bold text-gray-700 uppercase tracking-wider text-[10px] text-center">
                            Faults
                          </th>
                        ) : (
                          faultCategories.map((category) => {
                            const headerLabel = getCleanMainIssue(category);
                            return (
                              <th
                                key={category}
                                title={category}
                                className="px-2 py-2.5 font-bold text-gray-700 tracking-wider text-[12px] text-center wrap-break-word leading-tight"
                              >
                                <div>{headerLabel}</div>
                              </th>
                            );
                          })
                        )}
                        <th className="px-2.5 py-2.5 font-bold text-gray-700 uppercase tracking-wider text-[10px] sm:text-[11px] text-right border-gray-300 whitespace-nowrap min-w-[95px] leading-tight">
                          Total Faults
                        </th>
                        <th className="px-2.5 py-2.5 font-bold text-gray-700 uppercase tracking-wider text-[10px] sm:text-[11px] text-right border-gray-300 whitespace-nowrap min-w-[115px] leading-tight">
                          Total Hr Lost
                        </th>
                        <th className="px-2.5 py-2.5 font-bold text-gray-700 uppercase tracking-wider text-[10px] sm:text-[11px] text-right rounded-r-lg whitespace-nowrap min-w-[90px] leading-tight">
                          Total Cuts
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {displayedOperatorRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={faultCategories.length + 4}
                            className="px-4 py-8 text-center text-sm text-gray-500 italic"
                          >
                            No operator data recorded for this date range or
                            shift.
                          </td>
                        </tr>
                      ) : (
                        displayedOperatorRows.map((op) => (
                          <tr
                            key={op.name}
                            className="hover:bg-gray-50/80 transition-colors"
                          >
                            <td className="px-3 py-2.5 font-extrabold text-gray-900 border-r border-gray-200 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{op.name}</span>
                                {op.shiftCounts?.Day > 0 && (
                                  <span
                                    title={`Day Shift: ${op.shiftCounts.Day} logged records`}
                                    className="inline-flex items-center justify-center p-0.5 rounded bg-amber-100 text-amber-700 text-[10px]"
                                  >
                                    <Sun className="size-3" />
                                  </span>
                                )}
                                {op.shiftCounts?.Night > 0 && (
                                  <span
                                    title={`Night Shift: ${op.shiftCounts.Night} logged records`}
                                    className="inline-flex items-center justify-center p-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px]"
                                  >
                                    <Moon className="size-3" />
                                  </span>
                                )}
                              </div>
                            </td>
                            {faultCategories.length === 0 ? (
                              <td className="px-2 py-2.5 text-center text-gray-400 font-medium">
                                -
                              </td>
                            ) : (
                              faultCategories.map((category) => {
                                const val = op.breakdown[category] || 0;
                                return (
                                  <td
                                    key={category}
                                    className="px-2 py-2.5 text-center border-l border-gray-100"
                                  >
                                    {val > 0 ? (
                                      <span className="inline-flex items-center justify-center bg-gray-100 text-gray-800 font-bold px-1.5 py-0.5 rounded text-xs">
                                        {val}
                                      </span>
                                    ) : (
                                      <span className="text-gray-300 font-normal">
                                        -
                                      </span>
                                    )}
                                  </td>
                                );
                              })
                            )}
                            <td className="px-2.5 py-2.5 text-right font-black text-gray-900 border-l border-gray-200">
                              {op.total}
                            </td>
                            <td className="px-2.5 py-2.5 text-right font-bold text-red-700 border-l border-gray-200 whitespace-nowrap">
                              {formatTime(op.hoursLost)}
                            </td>
                            <td className="px-2.5 py-2.5 text-right font-extrabold text-indigo-600 border-l border-gray-200">
                              {op.cuts > 0 ? (
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs">
                                  {op.cuts}
                                </span>
                              ) : (
                                <span className="text-gray-400">0</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {displayedOperatorRows.length > 0 && (
                      <tfoot className="border-t-2 border-gray-300 bg-gray-100/90 font-bold">
                        <tr>
                          <td className="px-3 py-2.5 text-gray-900 font-extrabold text-xs uppercase border-r border-gray-300">
                            TOTALS
                          </td>
                          {faultCategories.length === 0 ? (
                            <td className="px-2 py-2.5 text-center text-gray-400">
                              -
                            </td>
                          ) : (
                            faultCategories.map((category) => {
                              const colTotal = displayedOperatorRows.reduce(
                                (sum, op) =>
                                  sum + (op.breakdown[category] || 0),
                                0,
                              );
                              return (
                                <td
                                  key={category}
                                  className="px-2 py-2.5 text-center font-extrabold text-gray-800 border-l border-gray-200"
                                >
                                  {colTotal > 0 ? colTotal : "-"}
                                </td>
                              );
                            })
                          )}
                          <td className="px-2.5 py-2.5 text-right text-gray-900 font-extrabold border-l border-gray-300">
                            {displayedOperatorRows.reduce(
                              (sum, op) => sum + op.total,
                              0,
                            )}
                          </td>
                          <td className="px-2.5 py-2.5 text-right text-red-700 font-extrabold border-l border-gray-300 whitespace-nowrap">
                            {formatTime(
                              displayedOperatorRows.reduce(
                                (sum, op) => sum + op.hoursLost,
                                0,
                              ),
                            )}
                          </td>
                          <td className="px-2.5 py-2.5 text-right text-gray-900 font-extrabold border-l border-gray-300">
                            {displayedOperatorRows.reduce(
                              (sum, op) => sum + op.cuts,
                              0,
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Day-by-Day Cuts Overview Table */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                    DAY-BY-DAY CUTS BREAKDOWN
                  </h2>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-xs border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-gray-200/60 border-b border-gray-300">
                        <th className="bg-gray-200 px-3 py-2.5 font-bold text-gray-700 uppercase tracking-wider text-[11px] rounded-l-lg border-r border-gray-300 whitespace-nowrap min-w-[150px]">
                          DAY & DATE
                        </th>
                        <th className="px-3 py-2.5 font-bold text-gray-700 uppercase tracking-wider text-[11px] border-r border-gray-300">
                          ISSUES RESPONSIBLE FOR CUTS
                        </th>
                        <th className="px-3 py-2.5 font-bold text-gray-700 uppercase tracking-wider text-[10px] sm:text-[11px] text-right rounded-r-lg border-l border-gray-300">
                          TOTAL CUTS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredDays.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-8 text-center text-sm text-gray-500 italic"
                          >
                            No cut records found for this date range.
                          </td>
                        </tr>
                      ) : (
                        filteredDays.map((day) => {
                          const dayCuts = (day.issues || []).reduce(
                            (sum, issue) => sum + (issue.cuts || 0),
                            0,
                          );
                          const isMaxCutsDay =
                            maxDayCuts > 0 && dayCuts === maxDayCuts;
                          const issuesWithCuts = (day.issues || []).filter(
                            (issue) => (issue.cuts || 0) > 0,
                          );

                          return (
                            <tr
                              key={day.dateStr}
                              className={`group transition-colors ${
                                isMaxCutsDay
                                  ? "bg-red-50/90 font-semibold text-red-950 border-l-4 border-red-500"
                                  : "hover:bg-gray-50/80 text-gray-900"
                              }`}
                            >
                              {/* Day & Date Column */}
                              <td className="px-3 py-2.5 whitespace-nowrap border-r border-gray-200">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-bold text-sm ${isMaxCutsDay ? "text-gray-950" : "text-gray-900"}`}
                                  >
                                    {day.weekday}
                                  </span>
                                  <span className={`text-sm text-gray-950`}>
                                    {formatIsoDateLabel(day.dateStr)}
                                  </span>
                                </div>
                              </td>

                              {/* Issues Responsible for Cuts */}
                              <td className="px-3 py-2.5">
                                {issuesWithCuts.length === 0 ? (
                                  <span className="text-xs text-gray-400 italic">
                                    No cuts recorded
                                  </span>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {issuesWithCuts.map((issue, idx) => (
                                      <span
                                        key={idx}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                                          isMaxCutsDay
                                            ? "bg-red-100/90 text-red-950 border-red-300"
                                            : "bg-gray-50 text-gray-900 border-gray-200/80"
                                        }`}
                                      >
                                        <span>{issue.name}</span>
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[11px] font-black ${isMaxCutsDay ? "bg-red-300 text-red-950" : "bg-gray-200 text-gray-900"}`}
                                        >
                                          {issue.cuts}{" "}
                                          {issue.cuts === 1 ? "cut" : "cuts"}
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>

                              {/* Total Cuts for Day */}
                              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-extrabold ${
                                    isMaxCutsDay
                                      ? "bg-red-500 text-white shadow-xs"
                                      : dayCuts > 0
                                        ? "bg-gray-100 text-gray-900 font-bold"
                                        : "text-gray-400 font-medium"
                                  }`}
                                >
                                  {dayCuts} {dayCuts === 1 ? "cut" : "cuts"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {filteredDays.length > 0 && (
                      <tfoot className="border-t-2 border-gray-300 bg-gray-100/90 font-bold">
                        <tr>
                          <td
                            colSpan={2}
                            className="px-3 py-2.5 text-gray-900 font-extrabold text-xs uppercase border-r border-gray-300"
                          >
                            TOTAL CUTS
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-900 font-extrabold text-base">
                            {totalCuts} cuts
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
