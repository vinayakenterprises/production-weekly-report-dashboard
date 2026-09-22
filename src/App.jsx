// src/App.jsx
import { useState } from "react";
import { Building2 } from "lucide-react";
import Vinayak from "./components/Vinayak";
import Mittalu from "./components/Mittalu";

const COMPANIES = [
  { id: "vinayak", label: "Vinayak" },
  { id: "mittalu", label: "Mittalu" },
];

export default function ProductionDashboard() {
  const [selectedCompany, setSelectedCompany] = useState("vinayak");

  const companyTabs = (
    <div className="flex items-center">
      <div className="inline-flex p-1 bg-gray-100/90 border border-gray-200/80 rounded-xl shadow-2xs">
        {COMPANIES.map((company) => {
          const isActive = selectedCompany === company.id;
          return (
            <button
              key={company.id}
              type="button"
              onClick={() => setSelectedCompany(company.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-blue-600 shadow-xs border border-gray-200/60 font-bold"
                  : "text-gray-500 hover:text-gray-800 font-medium"
              }`}
            >
              <Building2
                className={`size-4 ${isActive ? "text-blue-600" : "text-gray-400"}`}
              />
              <span>{company.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-gray-900 font-sans p-4 sm:p-8 bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-6">
        {selectedCompany === "vinayak" ? (
          <Vinayak companySelector={companyTabs} />
        ) : (
          <Mittalu companySelector={companyTabs} />
        )}
      </div>
    </div>
  );
}
