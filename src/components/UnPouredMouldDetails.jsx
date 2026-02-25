import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, CheckCircle, AlertTriangle, Save, Loader, FileDown } from 'lucide-react';
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

const getShiftDate = () => {
  const now = new Date();
  if (now.getHours() < 7) now.setDate(now.getDate() - 1);
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const UnPouredMouldDetails = () => {
  const [headerData, setHeaderData] = useState({ date: getShiftDate(), disaMachine: 'DISA - I' });
  const [columns, setColumns] = useState([]);
  const [shiftsData, setShiftsData] = useState({ 1: {}, 2: {}, 3: {} });
  const [unpouredSummary, setUnpouredSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  useEffect(() => { fetchData(); }, [headerData.date, headerData.disaMachine]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Shift Breakdown (Top Table)
      const res = await axios.get('http://localhost:5000/api/unpoured-moulds/details', {
        params: { date: headerData.date, disa: headerData.disaMachine }
      });
      setColumns(res.data.masterCols || []);
      setShiftsData(res.data.shiftsData || { 1: {}, 2: {}, 3: {} });

      // 2. Fetch Unpoured Details Summary (Bottom Tables)
      const summaryRes = await axios.get('http://localhost:5000/api/unpoured-details', { 
        params: { date: headerData.date } 
      });
      setUnpouredSummary(summaryRes.data || []);

    } catch (error) {
      setNotification({ show: true, type: 'error', message: "Failed to load data." });
    }
    setLoading(false);
  };

  const handleInputChange = (shift, key, value) => {
    setShiftsData(prev => ({
      ...prev,
      [shift]: { ...prev[shift], [key]: value }
    }));
  };

  // --- Calculations for Top Table ---
  const getRowTotal = (shift) => columns.reduce((sum, col) => sum + (parseInt(shiftsData[shift][col.key]) || 0), 0);
  const getColTotal = (key) => [1, 2, 3].reduce((sum, shift) => sum + (parseInt(shiftsData[shift][key]) || 0), 0);
  const getGrandTotal = () => [1, 2, 3].reduce((sum, shift) => sum + getRowTotal(shift), 0);

  // --- Calculations for Bottom Tables ---
  const getSummarySum = (key) => unpouredSummary.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
  const totalProduced = getSummarySum("producedMould");
  const totalPoured = getSummarySum("pouredMould");
  const totalUnpoured = getSummarySum("unpouredMould");
  const totalPercentage = totalProduced > 0 ? ((totalUnpoured / totalProduced) * 100).toFixed(2) : 0;
  const totalDelays = getSummarySum("delays");
  const totalRunningHours = getSummarySum("runningHours").toFixed(2);
  const getDisaData = (disaName) => unpouredSummary.find(d => d.disa === disaName) || {};

 const handleSave = async () => {
    setLoading(true);
    const payloadData = { ...shiftsData };
    [1, 2, 3].forEach(s => { payloadData[s].rowTotal = getRowTotal(s); });

    try {
      // 1. Save Upper Table (Shift Breakdown)
      await axios.post('http://localhost:5000/api/unpoured-moulds/save', {
        date: headerData.date,
        disa: headerData.disaMachine,
        shiftsData: payloadData
      });

      // 2. NEW: Save Lower Tables (Mould Details Summary snapshot)
      await axios.post('http://localhost:5000/api/unpoured-summary/save', {
        date: headerData.date,
        summaryData: unpouredSummary // Passes the auto-calculated array to the backend
      });

      setNotification({ show: true, type: 'success', message: 'All Data Saved Successfully!' });
      setTimeout(() => setNotification({ show: false }), 3000);
    } catch (error) {
      setNotification({ show: true, type: 'error', message: 'Failed to save data.' });
    }
    setLoading(false);
  };

  const generatePDF = () => {
    setNotification({ show: true, type: 'loading', message: 'Generating PDF...' });

    try {
      const doc = new jsPDF('l', 'mm', 'a4');

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("UN POURED MOULD DETAILS", 148.5, 15, { align: 'center' });

      doc.setFontSize(11);
      doc.text(` ${headerData.disaMachine}`, 8, 25);
      const formattedDate = new Date(headerData.date).toLocaleDateString('en-GB');
      doc.text(`DATE: ${formattedDate}`, 289 - doc.getTextWidth(`DATE: ${formattedDate}`) - 8, 25);

      // --- 1. SHIFTS TABLE ---
      const headRow1 = [
        { content: 'SHIFT', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'MOULDING', colSpan: 6, styles: { halign: 'center' } },
        { content: 'SAND PLANT', colSpan: 2, styles: { halign: 'center' } },
        { content: 'PREESPOUR', colSpan: 4, styles: { halign: 'center' } },
        { content: 'QUALITY CONTROL', colSpan: 5, styles: { halign: 'center' } },
        { content: 'MAINTENANCE', colSpan: 1, styles: { halign: 'center' } },
        { content: 'FURNACE', colSpan: 1, styles: { halign: 'center' } },
        { content: 'TOOLING', colSpan: 1, styles: { halign: 'center' } },
        { content: 'OTHERS', colSpan: 4, styles: { halign: 'center' } },
        { content: 'TOTAL', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [220, 220, 220] } }
      ];

      const headRow2 = columns.map(col => ({
        content: col.label, 
        styles: { halign: 'center', valign: 'middle', fontSize: 5.5 } 
      }));

      const bodyRows = [1, 2, 3].map(shift => {
        const row = [shift.toString()];
        columns.forEach(col => {
          const val = shiftsData[shift][col.key];
          row.push(val === '' || val === null || val === undefined ? '-' : val.toString());
        });
        const rowTotal = getRowTotal(shift);
        row.push(rowTotal === 0 ? '-' : rowTotal.toString());
        return row;
      });

      const totalRow = ['TOTAL'];
      columns.forEach(col => {
        const colTotal = getColTotal(col.key);
        totalRow.push(colTotal === 0 ? '-' : colTotal.toString());
      });
      const grandTotal = getGrandTotal();
      totalRow.push(grandTotal === 0 ? '-' : grandTotal.toString());
      bodyRows.push(totalRow);

      autoTable(doc, {
        startY: 32,
        margin: { left: 5, right: 5 },
        head: [headRow1, headRow2],
        body: bodyRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: { top: 3.5, right: 1, bottom: 3.5, left: 1 }, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0], halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', minCellHeight: 12 },
        bodyStyles: { minCellHeight: 10 },
        didParseCell: function (data) {
          if (data.section === 'body' && data.row.index === bodyRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        }
      });

      // --- 2. UNPOURED DETAILS MASTER TABLE ---
      const summaryBodyRows = ['I', 'II', 'III', 'IV'].map(disa => {
        const row = getDisaData(disa);
        return [
          disa, 
          row.mouldCounterClose ?? '-', 
          row.mouldCounterOpen ?? '-', 
          row.producedMould ?? '0', 
          row.pouredMould ?? '0', 
          row.unpouredMould ?? '0', 
          row.percentage !== undefined ? `${row.percentage}%` : '0%', 
          row.delays ?? '0', 
          row.producedMhr ?? '-', 
          row.pouredMhr ?? '-', 
          row.runningHours ?? '0'
        ];
      });
      summaryBodyRows.push(['TOTAL', '-', '-', totalProduced, totalPoured, totalUnpoured, `${totalPercentage}%`, totalDelays, '-', '-', totalRunningHours]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 15,
        head: [['DISA', 'MOULD COUNTER\nCLOSE', 'MOULD COUNTER\nOPEN', 'PRODUCED\nMOULD', 'POURED\nMOULD', 'UNPOURED\nMOULD', '%', 'DELAYS', 'PRODUCED\nM/HR', 'POURED\nM/HR', 'RUNNING\nHOURS']],
        body: summaryBodyRows,
        theme: 'grid',
        styles: { fontSize: 8, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0], halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        didParseCell: function (data) {
            if (data.section === 'body' && data.row.index === summaryBodyRows.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 240, 240];
            }
          }
      });

      // --- 3. SIDE-BY-SIDE SUMMARY TABLES ---
      const splitStartY = doc.lastAutoTable.finalY + 10;

      // Table A: No of Moulds / Day (Left)
      autoTable(doc, {
        startY: splitStartY,
        margin: { right: 155 },
        head: [[{ content: 'NO. OF MOULDS/DAY', colSpan: 5, styles: { halign: 'left' } }], ['', 'DISA 1', 'DISA 2', 'DISA 3', 'DISA 4']],
        body: [
            ['MOULD / DAY', getDisaData('I').producedMould ?? '0', getDisaData('II').producedMould ?? '0', getDisaData('III').producedMould ?? '0', getDisaData('IV').producedMould ?? '0'],
            ['TOTAL', { content: totalProduced, colSpan: 4 }]
        ],
        theme: 'grid',
        styles: { fontSize: 8, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0], halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        didParseCell: function (data) {
            if (data.section === 'body' && data.row.index === 1) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [240, 240, 240]; }
            if (data.section === 'body' && data.column.index === 0) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [250, 250, 250]; }
        }
      });

      // Table B: No of Quantity / Day (Right)
      autoTable(doc, {
        startY: splitStartY,
        margin: { left: 155 },
        head: [[{ content: 'NO. OF QUANTITY/DAY', colSpan: 5, styles: { halign: 'left' } }], ['', 'DISA 1', 'DISA 2', 'DISA 3', 'DISA 4']],
        body: [
            ['QTY / DAY', getDisaData('I').pouredMould ?? '0', getDisaData('II').pouredMould ?? '0', getDisaData('III').pouredMould ?? '0', getDisaData('IV').pouredMould ?? '0'],
            ['TOTAL', { content: totalPoured, colSpan: 4 }]
        ],
        theme: 'grid',
        styles: { fontSize: 8, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0], halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        didParseCell: function (data) {
            if (data.section === 'body' && data.row.index === 1) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [240, 240, 240]; }
            if (data.section === 'body' && data.column.index === 0) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [250, 250, 250]; }
        }
      });

      // --- ADDED FOOTER HERE ---
      doc.setFontSize(8);
      doc.text("QF/07/FBP-13, Rev.No:06 dt 08.10.2025", 10, 200);

      doc.save(`UnPoured_Mould_Details_${headerData.date}.pdf`);
      setNotification({ show: false, type: '', message: '' });

    } catch (error) {
      console.error("PDF Gen Error:", error);
      setNotification({ show: true, type: 'error', message: `PDF Generation Failed: ${error.message}` });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 flex justify-center pb-24">
      <NotificationModal data={notification} onClose={() => setNotification({ ...notification, show: false })} />

      <div className="w-full max-w-[98%] bg-white shadow-xl rounded-2xl flex flex-col overflow-hidden">
        {/* --- Header Bar --- */}
        <div className="bg-gray-900 py-6 px-8 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="text-orange-500 text-2xl">📉</span> Un Poured Mould Details
          </h2>
          <div className="flex items-center gap-3">
            <select
              value={headerData.disaMachine}
              onChange={(e) => setHeaderData({ ...headerData, disaMachine: e.target.value })}
              className="bg-gray-800 text-white font-bold border-2 border-orange-500 rounded-md p-2 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="DISA - I">DISA - I</option>
              <option value="DISA - II">DISA - II</option>
              <option value="DISA - III">DISA - III</option>
              <option value="DISA - IV">DISA - IV</option>
            </select>

            <span className="text-orange-400 text-lg font-black uppercase tracking-wider">Date:</span>
            <div className="bg-gray-100 text-gray-600 font-bold border-2 border-gray-400 rounded-md p-2 text-lg cursor-not-allowed shadow-inner select-none">
              {new Date(headerData.date).toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>

        {/* --- Shift Breakdown Table --- */}
        <div className="p-6 overflow-x-auto min-h-[300px] custom-scrollbar">
          <table className="w-full text-center border-collapse table-fixed min-w-[2300px]">
            <thead className="bg-gray-100">
              <tr className="text-xs text-gray-600 uppercase border-y-2 border-orange-200">
                <th className="border border-gray-300 p-3 w-20 bg-gray-100 z-10" rowSpan="2">SHIFT</th>
                {(() => {
                  const groups = [];
                  columns.forEach(col => {
                    if (groups.length === 0 || groups[groups.length - 1].name !== col.group) {
                      groups.push({ name: col.group, count: 1 });
                    } else { groups[groups.length - 1].count++; }
                  });
                  return groups.map((g, i) => (
                    <th key={i} className="border border-gray-300 p-2 border-r-2 border-r-gray-400" colSpan={g.count}>{g.name}</th>
                  ));
                })()}
                <th className="border border-gray-300 p-3 w-24 bg-gray-200 z-10 border-l-2 border-l-orange-300" rowSpan="2">TOTAL</th>
              </tr>
              <tr className="text-[10px] text-gray-500 uppercase tracking-wide bg-gray-50">
                {columns.map((col, idx) => (
                  <th key={idx} className={`border border-gray-300 p-2 align-bottom whitespace-pre-wrap leading-snug w-20 ${col.isLastInGroup ? 'border-r-2 border-r-gray-400' : ''}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map(shift => (
                <tr key={shift} className="hover:bg-orange-50/30 transition-colors group h-14">
                  <td className="border border-gray-300 font-black text-gray-700 bg-gray-50 left-0 z-10 group-hover:bg-orange-50/80">{shift}</td>
                  {columns.map(col => (
                    <td key={col.key} className={`border border-gray-300 p-0 relative ${col.isLastInGroup ? 'border-r-2 border-r-gray-400' : ''}`}>
                      <input type="number" min="0" value={shiftsData[shift][col.key]} onChange={(e) => handleInputChange(shift, col.key, e.target.value)} onFocus={(e) => e.target.select()} className="absolute inset-0 w-full h-full text-center text-sm font-bold text-gray-800 bg-transparent outline-none focus:bg-orange-100 focus:ring-inset focus:ring-2 focus:ring-orange-500 [&::-webkit-inner-spin-button]:appearance-none transition-colors" />
                    </td>
                  ))}
                  <td className="border border-gray-300 font-bold text-gray-800 bg-gray-100 right-0 z-10 border-l-2 border-l-orange-300">{getRowTotal(shift) || '0'}</td>
                </tr>
              ))}
              <tr className="bg-gray-200 h-14 font-black">
                <td className="border border-gray-400 text-gray-800 left-0 z-10 bg-gray-200">TOTAL</td>
                {columns.map(col => (
                  <td key={col.key} className={`border border-gray-400 text-gray-800 ${col.isLastInGroup ? 'border-r-2 border-r-gray-500' : ''}`}>{getColTotal(col.key) || '0'}</td>
                ))}
                <td className="border border-gray-400 text-xl text-orange-800 bg-orange-200 right-0 z-10 border-l-2 border-l-orange-400 shadow-inner">{getGrandTotal() || '0'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* --- Divider --- */}
        <div className="w-full border-t border-dashed border-gray-300 my-4"></div>

        {/* --- Unpoured Details Summaries (New Integration) --- */}
        <div className="p-6">
            
            {/* Main Details Table */}
            <div className="overflow-x-auto mb-8 shadow-sm rounded-lg border border-gray-300">
                <table className="w-full border-collapse border border-gray-300 text-center text-sm">
                    <thead className="bg-gray-100 font-bold text-gray-700 uppercase">
                        <tr>
                            <th className="border border-gray-300 p-3 w-16">DISA</th>
                            <th className="border border-gray-300 p-3">MOULD COUNTER<br/>CLOSE</th>
                            <th className="border border-gray-300 p-3">MOULD COUNTER<br/>OPEN</th>
                            <th className="border border-gray-300 p-3">PRODUCED<br/>MOULD</th>
                            <th className="border border-gray-300 p-3">POURED<br/>MOULD</th>
                            <th className="border border-gray-300 p-3">UNPOURED<br/>MOULD</th>
                            <th className="border border-gray-300 p-3 w-16">%</th>
                            <th className="border border-gray-300 p-3">DELAYS</th>
                            <th className="border border-gray-300 p-3">PRODUCED<br/>M/HR</th>
                            <th className="border border-gray-300 p-3">POURED<br/>M/HR</th>
                            <th className="border border-gray-300 p-3">RUNNING<br/>HOURS</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-800">
                        {['I', 'II', 'III', 'IV'].map((disaName) => {
                            const row = getDisaData(disaName);
                            return (
                                <tr key={disaName} className="hover:bg-gray-50 transition-colors">
                                    <td className="border border-gray-300 p-3 font-bold bg-gray-50">{disaName}</td>
                                    <td className="border border-gray-300 p-3">{row.mouldCounterClose ?? "-"}</td>
                                    <td className="border border-gray-300 p-3">{row.mouldCounterOpen ?? "-"}</td>
                                    <td className="border border-gray-300 p-3">{row.producedMould ?? "-"}</td>
                                    <td className="border border-gray-300 p-3">{row.pouredMould ?? "-"}</td>
                                    <td className="border border-gray-300 p-3">{row.unpouredMould ?? "-"}</td>
                                    <td className="border border-gray-300 p-3 font-medium text-blue-600">
                                      {row.percentage !== undefined && row.percentage !== "" ? `${row.percentage}%` : "-"}
                                    </td>
                                    <td className="border border-gray-300 p-3 text-red-500">{row.delays ?? "-"}</td>
                                    <td className="border border-gray-300 p-3">{row.producedMhr ?? "-"}</td>
                                    <td className="border border-gray-300 p-3">{row.pouredMhr ?? "-"}</td>
                                    <td className="border border-gray-300 p-3 font-medium text-green-600">{row.runningHours ?? "-"}</td>
                                </tr>
                            );
                        })}
                        <tr className="font-black bg-gray-200 text-gray-900">
                            <td className="border border-gray-400 p-3 text-left">TOTAL</td>
                            <td className="border border-gray-400 p-3"></td>
                            <td className="border border-gray-400 p-3"></td>
                            <td className="border border-gray-400 p-3">{totalProduced}</td>
                            <td className="border border-gray-400 p-3">{totalPoured}</td>
                            <td className="border border-gray-400 p-3 text-orange-600">{totalUnpoured}</td>
                            <td className="border border-gray-400 p-3">{totalPercentage}%</td>
                            <td className="border border-gray-400 p-3 text-red-600">{totalDelays}</td>
                            <td className="border border-gray-400 p-3"></td>
                            <td className="border border-gray-400 p-3"></td>
                            <td className="border border-gray-400 p-3 text-green-700">{totalRunningHours}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Bottom Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* NO. OF MOULDS/DAY */}
                <table className="w-full border-collapse border border-gray-300 text-center text-sm shadow-sm rounded-lg overflow-hidden">
                    <thead className="bg-gray-100 font-bold text-gray-700">
                        <tr>
                            <th colSpan="5" className="border border-gray-300 p-3 text-left">NO. OF MOULDS/DAY</th>
                        </tr>
                        <tr>
                            <th className="border border-gray-300 p-2 bg-gray-50 w-32"></th>
                            <th className="border border-gray-300 p-2">DISA 1</th>
                            <th className="border border-gray-300 p-2">DISA 2</th>
                            <th className="border border-gray-300 p-2">DISA 3</th>
                            <th className="border border-gray-300 p-2">DISA 4</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-800">
                        <tr>
                            <td className="border border-gray-300 p-3 font-bold bg-gray-50 text-left text-xs uppercase tracking-wider">MOULD / DAY</td>
                            <td className="border border-gray-300 p-3">{getDisaData('I').producedMould ?? "0"}</td>
                            <td className="border border-gray-300 p-3">{getDisaData('II').producedMould ?? "0"}</td>
                            <td className="border border-gray-300 p-3">{getDisaData('III').producedMould ?? "0"}</td>
                            <td className="border border-gray-300 p-3">{getDisaData('IV').producedMould ?? "0"}</td>
                        </tr>
                        <tr className="font-black bg-gray-200">
                            <td className="border border-gray-400 p-3 text-left">TOTAL</td>
                            <td className="border border-gray-400 p-3 text-center text-lg text-orange-700" colSpan="4">{totalProduced}</td>
                        </tr>
                    </tbody>
                </table>

                {/* NO. OF QUANTITY/DAY */}
                <table className="w-full border-collapse border border-gray-300 text-center text-sm shadow-sm rounded-lg overflow-hidden">
                    <thead className="bg-gray-100 font-bold text-gray-700">
                        <tr>
                            <th colSpan="5" className="border border-gray-300 p-3 text-left">NO. OF QUANTITY/DAY</th>
                        </tr>
                        <tr>
                            <th className="border border-gray-300 p-2 bg-gray-50 w-32"></th>
                            <th className="border border-gray-300 p-2">DISA 1</th>
                            <th className="border border-gray-300 p-2">DISA 2</th>
                            <th className="border border-gray-300 p-2">DISA 3</th>
                            <th className="border border-gray-300 p-2">DISA 4</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-800">
                        <tr>
                            <td className="border border-gray-300 p-3 font-bold bg-gray-50 text-left text-xs uppercase tracking-wider">QTY / DAY</td>
                            <td className="border border-gray-300 p-3">{getDisaData('I').pouredMould ?? "0"}</td>
                            <td className="border border-gray-300 p-3">{getDisaData('II').pouredMould ?? "0"}</td>
                            <td className="border border-gray-300 p-3">{getDisaData('III').pouredMould ?? "0"}</td>
                            <td className="border border-gray-300 p-3">{getDisaData('IV').pouredMould ?? "0"}</td>
                        </tr>
                        <tr className="font-black bg-gray-200">
                            <td className="border border-gray-400 p-3 text-left">TOTAL</td>
                            <td className="border border-gray-400 p-3 text-center text-lg text-orange-700" colSpan="4">{totalPoured}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        {/* --- Footer Action Bar --- */}
        <div id="checklist-footer" className="bg-slate-100 p-8 border-t border-gray-200 bottom-0 z-20 flex justify-end gap-6 rounded-b-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <button
            onClick={generatePDF}
            className="bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-200 font-bold py-3 px-6 rounded-lg shadow-md uppercase flex items-center gap-2 mt-auto transition-colors"
          >
            <FileDown size={20} /> PDF
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-gray-900 hover:bg-orange-600 text-white font-bold py-3 px-12 rounded-lg shadow-lg uppercase mt-auto transition-colors flex items-center gap-3"
          >
            {loading ? <Loader className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
            {loading ? 'Saving...' : 'Save All Shifts'}
          </button>
        </div>

      </div>

      {/* Tailwind friendly scrollbar styling embedded */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
};

export default UnPouredMouldDetails;