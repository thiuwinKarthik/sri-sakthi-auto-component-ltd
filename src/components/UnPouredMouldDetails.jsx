import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UnPouredMouldDetails = () => {
  // --- State ---
  const [formData, setFormData] = useState({
    disa: 'I',
    date: new Date().toISOString().split('T')[0],
    shift: '1',
    patternChange: 0,
    heatCodeChange: 0,
    mouldBurn: 0,
    amcCleaning: 0,
    mouldCrush: 0,
    coreFalling: 0
  });

  const [totalChange, setTotalChange] = useState(0); 
  const [totalHeatChange, setTotalHeatChange] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // --- 1. Auto-Calculate "Total Change" ---
  useEffect(() => {
    const sum = 
      (parseInt(formData.patternChange) || 0) +
      (parseInt(formData.heatCodeChange) || 0) +
      (parseInt(formData.mouldBurn) || 0) +
      (parseInt(formData.amcCleaning) || 0) +
      (parseInt(formData.mouldCrush) || 0) +
      (parseInt(formData.coreFalling) || 0);
    
    setTotalChange(sum);
  }, [formData]);

  // --- 2. Fetch Data ---
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

      const { record, totalHeatChange } = response.data;
      setTotalHeatChange(totalHeatChange);

      if (record) {
        setFormData(prev => ({
          ...prev,
          patternChange: record.PatternChange,
          heatCodeChange: record.HeatCodeChange,
          mouldBurn: record.MouldBurn,
          amcCleaning: record.AmcCleaning,
          mouldCrush: record.MouldCrush,
          coreFalling: record.CoreFalling
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          patternChange: 0,
          heatCodeChange: 0,
          mouldBurn: 0,
          amcCleaning: 0,
          mouldCrush: 0,
          coreFalling: 0
        }));
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  // --- 3. Handle Save ---
  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/unpoured-moulds/save', {
        ...formData,
        totalChange: totalChange
      });

      setMessage('Data Saved Successfully!');
      setTimeout(() => setMessage(''), 3000);
      fetchData(); 

    } catch (error) {
      console.error("Error saving:", error);
      setMessage('Failed to save data.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 flex justify-center items-start">
      <div className="w-full max-w-4xl bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-200">
        
        {/* --- Header --- */}
        <div className="bg-[#ff9100] py-8 px-10 shadow-md">
          <h2 className="text-4xl font-black text-white text-center tracking-tight uppercase">
            Un Poured Mould Details
          </h2>
          <div className="h-1 w-24 bg-white/40 mx-auto mt-2 rounded-full"></div>
        </div>
        
        {/* --- Top Controls (Filters) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-10 bg-white">
          
          <div className="flex flex-col">
            <label className="text-xs font-black text-gray-900 mb-2 uppercase tracking-widest">
              Disa Machine
            </label>
            <select 
              name="disa" 
              value={formData.disa} 
              onChange={handleInputChange}
              className="w-full p-4 border-2 border-gray-200 rounded-xl bg-white text-gray-900 font-bold focus:ring-4 focus:ring-[#ff9100]/20 focus:border-[#ff9100] outline-none transition-all cursor-pointer"
            >
              <option value="I">Disa I</option>
              <option value="II">Disa II</option>
              <option value="III">Disa III</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-black text-gray-900 mb-2 uppercase tracking-widest">
              Production Date
            </label>
            <input 
              type="date" 
              name="date" 
              value={formData.date} 
              onChange={handleInputChange}
              className="w-full p-4 border-2 border-gray-200 rounded-xl bg-white text-gray-900 font-bold focus:ring-4 focus:ring-[#ff9100]/20 focus:border-[#ff9100] outline-none transition-all"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-black text-gray-900 mb-2 uppercase tracking-widest">
              Working Shift
            </label>
            <select 
              name="shift" 
              value={formData.shift} 
              onChange={handleInputChange}
              className="w-full p-4 border-2 border-gray-200 rounded-xl bg-white text-gray-900 font-bold focus:ring-4 focus:ring-[#ff9100]/20 focus:border-[#ff9100] outline-none transition-all cursor-pointer"
            >
              <option value="I">Shift 1</option>
              <option value="II">Shift 2</option>
              <option value="III">Shift 3</option>
            </select>
          </div>
        </div>

        {/* --- Moulding Table --- */}
        <div className="px-10 pb-10">
          <div className="overflow-hidden border-2 border-gray-100 rounded-2xl shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900">
                  <th className="p-5 text-xs font-bold text-white uppercase tracking-widest">Change Parameter</th>
                  <th className="p-5 text-xs font-bold text-white uppercase tracking-widest w-48 text-center">Value (Int)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { label: "Pattern Change", name: "patternChange" },
                  { label: "Heat Code Change", name: "heatCodeChange" },
                  { label: "Mould Burn", name: "mouldBurn" },
                  { label: "AMC Cleaning", name: "amcCleaning" },
                  { label: "Mould Crush", name: "mouldCrush" },
                  { label: "Core Falling", name: "coreFalling" }
                ].map((row, index) => (
                  <tr key={index} className="hover:bg-orange-50/50 transition-colors group">
                    <td className="p-5 text-gray-800 font-bold text-base uppercase tracking-tight group-hover:text-[#ff9100]">{row.label}</td>
                    <td className="p-5">
                      <input 
                        type="number" 
                        name={row.name} 
                        value={formData[row.name]} 
                        onChange={handleInputChange}
                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-[#ff9100] text-center font-black text-gray-900 text-xl outline-none transition-all"
                      />
                    </td>
                  </tr>
                ))}

                {/* Total Change Row */}
                <tr className="bg-[#fff3e0] border-t-4 border-[#ff9100]">
                  <td className="p-6 text-[#e65100] font-black text-xl uppercase italic">Total Shift Change</td>
                  <td className="p-6">
                    <div className="w-full p-3 bg-white border-2 border-[#ffb74d] rounded-xl text-center text-[#e65100] font-black text-3xl shadow-inner">
                      {totalChange}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* --- Footer / Summary Section --- */}
        <div className="bg-gray-50 p-10 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-8">
          
          {/* Total Heat Display */}
          <div className="text-center md:text-left bg-white p-6 rounded-2xl border-2 border-gray-100 shadow-sm min-w-[280px]">
            <h4 className="text-gray-900 font-black uppercase text-xs tracking-widest mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#ff9100] rounded-full"></span>
              Aggregate Heat Change (Daily)
            </h4>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-black text-[#ff9100] drop-shadow-sm">
                {totalHeatChange}
              </span>
              <span className="text-gray-500 text-xs font-black uppercase">
                Cumulative
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col items-center md:items-end gap-4 w-full md:w-auto">
            {message && (
              <div className={`px-4 py-2 rounded-lg text-sm font-black uppercase shadow-sm animate-pulse ${
                message.includes('Failed') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
              }`}>
                {message}
              </div>
            )}
            <button 
              className={`
                w-full md:w-[240px] py-5 rounded-2xl text-white font-black text-xl uppercase tracking-widest shadow-xl transform transition-all duration-200 
                ${loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-[#ff9100] hover:bg-[#e68200] hover:-translate-y-1 hover:shadow-[#ff9100]/40 active:translate-y-0'
                }
              `}
              onClick={handleSave} 
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Submit'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UnPouredMouldDetails;