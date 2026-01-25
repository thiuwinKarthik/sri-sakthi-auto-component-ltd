import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';

// --- Custom Notification Popup ---
const NotificationModal = ({ data, onClose }) => {
  if (!data.show) return null;

  const isError = data.type === 'error';
  const bgColor = isError ? 'bg-red-50' : 'bg-green-50';
  const borderColor = isError ? 'border-red-200' : 'border-green-200';
  const textColor = isError ? 'text-red-800' : 'text-green-800';
  const Icon = isError ? AlertTriangle : CheckCircle;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`${bgColor} ${borderColor} border-2 w-full max-w-md p-6 rounded-2xl shadow-2xl relative transform transition-all scale-100`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${isError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
            <Icon size={28} />
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${textColor} mb-1`}>
              {isError ? 'Action Required' : 'Success'}
            </h3>
            <p className="text-sm font-medium text-gray-600 leading-relaxed">
              {data.message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button 
            onClick={onClose}
            className={`px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wide text-white shadow-md transition-transform active:scale-95 ${isError ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isError ? 'Close' : 'Okay, Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Searchable Select ---
const SearchableSelect = ({ label, options, displayKey, onSelect, value, placeholder }) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value) setSearch(value);
  }, [value]);

  const filtered = options.filter((item) =>
    item[displayKey]?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full">
      {label && <label className="text-[11px] font-black text-gray-600 uppercase block mb-1 tracking-wider">
        {label}
      </label>}
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full p-3 text-sm font-medium border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:border-orange-500 outline-none placeholder-gray-500 shadow-sm transition-all"
        placeholder={placeholder || "Search..."}
      />
      {open && (
        <ul className="absolute bottom-full mb-1 z-50 bg-white border border-gray-200 w-full max-h-60 overflow-y-auto rounded-lg shadow-xl">
          {filtered.length > 0 ? (
            filtered.map((item, index) => (
              <li
                key={index}
                onClick={() => {
                  setSearch(item[displayKey]);
                  setOpen(false);
                  onSelect(item);
                }}
                className="p-3 hover:bg-orange-100 cursor-pointer text-sm text-gray-900 font-medium border-b border-gray-100 last:border-0"
              >
                {item[displayKey]}
              </li>
            ))
          ) : (
            <li className="p-3 text-gray-500 text-sm">No results found</li>
          )}
        </ul>
      )}
      {open && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpen(false)} />}
    </div>
  );
};

// --- Main Component ---
const DisaMachineCheckList = () => {
  const [checklist, setChecklist] = useState([]);
  const [operators, setOperators] = useState([]);
  const [reportsMap, setReportsMap] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  const [headerData, setHeaderData] = useState({
    date: new Date().toISOString().split('T')[0],
    operatorName: ''
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  
  const [ncForm, setNcForm] = useState({
    ncDetails: '',
    correction: '',
    rootCause: '',
    correctiveAction: '',
    targetDate: new Date().toISOString().split('T')[0],
    responsibility: '',
    sign: '',
    status: 'Pending'
  });

  // --- 1. HELPER: Local Storage Key ---
  const getStorageKey = (date) => `disa_checklist_draft_${date}`;

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerData.date]); 

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/disa-checklist/details', {
        params: { date: headerData.date }
      });
      
      setOperators(res.data.operators);

      const selectedDate = headerData.date; 
      
      // --- 2. LOGIC: Get Draft from LocalStorage ---
      const storageKey = getStorageKey(selectedDate);
      const savedDraft = JSON.parse(localStorage.getItem(storageKey) || '{}');

      const processedChecklist = res.data.checklist.map(item => {
        const dbDate = item.LastUpdated ? item.LastUpdated.split('T')[0] : '';
        const isSameDate = dbDate === selectedDate;
        
        // Priority: 1. DB Value (if saved today) 2. LocalStorage Draft 3. False
        let finalIsDone = false;
        if (isSameDate && item.IsDone) {
            finalIsDone = true; // DB has it saved as done
        } else if (savedDraft[item.ChecklistId]) {
            finalIsDone = true; // LocalStorage has it as a draft
        }

        return {
          ...item,
          IsDone: finalIsDone 
        };
      });

      setChecklist(processedChecklist);

      const reportsObj = {};
      res.data.reports.forEach(r => {
        reportsObj[r.ChecklistId] = r;
      });
      setReportsMap(reportsObj);

      setLoading(false);
    } catch (error) {
      console.error("Fetch Error:", error);
      setLoading(false);
    }
  };

  const handleOkClick = (item) => {
    const newStatus = !item.IsDone;

    // Update State
    setChecklist(prev => prev.map(c => 
      c.ChecklistId === item.ChecklistId ? { ...c, IsDone: newStatus } : c
    ));

    // --- 3. LOGIC: Save to LocalStorage immediately ---
    const storageKey = getStorageKey(headerData.date);
    const currentDraft = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    if (newStatus) {
        currentDraft[item.ChecklistId] = true;
    } else {
        delete currentDraft[item.ChecklistId];
    }
    
    localStorage.setItem(storageKey, JSON.stringify(currentDraft));
  };

  const handleNotOkClick = (item) => {
    if (!headerData.operatorName) {
      const footer = document.getElementById('checklist-footer');
      footer?.scrollIntoView({ behavior: 'smooth' });
      setNotification({
        show: true,
        type: 'error',
        message: 'Please select the Operator Name at the bottom of the page before logging a defect.'
      });
      return;
    }

    setModalItem(item);
    const existingReport = reportsMap[item.ChecklistId];

    if (existingReport) {
      setNcForm({
        ncDetails: existingReport.NonConformityDetails,
        correction: existingReport.Correction,
        rootCause: existingReport.RootCause,
        correctiveAction: existingReport.CorrectiveAction,
        targetDate: existingReport.TargetDate.split('T')[0],
        responsibility: existingReport.Responsibility,
        sign: existingReport.Sign,
        status: existingReport.Status
      });
    } else {
      setNcForm({
        ncDetails: '',
        correction: '',
        rootCause: '',
        correctiveAction: '',
        targetDate: headerData.date, 
        responsibility: '',
        sign: headerData.operatorName,
        status: 'Pending'
      });
    }
    
    setIsModalOpen(true);
  };

  const submitReport = async () => {
    if (!ncForm.ncDetails || !ncForm.responsibility) {
      setNotification({
        show: true,
        type: 'error',
        message: 'The "Non-Conformity Details" and "Responsibility" fields are mandatory.'
      });
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/disa-checklist/report-nc', {
        checklistId: modalItem.ChecklistId,
        slNo: modalItem.SlNo,
        reportDate: headerData.date, 
        ...ncForm
      });
      
      setNotification({
        show: true,
        type: 'success',
        message: 'Non-Conformity Report has been logged successfully.'
      });

      setIsModalOpen(false);
      
      // Update Reports Map
      setReportsMap(prev => ({
        ...prev,
        [modalItem.ChecklistId]: {
            ...ncForm,
            ChecklistId: modalItem.ChecklistId,
            NonConformityDetails: ncForm.ncDetails,
            Correction: ncForm.correction,
            RootCause: ncForm.rootCause,
            CorrectiveAction: ncForm.correctiveAction,
            Responsibility: ncForm.responsibility,
            TargetDate: ncForm.targetDate,
            Status: 'Pending',
            Sign: ncForm.sign
        }
      }));

      // Uncheck OK if it was checked
      setChecklist(prev => prev.map(c => 
        c.ChecklistId === modalItem.ChecklistId ? { ...c, IsDone: false } : c
      ));

      // Remove from LocalStorage if it exists there (since it's now an NC)
      const storageKey = getStorageKey(headerData.date);
      const currentDraft = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if(currentDraft[modalItem.ChecklistId]) {
          delete currentDraft[modalItem.ChecklistId];
          localStorage.setItem(storageKey, JSON.stringify(currentDraft));
      }

    } catch (error) {
      console.error("Report Error:", error);
      setNotification({ show: true, type: 'error', message: 'Failed to save report.' });
    }
  };

  const handleBatchSubmit = async () => {
    if (!headerData.operatorName) {
      return setNotification({
        show: true,
        type: 'error',
        message: 'Please select the Operator Name (Signature) before submitting.'
      });
    }

    const pendingItems = checklist.filter(item => {
        const isOk = item.IsDone;
        const isNotOk = !!reportsMap[item.ChecklistId];
        return !isOk && !isNotOk;
    });

    if (pendingItems.length > 0) {
        return setNotification({
            show: true,
            type: 'error',
            message: `Submission Failed. You have ${pendingItems.length} unchecked items. Please mark them as OK or log a defect.`
        });
    }
    
    try {
      const itemsToSave = checklist.map(item => ({
        ChecklistId: item.ChecklistId,
        IsDone: item.IsDone
      }));
      await axios.post('http://localhost:5000/api/disa-checklist/submit-batch', {
        items: itemsToSave,
        sign: headerData.operatorName,
        date: headerData.date 
      });
      
      // --- 4. LOGIC: Clear LocalStorage on Success ---
      // Since data is now in DB, we don't need the draft anymore
      const storageKey = getStorageKey(headerData.date);
      localStorage.removeItem(storageKey);

      setNotification({
        show: true,
        type: 'success',
        message: 'Checklist submitted successfully for the day!'
      });

      fetchData(); 
    } catch (error) {
      console.error("Submit Error:", error);
      setNotification({ show: true, type: 'error', message: 'Failed to submit checklist data.' });
    }
  };

  const inputStyle = "w-full border-2 border-gray-300 bg-white rounded-lg p-3 text-sm text-gray-900 font-medium focus:border-red-500 outline-none shadow-sm placeholder-gray-500";

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 flex justify-center pb-24">
      <NotificationModal 
        data={notification} 
        onClose={() => setNotification({ ...notification, show: false })} 
      />

      <div className="w-full max-w-6xl bg-white shadow-xl rounded-2xl overflow-visible relative flex flex-col">
        
        {/* Header */}
        <div className="bg-gray-900 py-6 px-8 flex justify-between items-center rounded-t-2xl flex-shrink-0">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="text-orange-500 text-2xl">📋</span> Operator Checklist
          </h2>
          
          <div className="flex items-center gap-3">
             <span className="text-orange-400 text-lg font-black uppercase tracking-wider">Date:</span>
             <input 
              type="date" 
              value={headerData.date}
              onChange={(e) => setHeaderData({...headerData, date: e.target.value})}
              className="bg-white text-gray-900 font-bold border-2 border-orange-500 rounded-md p-2 text-lg focus:outline-none focus:ring-4 focus:ring-orange-500/50 shadow-lg"
              style={{ colorScheme: 'light' }} 
            />
          </div>
        </div>

        {/* Checklist Table */}
        <div className="p-6 overflow-x-auto min-h-[500px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b-2 border-orange-100">
                <th className="py-3 pl-2 w-12">#</th>
                <th className="py-3 w-1/3">Check Point</th>
                <th className="py-3">Method</th>
                <th className="py-3 text-center w-24">OK</th>
                <th className="py-3 text-center w-24">Not OK</th>
              </tr>
            </thead>
            <tbody>
              {checklist.length === 0 ? (
                 <tr><td colSpan="5" className="text-center py-4 text-gray-500">Loading or No Data...</td></tr>
              ) : checklist.map((item) => {
                const hasReport = !!reportsMap[item.ChecklistId];
                
                return (
                  <tr key={item.ChecklistId} className={`border-b border-gray-100 transition-colors ${hasReport ? 'bg-red-50' : 'hover:bg-orange-50/20'}`}>
                    <td className="py-4 pl-2 font-bold text-gray-400">{item.SlNo}</td>
                    <td className="py-4 font-bold text-gray-800 text-sm">{item.CheckPoint}</td>
                    <td className="py-4">
                      <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                        {item.CheckMethod}
                      </span>
                    </td>
                    
                    {/* OK Checkbox */}
                    <td className="py-4 text-center">
                      <div 
                        onClick={() => !hasReport && handleOkClick(item)}
                        className={`w-6 h-6 mx-auto rounded border-2 flex items-center justify-center cursor-pointer transition-all
                          ${item.IsDone && !hasReport 
                            ? 'bg-green-500 border-green-500 text-white scale-110 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-green-400'
                          } ${hasReport ? 'opacity-20 cursor-not-allowed' : ''}`}
                      >
                        {item.IsDone && !hasReport && "✓"}
                      </div>
                    </td>

                    {/* Not OK Checkbox */}
                    <td className="py-4 text-center">
                      <div 
                        onClick={() => handleNotOkClick(item)}
                        className={`w-6 h-6 mx-auto rounded border-2 flex items-center justify-center cursor-pointer transition-all
                          ${hasReport 
                            ? 'bg-red-500 border-red-500 text-white scale-110 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-red-400'
                          }`}
                      >
                        {hasReport && "✕"}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div id="checklist-footer" className="bg-slate-100 p-8 border-t border-gray-200 sticky bottom-0 z-20 flex flex-col md:flex-row justify-end items-end md:items-center gap-6 rounded-b-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
           <div className="w-full md:w-64">
             <label className="text-[11px] font-black text-gray-600 uppercase block mb-1 tracking-wider">
               Checklist Verified By (Operator)
             </label>
             <SearchableSelect 
               options={operators}
               displayKey="OperatorName"
               value={headerData.operatorName}
               onSelect={(op) => setHeaderData(prev => ({...prev, operatorName: op.OperatorName}))}
               placeholder="Select Name to Sign..."
             />
           </div>

           <button
             onClick={handleBatchSubmit}
             className="bg-gray-900 hover:bg-orange-600 text-white font-bold py-3 px-10 rounded-lg shadow-lg uppercase tracking-wider transition-all transform active:scale-95 h-[46px] mt-auto"
           >
             Submit Checklist
           </button>
        </div>

      </div>

      {/* NC Modal (Same as before) */}
      {isModalOpen && modalItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-red-600 p-5 flex justify-between items-center">
              <div className="text-white">
                <h3 className="font-bold uppercase text-sm tracking-wider">Non-Conformance Report</h3>
                <p className="text-xs opacity-80 mt-1">Item #{modalItem.SlNo}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:bg-red-700 rounded-full p-1 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex justify-between items-start">
                <div>
                    <p className="text-[10px] text-red-500 uppercase font-bold">Issue With</p>
                    <p className="font-bold text-gray-800">{modalItem.CheckPoint}</p>
                </div>
                <div className="text-right">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${ncForm.status === 'Pending' ? 'bg-orange-200 text-orange-800' : 'bg-green-200 text-green-800'}`}>
                        {ncForm.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Signed By: <strong>{ncForm.sign || headerData.operatorName}</strong></p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Non-Conformity Details <span className="text-red-500">*</span></label>
                  <textarea 
                    rows="2"
                    className={inputStyle}
                    value={ncForm.ncDetails}
                    onChange={e => setNcForm({...ncForm, ncDetails: e.target.value})}
                    placeholder="Describe the issue..."
                  ></textarea>
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Correction</label>
                   <input type="text" className={inputStyle} value={ncForm.correction} onChange={e => setNcForm({...ncForm, correction: e.target.value})} />
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Root Cause</label>
                   <input type="text" className={inputStyle} value={ncForm.rootCause} onChange={e => setNcForm({...ncForm, rootCause: e.target.value})} />
                </div>
                <div className="col-span-2">
                   <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Corrective Action</label>
                   <textarea rows="2" className={inputStyle} value={ncForm.correctiveAction} onChange={e => setNcForm({...ncForm, correctiveAction: e.target.value})}></textarea>
                </div>
                <div className="col-span-1">
                   <SearchableSelect 
                     label="Responsibility *"
                     options={operators}
                     displayKey="OperatorName"
                     value={ncForm.responsibility}
                     onSelect={(op) => setNcForm(prev => ({...prev, responsibility: op.OperatorName}))}
                     placeholder="Select Person"
                   />
                </div>
                <div className="col-span-1">
                   <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Target Date</label>
                   <input 
                      type="date" 
                      className={inputStyle}
                      value={ncForm.targetDate}
                      onChange={e => setNcForm({...ncForm, targetDate: e.target.value})}
                   />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button 
                  onClick={submitReport}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg uppercase tracking-wider shadow-lg transition-colors"
                >
                  Save & Log Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisaMachineCheckList;