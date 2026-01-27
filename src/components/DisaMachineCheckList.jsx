import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, CheckCircle, AlertTriangle, FileDown, Loader } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const NotificationModal = ({ data, onClose }) => {
  if (!data.show) return null;
  const isError = data.type === 'error';
  const isLoading = data.type === 'loading';
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`border-2 w-full max-w-md p-6 rounded-2xl shadow-2xl bg-white ${isError ? 'border-red-200' : 'border-green-200'}`}>
        <div className="flex items-center gap-4">
           {isLoading ? <Loader className="animate-spin text-blue-600" /> : isError ? <AlertTriangle className="text-red-600" /> : <CheckCircle className="text-green-600" />}
           <div>
             <h3 className="font-bold text-lg">{isLoading ? 'Processing...' : isError ? 'Error' : 'Success'}</h3>
             <p className="text-sm text-gray-600">{data.message}</p>
           </div>
        </div>
        {!isLoading && <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded text-sm font-bold float-right">Close</button>}
      </div>
    </div>
  );
};

const SearchableSelect = ({ label, options, displayKey, onSelect, value, placeholder }) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => { if (value) setSearch(value); }, [value]);
  const filtered = options.filter((item) => item[displayKey]?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="relative w-full">
      {label && <label className="text-[11px] font-black text-gray-800 uppercase block mb-1 tracking-wider">{label}</label>}
      <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} className="w-full p-3 text-sm font-bold border-2 border-gray-600 bg-white text-gray-900 rounded-lg outline-none focus:border-orange-600 placeholder-gray-500 shadow-sm" placeholder={placeholder || "Search..."} />
      {open && <ul className="absolute bottom-full mb-1 z-50 bg-white border-2 border-gray-400 w-full max-h-60 overflow-y-auto rounded-lg shadow-2xl">
        {filtered.length > 0 ? filtered.map((item, index) => (
          <li key={index} onClick={() => { setSearch(item[displayKey]); setOpen(false); onSelect(item); }} className="p-3 hover:bg-orange-100 cursor-pointer text-sm font-bold border-b border-gray-200 text-gray-900">{item[displayKey]}</li>
        )) : <li className="p-3 text-gray-500 text-sm font-medium">No results</li>}
      </ul>}
      {open && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpen(false)} />}
    </div>
  );
};

const DisaMachineCheckList = () => {
  const [checklist, setChecklist] = useState([]);
  const [operators, setOperators] = useState([]);
  const [reportsMap, setReportsMap] = useState({}); 
  const [headerData, setHeaderData] = useState({ 
      date: new Date().toISOString().split('T')[0], 
      operatorName: '',
      disaMachine: 'DISA - I' // Default
  });
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [ncForm, setNcForm] = useState({ ncDetails: '', correction: '', rootCause: '', correctiveAction: '', targetDate: new Date().toISOString().split('T')[0], responsibility: '', sign: '', status: 'Pending' });

  // Machines List for Dropdown
  const machineOptions = [
      { id: 1, name: 'DISA - I' },
      { id: 2, name: 'DISA - II' },
      { id: 3, name: 'DISA - III' },
  ];

  // Re-fetch data when Date OR Machine changes
  useEffect(() => { fetchData(); }, [headerData.date, headerData.disaMachine]); 

  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/disa-checklist/details', { 
          params: { date: headerData.date, disaMachine: headerData.disaMachine } 
      });
      
      setOperators(res.data.operators);
      
      const mergedList = res.data.checklist.map(item => ({
          ...item,
          IsDone: item.IsDone === true || item.IsDone === 1 
      }));

      setChecklist(mergedList);

      const reportsObj = {};
      res.data.reports.forEach(r => { reportsObj[r.MasterId] = r; });
      setReportsMap(reportsObj);

    } catch (error) { 
        console.error("Fetch Error:", error);
        setNotification({ show: true, type: 'error', message: "Failed to load data." });
    }
  };

  const handleOkClick = (item) => {
    setChecklist(prev => prev.map(c => c.MasterId === item.MasterId ? { ...c, IsDone: !c.IsDone } : c));
  };

  const handleNotOkClick = (item) => {
    if (!headerData.operatorName) {
      document.getElementById('checklist-footer')?.scrollIntoView({ behavior: 'smooth' });
      return setNotification({ show: true, type: 'error', message: 'Please select the Operator Name at the bottom.' });
    }
    setModalItem(item);
    const existingReport = reportsMap[item.MasterId];
    if (existingReport) {
      setNcForm({ ncDetails: existingReport.NonConformityDetails, correction: existingReport.Correction, rootCause: existingReport.RootCause, correctiveAction: existingReport.CorrectiveAction, targetDate: existingReport.TargetDate.split('T')[0], responsibility: existingReport.Responsibility, sign: existingReport.Sign, status: existingReport.Status });
    } else {
      setNcForm({ ncDetails: '', correction: '', rootCause: '', correctiveAction: '', targetDate: headerData.date, responsibility: '', sign: headerData.operatorName, status: 'Pending' });
    }
    setIsModalOpen(true);
  };

  const submitReport = async () => {
    if (!ncForm.ncDetails || !ncForm.responsibility) return setNotification({ show: true, type: 'error', message: 'Details and Responsibility are mandatory.' });
    try {
      await axios.post('http://localhost:5000/api/disa-checklist/report-nc', { 
          checklistId: modalItem.MasterId, 
          slNo: modalItem.SlNo, 
          reportDate: headerData.date, 
          disaMachine: headerData.disaMachine,
          ...ncForm 
      });
      setNotification({ show: true, type: 'success', message: 'Report Logged Successfully.' });
      setIsModalOpen(false);
      setReportsMap(prev => ({ ...prev, [modalItem.MasterId]: { ...ncForm, MasterId: modalItem.MasterId, Status: 'Pending', Name: ncForm.sign } }));
      setChecklist(prev => prev.map(c => c.MasterId === modalItem.MasterId ? { ...c, IsDone: false } : c));
    } catch (error) { setNotification({ show: true, type: 'error', message: 'Failed to save report.' }); }
  };

  const handleBatchSubmit = async () => {
    if (!headerData.operatorName) return setNotification({ show: true, type: 'error', message: 'Select Operator Name before submitting.' });
    
    const pendingItems = checklist.filter(item => !item.IsDone && !reportsMap[item.MasterId]);
    if (pendingItems.length > 0) return setNotification({ show: true, type: 'error', message: `Cannot submit. ${pendingItems.length} items are unchecked.` });

    try {
      const itemsToSave = checklist.map(item => ({ MasterId: item.MasterId, IsDone: item.IsDone }));
      await axios.post('http://localhost:5000/api/disa-checklist/submit-batch', { 
          items: itemsToSave, 
          sign: headerData.operatorName, 
          date: headerData.date,
          disaMachine: headerData.disaMachine 
      });
      setNotification({ show: true, type: 'success', message: 'Checklist Saved Successfully!' });
      fetchData(); 
    } catch (error) { setNotification({ show: true, type: 'error', message: 'Submit failed.' }); }
  };

  const generatePDF = async () => {
    setNotification({ show: true, type: 'loading', message: 'Generating PDF...' });

    try {
      const selectedDate = new Date(headerData.date);
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;

      // 1. Fetch Data (Checklist + NCR)
      let monthlyLogs = [];
      let ncReports = [];
      
      try {
          const res = await axios.get('http://localhost:5000/api/disa-checklist/monthly-report', { 
              params: { month, year, disaMachine: headerData.disaMachine } 
          });
          monthlyLogs = res.data.monthlyLogs || [];
          ncReports = res.data.ncReports || []; // Capture NCR Data
      } catch (backendErr) { 
          console.warn(backendErr); 
      }

      // ... [Keep existing historyMap logic] ...
      const historyMap = {};
      monthlyLogs.forEach(log => {
        const logDay = log.DayVal; 
        const key = String(log.MasterId); 
        if (!historyMap[key]) historyMap[key] = {};
        if (log.IsDone == 1) historyMap[key][logDay] = 'Y';
        else historyMap[key][logDay] = 'N'; 
      });

      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
      const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

      // ==========================================
      // PAGE 1: CHECKLIST (Existing Logic)
      // ==========================================
      
      // Header Page 1
      doc.setLineWidth(0.3);
      doc.rect(10, 10, 40, 20); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text("SAKTHI", 30, 18, { align: 'center' }); doc.text("AUTO", 30, 26, { align: 'center' });
      doc.rect(50, 10, 180, 20); doc.setFontSize(16);
      doc.text("DISA MACHINE OPERATOR CHECK SHEET", 140, 22, { align: 'center' });
      
      doc.rect(230, 10, 57, 20); doc.setFontSize(11);
      doc.text(headerData.disaMachine, 258, 18, { align: 'center' }); 
      doc.line(230, 22, 287, 22);
      doc.setFontSize(10); doc.text(`Month: ${monthName}`, 235, 27);

      const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
      
      // Table Body Construction (Existing)
      const tableBody = checklist.map(item => {
        const row = [String(item.SlNo), item.CheckPointDesc, item.CheckMethod];
        const dayColumns = days.map(d => {
            const dayNum = parseInt(d);
            const key = String(item.MasterId);
            return historyMap[key]?.[dayNum] || ''; 
        });
        return [...row, ...dayColumns];
      });

      const emptyDays = Array(31).fill("");
      const footerRows = [
          ["", "SIGNATURE", "", ...emptyDays],
          ["", "OPERATOR", "", ...emptyDays],
          ["", "HOD - MOU", "", ...emptyDays]
      ];

      // Dynamic column styles for days (Existing)
      const dynamicColumnStyles = {};
      for (let i = 3; i < 34; i++) {
        dynamicColumnStyles[i] = { cellWidth: 5, halign: 'center' }; 
      }

      autoTable(doc, {
        startY: 35,
        head: [[
          { content: 'Sl.No', styles: { halign: 'center', valign: 'middle' } },
          { content: 'CHECK POINTS', styles: { halign: 'center', valign: 'middle' } },
          { content: 'CHECK METHOD', styles: { halign: 'center', valign: 'middle' } },
          ...days.map(d => ({ content: d, styles: { halign: 'center' } }))
        ]],
        body: [...tableBody, ...footerRows],
        theme: 'grid',
        styles: { fontSize: 6, cellPadding: 0.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], valign: 'middle' },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
        columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 60 }, 2: { cellWidth: 25 }, ...dynamicColumnStyles },
        didParseCell: function(data) {
           if (data.row.index >= tableBody.length && data.column.index === 1) data.cell.styles.fontStyle = 'bold';
           if (data.column.index > 2) {
             const text = data.cell.text[0];
             if (text === 'Y') {
                data.cell.styles.font = 'ZapfDingbats';
                data.cell.text = '3'; 
                data.cell.styles.textColor = [0, 100, 0];
             } else if (text === 'N') {
                data.cell.styles.textColor = [255, 0, 0];
                data.cell.text = 'X'; 
                data.cell.styles.fontStyle = 'bold';
             }
           }
        }
      });

      const finalY = doc.lastAutoTable.finalY + 6;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text("Note: If any deviation noticed during the verification, corrective actions should be taken and recorded in the NCR (back-side).", 10, finalY);
      doc.text("QF/07/FBP-13, Rev.No:06 dt 08.10.2025", 10, 200);
      doc.text("Page 1 of 2", 270, 200);

      // ==========================================
      // PAGE 2: NON-CONFORMANCE REPORT
      // ==========================================
      
      doc.addPage(); // Add the new page

      // -- Header Page 2 --
      doc.setDrawColor(0); doc.setLineWidth(0.3);
      
      // Logo Box
      doc.rect(10, 10, 40, 20);
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text("SAKTHI", 30, 18, { align: 'center' }); 
      doc.text("AUTO", 30, 26, { align: 'center' });

      // Title Box
      doc.rect(50, 10, 237, 20);
      doc.setFontSize(16);
      doc.text("DISA MACHINE OPERATOR CHECK SHEET", 168, 18, { align: 'center' });
      doc.setFontSize(14);
      doc.text("Non-Conformance Report", 168, 26, { align: 'center' }); // Sub-title

      // -- NCR Table Data Preparation --
      // Map the fetched NC data to table rows
      const ncRows = ncReports.map((report, index) => [
        index + 1,
        new Date(report.ReportDate).toLocaleDateString('en-GB'), // DD/MM/YYYY
        report.NonConformityDetails || '',
        report.Correction || '',
        report.RootCause || '',
        report.CorrectiveAction || '',
        report.TargetDate ? new Date(report.TargetDate).toLocaleDateString('en-GB') : '',
        report.Responsibility || '',
        report.Sign || '', // Signature
        report.Status || ''
      ]);

      // If no data, add empty rows to maintain structure layout
      if(ncRows.length === 0) {
        for(let i=0; i<5; i++) ncRows.push(['', '', '', '', '', '', '', '', '', '']);
      }

      autoTable(doc, {
        startY: 35,
        head: [[
          'S.No', 
          'Date', 
          'Non-Conformities Details', 
          'Correction', 
          'Root Cause', 
          'Corrective Action', 
          'Target Date', 
          'Responsibility', 
          'Name', 
          'Status'
        ]],
        body: ncRows,
        theme: 'grid',
        styles: { 
            fontSize: 8, 
            cellPadding: 2, 
            lineColor: [0, 0, 0], 
            lineWidth: 0.1, 
            textColor: [0, 0, 0], 
            valign: 'top',
            overflow: 'linebreak' // Wrap long text
        },
        headStyles: { 
            fillColor: [255, 255, 255], 
            textColor: [0, 0, 0], 
            lineWidth: 0.1, 
            lineColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' }, // S.No
            1: { cellWidth: 20, halign: 'center' }, // Date
            2: { cellWidth: 40 }, // Details
            3: { cellWidth: 35 }, // Correction
            4: { cellWidth: 35 }, // Root Cause
            5: { cellWidth: 35 }, // Corrective Action
            6: { cellWidth: 20, halign: 'center' }, // Target Date
            7: { cellWidth: 25 }, // Responsibility
            8: { cellWidth: 20 }, // Sign
            9: { cellWidth: 20, halign: 'center' }  // Status
        }
      });

      // Footer Page 2
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text("QF/07/FBP-13, Rev.No:06 dt 08.10.2025", 10, 200);
      doc.text("Page 2 of 2", 270, 200);

      doc.save(`Disa_Checklist_Report_${headerData.date}.pdf`);
      setNotification({ show: false });

    } catch (error) {
      console.error("PDF Gen Error:", error);
      setNotification({ show: true, type: 'error', message: `PDF Generation Failed: ${error.message}` });
    }
  };

  const inputStyle = "w-full border-2 border-gray-300 bg-white rounded-lg p-3 text-sm text-gray-900 font-medium focus:border-red-500 outline-none shadow-sm placeholder-gray-500";

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 flex justify-center pb-24">
      <NotificationModal data={notification} onClose={() => setNotification({ ...notification, show: false })} />

      <div className="w-full max-w-6xl bg-white shadow-xl rounded-2xl flex flex-col">
        <div className="bg-gray-900 py-6 px-8 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="text-orange-500 text-2xl">📋</span> Operator Checklist
          </h2>
          <div className="flex items-center gap-3">
             {/* Machine Dropdown */}
             <select 
               value={headerData.disaMachine}
               onChange={(e) => setHeaderData({...headerData, disaMachine: e.target.value})}
               className="bg-gray-800 text-white font-bold border-2 border-orange-500 rounded-md p-2 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
             >
                <option value="DISA - I">DISA - I</option>
                <option value="DISA - II">DISA - II</option>
                <option value="DISA - III">DISA - III</option>
             </select>

             <span className="text-orange-400 text-lg font-black uppercase tracking-wider">Date:</span>
             <input type="date" value={headerData.date} onChange={(e) => setHeaderData({...headerData, date: e.target.value})} className="bg-white text-gray-900 font-bold border-2 border-orange-500 rounded-md p-2 text-lg focus:outline-none focus:ring-4 focus:ring-orange-500/50 shadow-lg" style={{ colorScheme: 'light' }} />
          </div>
        </div>

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
              {checklist.length === 0 ? <tr><td colSpan="5" className="text-center py-4 text-gray-500">Loading...</td></tr> : checklist.map((item) => {
                const hasReport = !!reportsMap[item.MasterId];
                return (
                  <tr key={item.MasterId} className={`border-b border-gray-100 ${hasReport ? 'bg-red-50' : 'hover:bg-orange-50/20'}`}>
                    <td className="py-4 pl-2 font-bold text-gray-400">{item.SlNo}</td>
                    <td className="py-4 font-bold text-gray-800 text-sm">{item.CheckPointDesc}</td>
                    <td className="py-4"><span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded uppercase">{item.CheckMethod}</span></td>
                    <td className="py-4 text-center">
                      <div onClick={() => !hasReport && handleOkClick(item)} className={`w-6 h-6 mx-auto rounded border-2 flex items-center justify-center cursor-pointer ${item.IsDone && !hasReport ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'} ${hasReport ? 'opacity-20 cursor-not-allowed' : ''}`}>{item.IsDone && !hasReport && "✓"}</div>
                    </td>
                    <td className="py-4 text-center">
                      <div onClick={() => handleNotOkClick(item)} className={`w-6 h-6 mx-auto rounded border-2 flex items-center justify-center cursor-pointer ${hasReport ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 bg-white hover:border-red-400'}`}>{hasReport && "✕"}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div id="checklist-footer" className="bg-slate-100 p-8 border-t border-gray-200 sticky bottom-0 z-20 flex flex-col md:flex-row justify-end gap-6 rounded-b-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
           <div className="w-full md:w-64">
             <label className="text-[11px] font-black text-gray-600 uppercase block mb-1">Checklist Verified By</label>
             <SearchableSelect options={operators} displayKey="OperatorName" value={headerData.operatorName} onSelect={(op) => setHeaderData(prev => ({...prev, operatorName: op.OperatorName}))} placeholder="Select Name..." />
           </div>
           <button onClick={generatePDF} className="bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-200 font-bold py-3 px-6 rounded-lg shadow-md uppercase flex items-center gap-2 mt-auto">
             <FileDown size={20} /> PDF
           </button>
           <button onClick={handleBatchSubmit} className="bg-gray-900 hover:bg-orange-600 text-white font-bold py-3 px-10 rounded-lg shadow-lg uppercase mt-auto">
             Submit Checklist
           </button>
        </div>
      </div>

      {isModalOpen && modalItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-red-600 p-5 flex justify-between items-center text-white">
              <div><h3 className="font-bold uppercase text-sm">Non-Conformance Report</h3><p className="text-xs opacity-80 mt-1">Item #{modalItem.SlNo}</p></div>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-red-700 rounded-full p-1"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex justify-between"><p className="font-bold text-gray-800">{modalItem.CheckPointDesc}</p><span className="text-[10px] bg-orange-200 text-orange-800 px-2 py-1 rounded font-bold">{ncForm.status}</span></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2"><label className="text-xs font-bold text-gray-500 block mb-1">NC Details</label><textarea rows="2" className={inputStyle} value={ncForm.ncDetails} onChange={e => setNcForm({...ncForm, ncDetails: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-gray-500 block mb-1">Correction</label><input className={inputStyle} value={ncForm.correction} onChange={e => setNcForm({...ncForm, correction: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-gray-500 block mb-1">Root Cause</label><input className={inputStyle} value={ncForm.rootCause} onChange={e => setNcForm({...ncForm, rootCause: e.target.value})} /></div>
                <div className="col-span-2"><label className="text-xs font-bold text-gray-500 block mb-1">Corrective Action</label><textarea rows="2" className={inputStyle} value={ncForm.correctiveAction} onChange={e => setNcForm({...ncForm, correctiveAction: e.target.value})} /></div>
                <div className="col-span-1"><SearchableSelect label="Responsibility" options={operators} displayKey="OperatorName" value={ncForm.responsibility} onSelect={(op) => setNcForm(prev => ({...prev, responsibility: op.OperatorName}))} /></div>
                <div className="col-span-1"><label className="text-xs font-bold text-gray-500 block mb-1">Target Date</label><input type="date" className={inputStyle} value={ncForm.targetDate} onChange={e => setNcForm({...ncForm, targetDate: e.target.value})} /></div>
              </div>
              <div className="pt-4 border-t border-gray-100"><button onClick={submitReport} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg uppercase shadow-lg">Save Report</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisaMachineCheckList;