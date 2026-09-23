// src/components/Vinayak.jsx
import CompanyDashboard from "./CompanyDashboard";

export default function Vinayak({ companySelector }) {
  return (
    <CompanyDashboard
      companyId="vinayak"
      companyName="Vinayak Enterprises"
      subtitle="Production Analytics Dashboard"
      companySelector={companySelector}
    />
  );
}
