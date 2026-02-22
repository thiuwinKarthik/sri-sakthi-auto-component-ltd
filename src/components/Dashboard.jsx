import { Routes, Route, useNavigate, Link } from "react-router-dom";
import UnPouredMouldDetails from "./UnPouredMouldDetails";
import DisaMachineCheckList from "./DisaMachineCheckList";
import BottomLevelAudit from "./BottomLevelAudit";
import DmmSettingParameters from "./DmmSettingParameters";
import ErrorProofVerification from "./ErrorProofVerification"; // 1. Import the new component
import AdminPanel from "./AdminPanel";
import AdminDashboard from "./AdminDashboard";
import ConfigFormStructure from "./ConfigFormStructure";
import ConfigErrorProof from "./ConfigErrorProof";
import ConfigUnpouredMould from "./ConfigUnpouredMould";
import ConfigDmmSetting from "./ConfigDmmSetting";

/* ---------- Professional Page Wrapper ---------- */
const PageWrapper = ({ title, children }) => (
  <div className="h-screen w-full bg-[#2d2d2d] text-white flex flex-col overflow-hidden">
    {/* Accent Top Bar */}
    <div className="h-1.5 bg-[#ff9100] flex-shrink-0" />

    {/* Sub-Header / Navigation */}
    <div className="bg-[#333333] border-b border-white/10 px-8 py-4 flex items-center justify-between shadow-md">
      <Link
        to="/"
        className="flex items-center gap-2 text-[#ff9100] font-bold uppercase tracking-wider text-sm hover:text-white transition-colors"
      >
        ← Back to Dashboard
      </Link>
      <div className="text-white/40 text-xs font-mono uppercase">Sakthi Auto Component Ltd</div>
    </div>

    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold text-white mb-8 border-l-4 border-[#ff9100] pl-4 uppercase tracking-tight">
          {title}
        </h1>
        {children}
      </div>
    </div>

    <div className="h-1.5 bg-[#ff9100] flex-shrink-0" />
  </div>
);

/* ---------- Refined Dashboard Home ---------- */
const DashboardHome = () => {
  const navigate = useNavigate();

  const buttons = [

    { name: "Performance", path: "/performance" },
    { name: "DISA Matic Product Report", path: "/disamatic-report" },
    { name: "Unpoured Mould Details", path: "/unpoured-mould" },
    { name: "DISA Setting Adjustment", path: "/disa-setting" },
    { name: "DISA Operator Checklist", path: "/disa-operator" },
    { name: "Layered Process Audit", path: "/lpa" },
    { name: "Moulding Quantity Report", path: "/moulding-qty" },
    { name: "Error Proof Verification", path: "/error-proof" },
    { name: "Admin Panel", path: "/admin" },
  ];

  return (
    <div className="h-screen w-screen bg-[#2d2d2d] flex flex-col overflow-hidden font-sans">
      {/* Top Border */}
      <div className="h-1.5 bg-[#ff9100] flex-shrink-0 shadow-[0_0_15px_rgba(255,145,0,0.5)]" />

      {/* Corporate Header */}
      <div className="py-10 flex-shrink-0 flex flex-col items-center">
        <h1 className="
          text-[2.5rem] 
          md:text-[3.5rem] 
          font-black 
          text-center 
          text-white 
          tracking-tighter 
          uppercase 
          leading-tight
          drop-shadow-lg
        ">
          Sakthi Auto Component Limited
        </h1>
        <div className="w-32 h-1 bg-[#ff9100] mt-2 rounded-full" />
      </div>

      {/* Grid Container */}
      <div className="flex-1 flex justify-center items-center px-10 pb-10">
        <div className="
          grid 
          grid-cols-1 
          sm:grid-cols-2 
          lg:grid-cols-3 
          gap-6 
          w-full 
          max-w-6xl 
          h-full 
          max-h-[600px]
        ">
          {buttons.map((btn) => (
            <button
              key={btn.name}
              onClick={() => navigate(btn.path)}
              className="
                relative
                group
                bg-[#383838]
                border border-white/5
                text-white
                rounded-2xl
                flex
                items-center
                justify-center
                text-center
                p-6
                shadow-xl
                transition-all
                duration-300
                hover:bg-[#ff9100]
                hover:scale-[1.03]
                hover:shadow-[#ff9100]/20
                active:scale-95
                overflow-hidden
              "
            >
              <span className="
                relative 
                z-10 
                text-lg 
                md:text-xl 
                font-bold 
                uppercase 
                tracking-wide 
                group-hover:text-white
              ">
                {btn.name}
              </span>
              {/* Subtle background icon/pattern effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Footer Border */}
      <div className="h-1.5 bg-[#ff9100] flex-shrink-0" />
    </div>
  );
};

/* ---------- Enhanced Page Component ---------- */
const SimplePage = ({ title }) => (
  <PageWrapper title={title}>
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="bg-[#383838] p-16 rounded-3xl border border-white/10 text-xl font-medium text-white/60 shadow-2xl text-center max-w-lg">
        <div className="mb-4 text-[#ff9100]">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        System module for <span className="text-white font-bold">{title}</span> is currently under maintenance or synchronization.
      </div>
    </div>
  </PageWrapper>
);

/* ---------- Routes ---------- */
export default function Dashboard() {
  return (
    <Routes>
      <Route path="/" element={<DashboardHome />} />

      <Route path="/performance" element={<SimplePage title="Performance Metrics" />} />
      <Route path="/disamatic-report" element={<SimplePage title="Disamatic Report" />} />

      <Route
        path="/unpoured-mould"
        element={
          <PageWrapper title="Unpoured Mould Details">
            <UnPouredMouldDetails />
          </PageWrapper>
        }
      />

      <Route path="/disa-setting" element={
        <PageWrapper title="DMM Setting Parameters">
          <DmmSettingParameters />
        </PageWrapper>
      } />

      <Route
        path="/disa-operator"
        element={
          <PageWrapper title="DISA Operator Checklist">
            <DisaMachineCheckList />
          </PageWrapper>
        }
      />

      <Route path="/lpa" element={
        <PageWrapper title="Layered Process Audit">
          <BottomLevelAudit />
        </PageWrapper>
      } />

      <Route path="/moulding-qty" element={<SimplePage title="Moulding Quantity" />} />

      {/* 2. Updated Route for Error Proof Verification */}
      <Route
        path="/error-proof"
        element={
          <PageWrapper title="Error Proof Verification">
            <ErrorProofVerification />
          </PageWrapper>
        }
      />

      {/* Admin Dashboard Hub Route */}
      <Route
        path="/admin"
        element={<AdminDashboard />}
      />

      {/* Admin User Management Route */}
      <Route
        path="/admin/users"
        element={
          <PageWrapper title="User Management">
            <AdminPanel />
          </PageWrapper>
        }
      />

      {/* Admin Config Dynamic Setup */}
      <Route
        path="/admin/config/error-proof"
        element={<ConfigErrorProof />}
      />
      <Route
        path="/admin/config/unpoured-mould-details"
        element={<ConfigUnpouredMould />}
      />
      <Route
        path="/admin/config/dmm-setting-parameters"
        element={<ConfigDmmSetting />}
      />
      <Route
        path="/admin/config/:formId"
        element={<ConfigFormStructure />}
      />

    </Routes>
  );
}