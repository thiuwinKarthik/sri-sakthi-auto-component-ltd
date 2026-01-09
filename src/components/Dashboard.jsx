import { Routes, Route, useNavigate } from "react-router-dom";

/* ---------- Global Page Wrapper ---------- */
const PageWrapper = ({ title, children }) => (
  <div className="h-screen w-full bg-[#494949] text-[#FFFFFF] flex flex-col overflow-hidden">
    <div className="h-2 bg-[#ff9100] flex-shrink-0" />
    <div className="flex-1 p-8 overflow-y-auto">
      <h1 className="text-4xl font-bold text-center mb-8 text-[#FFFFFF]">{title}</h1>
      {children}
    </div>
    <div className="h-2 bg-[#ff9100] flex-shrink-0" />
  </div>
);

/* ---------- Dashboard Home ---------- */
const DashboardHome = () => {
  const navigate = useNavigate();

  const buttons = [
    { name: "Product", path: "/product" },
    { name: "Performance", path: "/performance" },
    { name: "DISA Matic Product Report", path: "/disamatic-report" },
    { name: "Unpoured Mould Details", path: "/unpoured-mould" },
    { name: "DISA Setting Adjustment", path: "/disa-setting" },
    { name: "DISA Operator Checklist", path: "/disa-operator" },
    { name: "Layered Process Audit", path: "/lpa" },
    { name: " Moduling Quantity Report", path: "/moulding-qty" },
    { name: "Error Proof Verification", path: "/error-proof" },
  ];

  return (
    <div className="h-screen w-screen bg-[#494949] flex flex-col overflow-hidden">
      {/* TOP DECORATIVE BORDER */}
      <div className="h-2 bg-[#ff9100] flex-shrink-0" />

      {/* HEADER SECTION - MASSIVE TEXT UPDATE */}
      <div className="py-12 flex-shrink-0 flex justify-center">
        <h1 className="
          w-[90%] 
          text-[clamp(1rem,3.5vh,3rem)]
                xl:text-[clamp(1rem,4.5vh,4.5rem)] 
          font-black 
          text-center 
          text-[#FFFFFF] 
          tracking-tighter 
          uppercase 
          leading-none
          drop-shadow-2xl
        ">
          Sakthi Auto Component Limited
        </h1>
      </div>

      {/* CENTERED GRID AREA */}
      <div className="flex-1 flex justify-center items-center w-full h-full p-4">
        
        {/* THE GRID */}
        <div 
          className="
            grid 
            grid-cols-3 
            grid-rows-3 
            gap-[15px] 
            w-[75%] 
            h-[70%]  /* Slightly reduced height to give header more room */
          "
        >
          {buttons.map((btn) => (
            <button
              key={btn.name}
              onClick={() => navigate(btn.path)}
              className="
                w-full 
                h-full 
                bg-[#ff9100]
                text-[#FFFFFF]
                
                /* TEXT SIZE - BALANCED */
                text-[clamp(1rem,3.5vh,3rem)]
                xl:text-[clamp(1rem,4.5vh,4.5rem)]
                font-black
                
                /* BORDER RADIUS */
                rounded-[20px]
                lg:rounded-[40px]
                
                flex
                items-center
                justify-center
                text-center
                p-6
                shadow-2xl
                transition-all
                duration-150
                hover:scale-[1.02]
                hover:brightness-110
                active:scale-95
                leading-tight
                overflow-hidden
              "
            >
              <span className="drop-shadow-xl break-words max-w-full text-[#FFFFFF]">
                {btn.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* BOTTOM DECORATIVE BORDER */}
      <div className="mt-auto h-2 bg-[#ff9100] flex-shrink-0" />
    </div>
  );
};

/* ---------- Page Components ---------- */
const SimplePage = ({ title }) => (
  <PageWrapper title={title}>
    <div className="flex items-center justify-center h-full">
        <div className="bg-[#3b3b3b] p-20 rounded-[40px] border-4 border-[#ff9100] text-3xl font-bold text-[#FFFFFF] shadow-2xl text-center">
            Data for {title} will appear here.
        </div>
    </div>
  </PageWrapper>
);

/* ---------- Routes ---------- */
export default function Dashboard() {
  return (
    <Routes>
      <Route path="/" element={<DashboardHome />} />
      <Route path="/product" element={<SimplePage title="Product" />} />
      <Route path="/performance" element={<SimplePage title="Performance" />} />
      <Route path="/disamatic-report" element={<SimplePage title="Disamatic Report" />} />
      <Route path="/unpoured-mould" element={<SimplePage title="Unpoured Mould" />} />
      <Route path="/disa-setting" element={<SimplePage title="Setting Adjustment" />} />
      <Route path="/disa-operator" element={<SimplePage title="Operator Checklist" />} />
      <Route path="/lpa" element={<SimplePage title="Process Audit" />} />
      <Route path="/moulding-qty" element={<SimplePage title="Moulding Quantity" />} />
      <Route path="/error-proof" element={<SimplePage title="Error Proofing" />} />
    </Routes>
  );
}