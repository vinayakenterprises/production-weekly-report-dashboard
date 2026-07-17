import { CirclePause, ClockFading, Scissors, TriangleAlert, User2, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

// --- UTILITY FUNCTIONS ---
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
// FIX: parse the date as LOCAL time (not UTC) so the day doesn't shift
// backwards for users in negative UTC-offset timezones.
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
  if (!fullName) return { category: "Unspecified", cause: "—" };
  const matches = fullName.match(/^([^(]+)(?:\(([^)]+)\))?$/);
  if (!matches) return { category: fullName, cause: "—" };
  const category = matches[1].trim();
  const cause = matches[2] ? matches[2].trim() : "—";
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
            setSelectedWeek(result.data[result.data.length - 1].week);
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
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div role="status">
            <svg
              aria-hidden="true"
              className="w-12 h-12 animate-spin text-gray-300 fill-blue-600"
              viewBox="0 0 100 101"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentFill"
              />
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

  // Top operator by total incidents this week (backend already excludes
  // no-issue / no-genuine-stoppage rows from operatorMatrix entirely)
  const topOperator = currentWeek.operatorMatrix?.length > 0
    ? currentWeek.operatorMatrix[0]
    : { name: 'None', total: 0 };

  const topFault = currentWeek.whereTheHoursWent?.length > 0
    ? currentWeek.whereTheHoursWent[0]
    : { name: 'None', hours: 0, occurrences: 0 };

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

  // All fault category names for this week (backend only ever sends rows
  // that had a real Issue, so there's no "Unspecified" bucket to filter out)
  const faultCategories = currentWeek.whereTheHoursWent.map(f => f.name);
  const visibleHoursWent = currentWeek.whereTheHoursWent;

  // FIX: operatorMatrix (fault attribution) and operatorCuts (cut attribution)
  // are independent lists from the backend — an operator can appear in one
  // without the other (e.g. a row had a real cut but no genuine logged
  // fault on that same row, or vice versa). Union them by name so every
  // operator who shows up in EITHER list gets a row in the table below,
  // instead of silently dropping cut-only or fault-only operators.
  const operatorRows = (() => {
    const byName = {};

    (currentWeek.operatorMatrix || []).forEach(op => {
      byName[op.name] = { name: op.name, total: op.total, breakdown: op.breakdown, cuts: 0 };
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

  // Generates UI metadata (Tags and Subtitles) based on fault keywords
  const getFaultMetadata = (category, cause) => {
    const lowerCause = cause.toLowerCase();
    const lowerCategory = category.toLowerCase();
    const fullText = `${lowerCategory} ${lowerCause}`;

    if (fullText.includes('entry guide') || fullText.includes('tuta') || fullText.includes('wire break')) {
      return { tag: 'CHECK TENSION', tagColor: 'bg-red-100 text-red-800', desc: 'Entry guide tension suspected' };
    }
    if (fullText.includes('crack') || fullText.includes('kachra') || fullText.includes('ingot')) {
      return { tag: 'FLAG TO PURCHASE', tagColor: 'bg-red-100 text-red-800', desc: 'Linked to ingot quality' };
    }
    if (fullText.includes('scheduled') || fullText.includes('mold') || fullText.includes('share pin')) {
      return { tag: 'PLANNED', tagColor: 'bg-slate-100 text-slate-700', desc: 'Not a fault — expected maintenance block' };
    }
    if (fullText.includes('stand')) {
      return { tag: 'INSPECT STAND', tagColor: 'bg-red-100 text-red-800', desc: 'Repeat on same stand number' };
    }
    if (fullText.includes('belt')) {
      return { tag: 'WEAR ITEM', tagColor: 'bg-slate-100 text-slate-700', desc: 'Within expected wear cycle' };
    }

    return { tag: 'REVIEW', tagColor: 'bg-gray-100 text-gray-600', desc: 'Standard review required' };
  };

  // Group the hours lost by their clean category
  const groupedReasons = (() => {
    const groups = {};
    (currentWeek.whereTheHoursWent || []).forEach(fault => {
      const cleanTitle = getCleanMainIssue(fault.name);
      if (!groups[cleanTitle]) {
        groups[cleanTitle] = {
          title: cleanTitle,
          totalHours: 0,
          totalOccurrences: 0,
          items: []
        };
      }
      groups[cleanTitle].totalHours += fault.hours;
      groups[cleanTitle].totalOccurrences += fault.occurrences;
      groups[cleanTitle].items.push(fault);
    });
    return Object.values(groups).sort((a, b) => b.totalHours - a.totalHours);
  })();

  // Helper to get operator breakdown for a specific raw issue
  const getOperatorBreakdownForIssue = (rawIssueName) => {
    if (!currentWeek || !currentWeek.operatorMatrix) return [];
    const operators = [];
    currentWeek.operatorMatrix.forEach(op => {
      const count = op.breakdown[rawIssueName];
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

      const dayLabel = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
      dates.push({
        weekday: weekdays[i],
        dateLabel: dayLabel
      });
    }
    return dates;
  };

  const weekDaysData = currentWeek ? generateWeekDates(currentWeek.week).map(day => {
    const record = currentWeek.dailyDowntime?.find(d => d.date === day.dateLabel);
    return {
      ...day,
      hours: record ? record.hours : 0
    };
  }) : [];

  const maxDailyHours = weekDaysData.length > 0 ? Math.max(...weekDaysData.map(d => d.hours), 1) : 1;
  const peakDay = weekDaysData.reduce((max, d) => d.hours > max.hours ? d : max, { weekday: 'N/A', dateLabel: '', hours: 0 });

  // Filter available weeks in dropdown to only show weeks belonging to the selected week's month
  // We use the getWeekMajorityMonth and doesWeekOverlapMonth helpers to correctly handle weeks bridging two months
  const currentMonthKey = currentWeek?.week ? getWeekMajorityMonth(currentWeek.week) : ""; // e.g. "2026-07"
  const currentMonthWeeks = weeklyData.filter(w => w.week && doesWeekOverlapMonth(w.week, currentMonthKey));

  return (
    <div className="min-h-screen text-gray-900 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* --- HEADER --- */}
        <header className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row justify-between items-center gap-y-4 sm:gap-y-0">
          <div className="space-y-1.5 text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Vinayak Enterprises</h1>
            <p className="text-gray-500 text-md font-semibold">Production Weekly Report</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Calendar Week Selector Dropdown */}
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
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
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
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 flex items-center justify-between cursor-pointer ${isSelected
                              ? 'bg-gray-100 text-gray-900 font-bold'
                              : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            role="menuitem"
                          >
                            <span>Week of {formatWeekDate(w.week)}</span>
                            {isSelected && (<Check className="h-4 w-4 text-gray-900" />)}
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

        {/* --- Cards --- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Total Hours Lost */}
          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500  font-bold capitalize">Total Production Hours Lost</span>
              <div className="bg-red-50 p-2 rounded-lg">
                <ClockFading className='text-red-500 size-6' />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xl font-black text-gray-900">
                {formatTime(currentWeek.totalProductionHoursLost)}
              </p>
              {previousWeek ? (
                <span className={`text-xs font-bold ${isProdIncrease ? 'text-red-600' : 'text-green-600'}`}>
                  {isProdIncrease ? '▲' : '▼'} {Math.abs(prodHoursChange).toFixed(0)}% vs last week
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  No comparison data
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Event Causing Most Fault */}
          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500  font-bold capitalize">Top Incident Cause</span>
              <div className="bg-amber-50 p-2 rounded-lg">
                <TriangleAlert className='text-amber-500 size-6' />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xl font-bold text-gray-900 truncate" title={getCleanMainIssue(topFault.name)}>
                {topFault.name !== 'None' ? getCleanMainIssue(topFault.name) : 'No Faults'}
              </p>
              {topFault.name !== 'None' ? (
                <span className="text-xs text-gray-500 font-medium">
                  {formatTime(topFault.hours)} lost · {topFault.occurrences} events
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  No recorded incidents
                </span>
              )}
            </div>
          </div>


          {/* Card 3: No. of Stoppages
          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500  font-bold capitalize">Total Stoppages</span>
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
                  {isStoppagesIncrease ? '▲' : '▼'} {Math.abs(stoppagesChange).toFixed(0)}% vs last week
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  No comparison data
                </span>
              )}
            </div>
          </div> */}

          {/* Card 4: Operator With Most Incidents */}
          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 font-bold capitalize">Most Incidents</span>
              <div className="bg-purple-50 p-2 rounded-lg">
                <User2 className='text-purple-500 size-6' />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xl font-black text-gray-900">
                {topOperator.name !== 'None' ? topOperator.name : 'N/A'}
              </p>
              <span className="text-xs text-gray-500 font-medium">
                Responsible for: <span className="font-bold text-gray-700">{topOperator.total} incidents</span>
              </span>
            </div>
          </div>

          {/* Card 5: Total Cuts & Reason */}
          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 font-bold capitalize">Cuts In Week</span>
              <div className="bg-emerald-50 p-2 rounded-lg">
                <Scissors className='text-emerald-500 size-6' />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black tracking-tight text-gray-900">
                {totalCuts} cuts
              </p>
              {previousWeek && previousTotalCuts > 0 ? (
                <span className={`text-xs font-bold ${isCutsIncrease ? 'text-red-600' : 'text-green-600'}`}>
                  {isCutsIncrease ? '▲' : '▼'} {Math.abs(cutsChange).toFixed(0)}% vs last week
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  No comparison data
                </span>
              )}
            </div>
          </div>
        </section>

        {/* --- Main Dashboard (Row Wise Stack) --- */}
        <div className="space-y-8">

          {/* Stoppage Breakdown (Where the Hours Went) - Tabular Form */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs overflow-hidden">
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
                        <tr
                          key={index}
                          className={`transition-colors border-l-4 ${isHighest
                            ? 'bg-amber-500/40 border-l-amber-500'
                            : 'hover:bg-gray-50 border-l-transparent'
                            }`}
                        >
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

          {/* Daily Downtime Chart & Analytics */}
          {/* test commit */}

          {/* <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <div className="border-b border-gray-100 pb-4 mb-6">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                Daily Downtime Analysis
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 flex flex-col justify-between">
                <div className="h-64 flex items-end gap-2 sm:gap-4 border-b border-gray-200 pb-2 relative">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-8">
                    {[1, 2, 3, 4].map((gridLineIndex) => (
                      <div key={gridLineIndex} className="border-t border-dashed border-gray-100 w-full h-0" />
                    ))}
                  </div>

                  {weekDaysData.map((day, index) => {
                    const heightPercent = maxDailyHours > 0 ? (day.hours / maxDailyHours) * 100 : 0;

                    // Severity colors for columns
                    let barGradient = "from-emerald-400 to-teal-500";
                    if (day.hours > 0 && day.hours <= 2) {
                      barGradient = "from-amber-400 to-orange-500";
                    } else if (day.hours > 2 && day.hours <= 6) {
                      barGradient = "from-rose-400 to-red-500";
                    } else if (day.hours > 6) {
                      barGradient = "from-rose-600 to-red-700";
                    }

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center h-full group relative">
                        <div className="absolute -top-12 scale-0 group-hover:scale-100 transition-transform duration-200 bg-gray-950 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-md z-10 pointer-events-none whitespace-nowrap">
                          {formatTime(day.hours)} lost
                          <div className="w-2 h-2 bg-gray-950 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                        </div>

                        <div className="w-full bg-gray-50 hover:bg-gray-100/70 h-full rounded-t-lg relative transition-colors overflow-hidden flex items-end">
                          {day.hours > 0 ? (
                            <div
                              className={`w-full bg-linear-to-t ${barGradient} rounded-t-md transition-all duration-1000 ease-out`}
                              style={{ height: `${Math.max(heightPercent, 4)}%` }} // minimum 4% height to be visible
                            />
                          ) : (
                            <div className="w-full h-1 bg-emerald-500 rounded-t-sm" /> // Flat green line for 0 downtime
                          )}
                        </div>

                        <span className="text-[10px] font-bold text-gray-400 uppercase mt-2">
                          {day.weekday}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-500">
                          {day.dateLabel.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col justify-between">
                <div className="flex flex-col h-full justify-between">
                  <div className="border-b border-gray-100 pb-2 mb-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                      Downtime Metrics
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <div className="bg-gray-50/50 border border-gray-200 p-4 rounded-xl flex flex-col justify-between hover:shadow-sm transition-shadow">
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          <ClockFading className="size-3.5 text-gray-400" />
                          <span>Total Time</span>
                        </div>
                        <p className="text-base sm:text-lg font-black text-gray-900 mt-2">
                          {formatTime(weekDaysData.reduce((acc, curr) => acc + curr.hours, 0))}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">Stoppages sum</span>
                    </div>

                    <div className="bg-gray-50/50 border border-gray-200 p-4 rounded-xl flex flex-col justify-between hover:shadow-sm transition-shadow">
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          <CirclePause className="size-3.5 text-gray-400" />
                          <span>Incidents</span>
                        </div>
                        <p className="text-base sm:text-lg font-black text-gray-900 mt-2">
                          {currentWeek.totalStoppageCount} stops
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">Weekly count</span>
                    </div>
                  </div>
                  <div className="bg-gray-50/50 my-2 border border-gray-200 p-4 rounded-xl flex flex-col justify-between hover:shadow-sm transition-shadow">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <TriangleAlert className="size-3.5 text-amber-500" />
                        <span>Peak Day</span>
                      </div>
                      <div className='flex w-full my-2 gap-2 items-center '>
                        <div className="">
                          {peakDay.hours > 0 ? (
                            <p className="text-xs sm:text-sm font-extrabold text-gray-800 leading-tight">
                              {peakDay.weekday} ({peakDay.dateLabel.split(' ')[0]})
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">None</p>
                          )}
                        </div>

                        <div>
                          {peakDay.hours > 0 ? (
                            <span className="text-xs text-red-600 font-bold">
                              {formatTime(peakDay.hours)} lost
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 font-medium">No downtime</span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div> */}

          {/* Operator Matrix Table */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs overflow-hidden">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-3 mb-5">
              Operator & Issues
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
                          <th
                            key={category}
                            title={category}
                            className="px-3 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs text-center"
                          >
                            {headerLabel}
                          </th>
                        );
                      })
                    )}
                    <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs text-right rounded-r-lg">
                      Faults
                    </th>
                    <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-xs text-right rounded-r-lg">
                      Cuts
                    </th>
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
                          const count = operator.breakdown[category] || 0;
                          return (
                            <td key={category} className="px-3 py-4 text-center">
                              {count > 0 ? (
                                <span className="inline-flex items-center justify-center bg-orange-100 text-orange-800 font-bold px-2.5 py-0.5 rounded text-xs">
                                  {count}
                                </span>
                              ) : (
                                <span className="text-gray-300 font-medium">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-4 text-right font-bold text-gray-900 text-base">{operator.total}</td>
                        <td className="px-4 py-4 text-right font-bold text-emerald-750 text-base">{operator.cuts}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* --- Reasons Overview --- */}


          <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-6">
            <div className="flex justify-between items-end border-b border-gray-200 pb-2 mb-6 mt-4">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                Reasons Overview
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
                      {/* Main Group Row (Header) */}
                      <button
                        onClick={() => setExpandedReason(isExpanded ? null : group.title)}
                        className="w-full flex items-center justify-between py-3 px-4 rounded-xl hover:bg-gray-50 transition-all duration-200 text-left focus:outline-none cursor-pointer group"
                      >
                        {/* Left Side: Title and Chevron */}
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900 text-base capitalize group-hover:text-blue-600 transition-colors">
                            {group.title.replace(/\//g, ' / ')}
                          </span>
                          <svg
                            className={`h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-blue-600' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>

                        {/* Right Side: Aggregate Metrics */}
                        <div className="flex items-center gap-8 text-sm">
                          <span className="text-gray-500 font-semibold bg-gray-100 px-2.5 py-1 rounded-full text-xs">
                            {group.totalOccurrences} {group.totalOccurrences === 1 ? 'event' : 'events'}
                          </span>
                          <span className="font-black text-gray-900 w-20 text-right text-base">
                            {formatTime(group.totalHours)}
                          </span>
                        </div>
                      </button>

                      {/* Dropdown / Expanded Content */}
                      <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-200 opacity-100 mt-2 mb-4' : 'max-h-0 opacity-0 pointer-events-none'
                          }`}
                      >
                        <div className="bg-slate-50/60 border border-slate-200/60 rounded-xl p-5 mx-4 space-y-4">
                          {group.items.map((item, itemIdx) => {
                            const { category, cause } = splitFaultName(item.name);
                            const meta = getFaultMetadata(category, cause);
                            const operators = getOperatorBreakdownForIssue(item.name);

                            return (
                              <div key={itemIdx} className="space-y-3">
                                {/* Raw cause and tag */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="font-bold text-slate-800 text-sm capitalize">
                                      {cause !== "—" ? cause.replace(/\//g, ' / ') : category}
                                    </span>
                                    {/* <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${meta.tagColor}`}>
                                      {meta.tag}
                                    </span> */}
                                  </div>
                                  <span className="text-xs text-slate-500 font-semibold">
                                    {item.occurrences} {item.occurrences === 1 ? 'event' : 'events'} · {formatTime(item.hours)} lost
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className="text-[11px] font-bold text-slate-400 tracking-wider">
                                    Operator Incharge:
                                  </span>
                                  {operators.length === 0 ? (
                                    <span className="text-xs text-slate-400 italic">No operators logged</span>
                                  ) : (
                                    operators.map((op) => (
                                      <span
                                        key={op.name}
                                        className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md text-xs font-semibold shadow-xs"
                                      >
                                        <span className="font-bold text-slate-900">{op.name}</span>
                                        <span className="bg-slate-100 text-slate-600 px-1.5 py-px rounded text-[10px] font-bold">
                                          {op.count}
                                        </span>
                                      </span>
                                    ))
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
          </div>
        </div>

      </div>
    </div>
  );
}