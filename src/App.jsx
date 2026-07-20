import { CirclePause, ClockFading, Scissors, TriangleAlert, User2, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

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
  const { category } = splitFaultName(fullName);
  if (category === "Casting Faults") return "Casting Fault";
  return category;
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

// Helper to get the Monday of the current week in YYYY-MM-DD format
const getMondayOfCurrentWeek = () => {
  const d = new Date();
  const day = d.getDay();
  // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(d.setDate(diff));
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function ProductionDashboard() {
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expandedReason, setExpandedReason] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL;

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
            if (match) {
              setSelectedWeek(match.week);
            } else {
              const pastWeeks = result.data.filter(w => w.week <= currentWeekMonday);
              if (pastWeeks.length > 0) {
                setSelectedWeek(pastWeeks[pastWeeks.length - 1].week);
              } else {
                setSelectedWeek(result.data[result.data.length - 1].week);
              }
            }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div role="status">
            <svg aria-hidden="true" className="w-12 h-12 animate-spin text-gray-300 fill-blue-600" viewBox="0 0 100 101" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
              <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
            </svg>
            <span className="sr-only">Loading...</span>
          </div>
          <p className="text-sm text-gray-500 animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600 border border-red-300 bg-red-50 p-6 rounded-lg">
          Error: {error}
        </div>
      </div>
    );
  }

  if (weeklyData.length === 0) return <div>No data available.</div>;

  const currentWeekIndex = weeklyData.findIndex(w => w.week === selectedWeek);
  const currentWeek = currentWeekIndex !== -1 ? weeklyData[currentWeekIndex] : weeklyData[weeklyData.length - 1];
  const previousWeek = currentWeekIndex > 0 ? weeklyData[currentWeekIndex - 1] : null;

  const topOperator = currentWeek.operatorMatrix?.length > 0 ? currentWeek.operatorMatrix[0] : { name: 'None', total: 0 };
  const topFault = currentWeek.whereTheHoursWent?.length > 0 ? currentWeek.whereTheHoursWent[0] : { name: 'None', hours: 0, occurrences: 0 };
  const totalCuts = currentWeek.totalCuts ?? 0;
  const previousTotalCuts = previousWeek?.totalCuts ?? 0;

  let prodHoursChange = 0;
  if (previousWeek && previousWeek.totalProductionHoursLost > 0) {
    prodHoursChange = ((currentWeek.totalProductionHoursLost - previousWeek.totalProductionHoursLost) / previousWeek.totalProductionHoursLost) * 100;
  }
  const isProdIncrease = prodHoursChange > 0;

  let cutsChange = 0;
  if (previousTotalCuts > 0) {
    cutsChange = ((totalCuts - previousTotalCuts) / previousTotalCuts) * 100;
  }
  const isCutsIncrease = cutsChange > 0;

  let stoppagesChange = 0;
  const previousTotalStoppages = previousWeek?.totalStoppageCount ?? 0;
  if (previousTotalStoppages > 0) {
    stoppagesChange = ((currentWeek.totalStoppageCount - previousTotalStoppages) / previousTotalStoppages) * 100;
  }
  const isStoppagesIncrease = stoppagesChange > 0;

  const faultCategories = (currentWeek.whereTheHoursWent || []).map(f => f.name);
  const visibleHoursWent = currentWeek.whereTheHoursWent || [];

  const operatorRows = (() => {
    const byName = {};
    (currentWeek.operatorMatrix || []).forEach(op => {
      byName[op.name] = { name: op.name, total: op.total, breakdown: op.breakdown || {}, cuts: 0 };
    });
    (currentWeek.operatorCuts || []).forEach(op => {
      if (byName[op.name]) {
        byName[op.name].cuts = op.cuts;
      } else {
        byName[op.name] = { name: op.name, total: 0, breakdown: {}, cuts: op.cuts };
      }
    });
    return Object.values(byName).sort((a, b) => b.total - a.total || b.cuts - a.cuts);
  })();



  const groupedReasons = (() => {
    const groups = {};
    (currentWeek.whereTheHoursWent || []).forEach(fault => {
      const cleanTitle = getCleanMainIssue(fault.name);
      if (!groups[cleanTitle]) {
        groups[cleanTitle] = { title: cleanTitle, totalHours: 0, totalOccurrences: 0, items: [] };
      }
      groups[cleanTitle].totalHours += fault.hours;
      groups[cleanTitle].totalOccurrences += fault.occurrences;
      groups[cleanTitle].items.push(fault);
    });
    return Object.values(groups).sort((a, b) => b.totalHours - a.totalHours);
  })();

  const getOperatorBreakdownForIssue = (rawIssueName) => {
    if (!currentWeek || !currentWeek.operatorMatrix) return [];
    const operators = [];
    currentWeek.operatorMatrix.forEach(op => {
      const count = op.breakdown ? (op.breakdown[rawIssueName] || 0) : 0;
      if (count > 0) {
        operators.push({ name: op.name, count });
      }
    });
    return operators.sort((a, b) => b.count - a.count);
  };

  // Generate dates for the week starting on Monday
  const generateWeekDates = (startMondayStr) => {
    if (!startMondayStr) return [];
    const dates = [];
    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const parts = startMondayStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return [];
    const [year, month, day] = parts;
    const baseDate = new Date(year, month - 1, day);
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);

      const formatStandard = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
      const formatAlternative = `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;

      dates.push({
        weekday: weekdays[i],
        dateLabel: formatStandard,
        dateLabelAlt: formatAlternative
      });
    }
    return dates;
  };

  // FIXED: Targeted Loop strictly pulling from dailyProductionHoursLostMill array dataset
  const dailyProductionData = currentWeek ? generateWeekDates(currentWeek.week).map(day => {
    const sourceArray = currentWeek.dailyProductionHoursLostMill || currentWeek.dailyProductionHoursLost || [];
    const record = sourceArray.find(d => d.date === day.dateLabel || d.date === day.dateLabelAlt);

    let hoursValue = 0;
    if (record) {
      hoursValue = record.hours ?? record.hoursLost ?? record.value ?? (typeof record === 'number' ? record : 0);
    }
    return { ...day, hours: hoursValue };
  }) : [];

  const currentMonthKey = currentWeek?.week ? getWeekMajorityMonth(currentWeek.week) : "";
  const currentMonthWeeks = weeklyData.filter(w => w.week && doesWeekOverlapMonth(w.week, currentMonthKey));

  return (
    <div className="min-h-screen text-gray-900 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER */}
        <header className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row justify-between items-center gap-y-4 sm:gap-y-0">
          <div className="space-y-1.5 text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Vinayak Enterprises</h1>
            <p className="text-gray-500 text-md font-semibold">Production Weekly Report</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative inline-block text-left z-20 pt-1">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center gap-x-2 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 cursor-pointer"
                id="menu-button"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <svg className="h-4.5 w-4.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Week of {formatWeekDate(currentWeek.week)}</span>
                <svg className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.041l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)}></div>
                  <div className="absolute right-0 sm:left-0 z-20 mt-2 w-60 origin-top-right sm:origin-top-left rounded-lg bg-white shadow-lg ring-1 ring-gray-200 ring-opacity-5 focus:outline-none transition-all duration-200">
                    <div className="py-1" role="none">
                      {currentMonthWeeks.map((w) => {
                        const isSelected = w.week === selectedWeek;
                        return (
                          <button
                            key={w.week}
                            onClick={() => {
                              setSelectedWeek(w.week);
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 flex items-center justify-between cursor-pointer ${isSelected ? 'bg-gray-100 text-gray-900 font-bold' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            role="menuitem"
                          >
                            <span>Week of {formatWeekDate(w.week)}</span>
                            {isSelected && <Check className="h-4 w-4 text-gray-900" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* CARDS SECTION */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-500 capitalize">Total Production Hours Lost</span>
              <div className="bg-red-50 p-2 rounded-lg">
                <ClockFading className='text-red-500 size-6' />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xl font-black text-gray-900">
                {formatTime(currentWeek.totalProductionHoursLost)}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-500 capitalize">Top Incident Cause</span>
              <div className="bg-amber-50 p-2 rounded-lg">
                <TriangleAlert className='text-amber-500 size-6' />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xl font-bold text-gray-900 truncate" title={getCleanMainIssue(topFault.name)}>
                {topFault.name !== 'None' ? getCleanMainIssue(topFault.name) : 'No Faults'}
              </p>
            </div>
          </div>

          {/* <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-500 capitalize">Total Stoppages</span>
              <div className="bg-blue-50 p-2 rounded-lg">
                <CirclePause className='text-blue-500 size-6' />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xl font-bold text-gray-900">
                {currentWeek.totalStoppageCount} Stops
              </p>
              {previousWeek ? (
                <span className={`text-xs font-bold ${isStoppagesIncrease ? 'text-red-600' : 'text-green-600'}`}>
                  {isStoppagesIncrease ? '▲ ' : '▼ '}
                  {Math.abs(stoppagesChange).toFixed(0)}% vs last week
                </span>
              ) : (
                <span className="text-xs text-gray-400">No comparison data</span>
              )}
            </div>
          </div> */}

          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-500 capitalize">Most Incidents</span>
              <div className="bg-purple-50 p-2 rounded-lg">
                <User2 className='text-purple-500 size-6' />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xl font-black text-gray-900">
                {topOperator.name !== 'None' ? topOperator.name : 'N/A'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-500 capitalize">Cuts In Week</span>
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

        {/* ROW BASE MAIN PANELS */}
        <div className="space-y-8">

          {/* Standalone Table: Daily Production Hours Lost Block */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm overflow-hidden">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-3 mb-5">
              Daily Production Hours Lost
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-200/50">
                    <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs rounded-l-lg w-32">Day</th>
                    <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs w-40">Date</th>
                    <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs text-right rounded-r-lg">Production Hours Lost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dailyProductionData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500 italic">
                        No logs found under production hours lost for this week.
                      </td>
                    </tr>
                  ) : (
                    dailyProductionData.map((day, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-gray-900 text-sm">
                          {day.weekday}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-gray-600 text-sm">
                          {day.dateLabel}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-gray-600 text-sm">
                          {formatTime(day.hours)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hours Lost Overview */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm overflow-hidden">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-3 mb-5">
              Hours Lost Overview
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-200/50">
                    <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs rounded-l-lg w-36">Hours Lost</th>
                    <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs">Category</th>
                    <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs text-right rounded-r-lg w-36">Occurrences</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleHoursWent.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500 italic">
                        No specific faults recorded this week.
                      </td>
                    </tr>
                  ) : (
                    visibleHoursWent.map((fault, index) => {
                      const isHighest = index === 0;
                      const cleanCategory = getCleanMainIssue(fault.name);
                      return (
                        <tr key={index} className={`transition-colors border-l-4 ${isHighest ? 'bg-amber-500/10 border-l-amber-500' : 'hover:bg-gray-50 border-l-transparent'}`}>
                          <td className="px-4 py-3.5 font-black text-gray-900 text-sm">
                            {formatTime(fault.hours)}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-gray-600 text-sm">
                            <div className="flex items-center gap-2">
                              <span>{cleanCategory}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-gray-500 text-sm">
                            {fault.occurrences} events
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>


          {/* Operator Matrix Table */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm overflow-hidden">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-3 mb-5">
              Operator & Issues Overview
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-200/50">
                    <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs rounded-l-lg">Operator</th>
                    {faultCategories.length === 0 ? (
                      <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs text-center">Faults</th>
                    ) : (
                      faultCategories.map(category => {
                        const headerLabel = getCleanMainIssue(category);
                        return (
                          <th key={category} title={category} className="px-3 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs text-center">
                            {headerLabel}
                          </th>
                        );
                      })
                    )}
                    <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs text-right">Faults</th>
                    <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs text-right rounded-r-lg">Cuts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {operatorRows.length === 0 ? (
                    <tr>
                      <td colSpan={faultCategories.length + 3} className="px-4 py-6 text-center text-sm text-gray-500 italic">
                        No operator records found.
                      </td>
                    </tr>
                  ) : (
                    operatorRows.map((operator) => (
                      <tr key={operator.name} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 font-bold text-gray-900">{operator.name}</td>
                        {faultCategories.map(category => {
                          const count = operator.breakdown ? (operator.breakdown[category] || 0) : 0;
                          return (
                            <td key={category} className="px-3 py-4 text-center">
                              {count > 0 ? (
                                <span className="inline-flex items-center justify-center bg-orange-100 text-orange-800 font-bold px-2.5 py-0.5 rounded text-xs">
                                  {count}
                                </span>
                              ) : (
                                <span className="text-gray-300 font-medium">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-4 text-right font-bold text-gray-900 text-base">{operator.total}</td>
                        <td className="px-4 py-4 text-right font-bold text-gray-900 text-base">{operator.cuts}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reasons Overview Group Accordion */}
          {/* <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-6">
            <div className="flex justify-between items-end border-b border-gray-200 pb-2 mb-6 mt-4">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                Faults Overview
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {groupedReasons.length === 0 ? (
                <p className="text-gray-500 italic py-4">No fault reasons recorded this week.</p>
              ) : (
                groupedReasons.map((group) => {
                  const isExpanded = expandedReason === group.title;
                  return (
                    <div key={group.title} className="py-2 first:pt-0 last:pb-0">
                      <button
                        onClick={() => setExpandedReason(isExpanded ? null : group.title)}
                        className="w-full flex items-center justify-between py-3 px-4 rounded-xl hover:bg-gray-50 transition-all duration-200 text-left focus:outline-none cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900 text-base capitalize group-hover:text-blue-600 transition-colors">
                            {group.title.replace(/\//g, '/')}
                          </span>
                          <svg
                            className={`h-4 w-4 text-gray-400 transition-transform duration-300 group-hover:text-blue-500 ${isExpanded ? 'rotate-90 text-blue-600' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-8">
                          <span className="text-gray-500 font-semibold bg-gray-100 px-2.5 py-1 rounded-full text-xs">
                            {group.totalOccurrences} {group.totalOccurrences === 1 ? 'event' : 'events'}
                          </span>
                          <span className="font-black text-gray-900 w-20 text-right text-base">
                            {formatTime(group.totalHours)}
                          </span>
                        </div>
                      </button>

                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-250 opacity-100 mt-2 mb-4' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                        <div className="bg-slate-50/60 border border-slate-200/60 rounded-xl p-5 mx-4 space-y-4">
                          {group.items.map((item, itemIdx) => {
                            const { category, cause } = splitFaultName(item.name);
                            const operators = getOperatorBreakdownForIssue(item.name);
                            return (
                              <div key={itemIdx} className="space-y-3">
                                <div className="flex flex-col justify-between gap-2 border-b sm:flex-row sm:items-center border-slate-100 pb-2">
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="font-bold text-slate-800 text-sm capitalize">
                                      {cause !== "-" ? cause.replace(/\//g, '/') : category}
                                    </span>
                                  </div>
                                  <span className="text-xs text-slate-500 font-semibold">
                                    {item.occurrences} {item.occurrences === 1 ? 'event' : 'events'} • {formatTime(item.hours)} lost
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className="text-[11px] font-bold text-slate-400 tracking-wider">
                                    Operator Incharge:
                                  </span>
                                  {operators.length === 0 ? (
                                    <span className="text-xs text-slate-400 italic">No operators logged</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1">
                                      {operators.map((op) => (
                                        <span key={op.name} className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md text-xs font-semibold shadow-xs">
                                          <span className="font-bold text-slate-900">{op.name}</span>
                                          <span className="bg-slate-100 text-[10px] font-bold text-slate-600 px-1.5 py-px rounded">
                                            {op.count}
                                          </span>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div> */}

        </div>
      </div>
    </div>
  );
}