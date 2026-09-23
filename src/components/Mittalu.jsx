// src/components/Mittalu.jsx
import CompanyDashboard from "./CompanyDashboard";

export default function Mittalu({ companySelector }) {
  return (
    <CompanyDashboard
      companyId="mittalu"
      companyName="Mittalu Pvt Ltd"
      subtitle="Production Analytics Dashboard"
      companySelector={companySelector}
    />
  );
}
