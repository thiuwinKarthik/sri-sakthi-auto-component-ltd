import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UnPouredMouldDetails = () => {
  // --- State (Same as before) ---
  const [formData, setFormData] = useState({
    disa: 'I',
    date: new Date().toISOString().split('T')[0],
    shift: '1',
    // Moulding
    patternChange: 0,
    heatCodeChange: 0,
    mouldBurn: 0,
    amcCleaning: 0,
    mouldCrush: 0,
    coreFalling: 0,
    // Sand Plant
    sandDelay: 0,
    drySand: 0,
    // Pouring
    nozzleLeakage: 0,
    spoutPocking: 0,
    stRod: 0
  });

  const [totalChange, setTotalChange] = useState(0); 
  const [totalPouring, setTotalPouring] = useState(0); 

  const [dailyStats, setDailyStats] = useState({
    totalHeatChange: 0,
    totalSandDelay: 0,
    totalDrySand: 0,
    totalPouring: 0
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // --- Logic (Same as before) ---
  useEffect(() => {
    const mouldSum = 
      (parseInt(formData.patternChange) || 0) +
      (parseInt(formData.heatCodeChange) || 0) +
      (parseInt(formData.mouldBurn) || 0) +
      (parseInt(formData.amcCleaning) || 0) +
      (parseInt(formData.mouldCrush) || 0) +
      (parseInt(formData.coreFalling) || 0);
    setTotalChange(mouldSum);

    const pouringSum = 
      (parseInt(formData.nozzleLeakage) || 0) +
      (parseInt(formData.spoutPocking) || 0) +
      (parseInt(formData.stRod) || 0);
    setTotalPouring(pouringSum);

  }, [formData]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.date, formData.disa, formData.shift]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/unpoured-moulds/details', {
        params: {
          date: formData.date,
          disa: formData.disa,
          shift: formData.shift
        }
      });

      const { record, dailyStats } = response.data;
      setDailyStats(dailyStats);

      if (record) {
        setFormData(prev => ({
          ...prev,
          patternChange: record.PatternChange,
          heatCodeChange: record.HeatCodeChange,
          mouldBurn: record.MouldBurn,
          amcCleaning: record.AmcCleaning,
          mouldCrush: record.MouldCrush,
          coreFalling: record.CoreFalling,
          sandDelay: record.SandDelay,
          drySand: record.DrySand,
          nozzleLeakage: record.NozzleLeakage,
          spoutPocking: record.SpoutPocking,
          stRod: record.StRod
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          patternChange: 0, heatCodeChange: 0, mouldBurn: 0, amcCleaning: 0, mouldCrush: 0, coreFalling: 0,
          sandDelay: 0, drySand: 0,
          nozzleLeakage: 0, spoutPocking: 0, stRod: 0
        }));
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/unpoured-moulds/save', {
        ...formData,
        totalChange: totalChange,
        totalPouring: totalPouring
      });

      setMessage('Saved Successfully!');
      setTimeout(() => setMessage(''), 3000);
      fetchData(); 

    } catch (error) {
      console.error("Error saving:", error);
      setMessage('Failed to save.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- UI Components ---

  const InputRow = ({ label, name }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 hover:bg-orange-50/30 transition-colors px-2">
      <label className="text-gray-600 font-medium text-sm">{label}</label>
      <input 
        type="number" 
        name={name} 
        value={formData[name]} 
        onChange={handleInputChange}
        onFocus={(e) => e.target.select()}
        className="w-20 p-1 text-center font-bold text-gray-800 border border-gray-300 rounded-md focus:border-orange-500 focus:ring-1 focus:ring-orange-200 outline-none text-base"
      />
    </div>
  );

  const SectionHeader = ({ title, icon }) => (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-orange-100">
      <span className="text-orange-500">{icon}</span>
      <h3 className="font-bold text-gray-700 uppercase tracking-wider text-sm">{title}</h3>
    </div>
  );

  const TotalRow = ({ label, value }) => (
    <div className="flex justify-between items-center bg-orange-50 p-3 rounded-lg mt-2">
      <span className="text-orange-800 font-bold text-xs uppercase">{label}</span>
      <span className="text-orange-600 font-black text-xl">{value}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 flex justify-center">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl overflow-hidden">
        
        {/* --- Header --- */}
        <div className="bg-gray-900 py-6 px-8 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="text-orange-500 text-2xl">⚡</span> Production Loss
          </h2>
          <div className="text-gray-400 text-xs font-mono">
            {new Date(formData.date).toLocaleDateString()}
          </div>
        </div>

        
        {/* --- Filters Bar (High Visibility Update) --- */}
<div className="flex flex-wrap gap-4 p-6 bg-slate-100 border-b border-gray-300">
  <div className="flex-1 min-w-[120px]">
    {/* Changed text-gray-400 to text-gray-600 for visibility */}
    <span className="text-[11px] font-black text-gray-600 uppercase block mb-1 tracking-wider">
      Disa Machine
    </span>
    {/* Added text-gray-900 and border-gray-400 for contrast */}
    <select 
      name="disa" 
      value={formData.disa} 
      onChange={handleInputChange} 
      className="w-full p-2 text-sm font-bold border-2 border-gray-300 rounded bg-white text-gray-900 focus:border-orange-500 outline-none"
    >
      <option value="I">Disa I</option>
      <option value="II">Disa II</option>
      <option value="III">Disa III</option>
    </select>
  </div>

  <div className="flex-1 min-w-[120px]">
    <span className="text-[11px] font-black text-gray-600 uppercase block mb-1 tracking-wider">
      Production Date
    </span>
    <input 
      type="date" 
      name="date" 
      value={formData.date} 
      onChange={handleInputChange} 
      className="w-full p-2 text-sm font-bold border-2 border-gray-300 rounded bg-white text-gray-900 focus:border-orange-500 outline-none" 
    />
  </div>

  <div className="flex-1 min-w-[120px]">
    <span className="text-[11px] font-black text-gray-600 uppercase block mb-1 tracking-wider">
      Working Shift
    </span>
    <select 
      name="shift" 
      value={formData.shift} 
      onChange={handleInputChange} 
      className="w-full p-2 text-sm font-bold border-2 border-gray-300 rounded bg-white text-gray-900 focus:border-orange-500 outline-none"
    >
      <option value="1">Shift I</option>
      <option value="2">Shift II</option>
      <option value="3">Shift III</option>
    </select>
  </div>
</div>

        <div className="p-6 flex flex-col gap-8">
          
          {/* --- SECTION 1: Moulding --- */}
          <div>
            <SectionHeader title="Moulding Parameters" icon="📦" />
            <div className="pl-2">
              <InputRow label="Pattern Change" name="patternChange" />
              <InputRow label="Heat Code Change" name="heatCodeChange" />
              <InputRow label="Mould Burn" name="mouldBurn" />
              <InputRow label="AMC Cleaning" name="amcCleaning" />
              <InputRow label="Mould Crush" name="mouldCrush" />
              <InputRow label="Core Falling" name="coreFalling" />
              <TotalRow label="Moulding Total" value={totalChange} />
            </div>
          </div>

          {/* --- SECTION 2: Sand Plant --- */}
          <div>
            <SectionHeader title="Sand Plant Details" icon="⏳" />
            <div className="pl-2">
              <InputRow label="Sand Delay" name="sandDelay" />
              <InputRow label="Dry Sand" name="drySand" />
            </div>
          </div>

          {/* --- SECTION 3: Pouring --- */}
          <div>
            <SectionHeader title="Pouring (Prec Spour)" icon="🔥" />
            <div className="pl-2">
              <InputRow label="Nozzle Leakage" name="nozzleLeakage" />
              <InputRow label="Spout Pocking" name="spoutPocking" />
              <InputRow label="ST Rod" name="stRod" />
              <TotalRow label="Pouring Total" value={totalPouring} />
            </div>
          </div>

        </div>

        {/* --- Footer / Stats --- */}
        <div className="bg-slate-50 border-t border-gray-200 p-6">
          <h4 className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Daily Cumulative Totals</h4>
          
          <div className="flex justify-between gap-2 mb-6 text-center">
            <MiniStat label="Moulds" value={dailyStats.totalHeatChange} />
            <MiniStat label="Sand Dly" value={dailyStats.totalSandDelay} />
            <MiniStat label="Dry Sand" value={dailyStats.totalDrySand} />
            <MiniStat label="Pouring" value={dailyStats.totalPouring} isWarning={true} />
          </div>

          <div className="flex flex-col gap-2">
            {message && (
              <div className={`text-center text-xs font-bold uppercase p-2 rounded ${message.includes('Failed') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {message}
              </div>
            )}
            <button 
              onClick={handleSave}
              disabled={loading}
              className={`w-full py-3 rounded-lg text-white font-bold uppercase tracking-wider shadow-md transition-transform active:scale-95 ${loading ? 'bg-gray-400' : 'bg-orange-500 hover:bg-orange-600'}`}
            >
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Mini Stat Component for the footer
const MiniStat = ({ label, value, isWarning }) => (
  <div className="flex-1 bg-white border border-gray-200 rounded p-2 shadow-sm">
    <div className={`text-xl font-black ${isWarning ? 'text-red-500' : 'text-gray-700'}`}>{value}</div>
    <div className="text-[9px] text-gray-400 font-bold uppercase">{label}</div>
  </div>
);

export default UnPouredMouldDetails;