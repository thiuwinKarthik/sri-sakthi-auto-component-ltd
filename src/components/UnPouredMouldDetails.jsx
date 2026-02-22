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
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  useEffect(() => { fetchData(); }, [headerData.date, headerData.disaMachine]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/unpoured-moulds/details', {
        params: { date: headerData.date, disa: headerData.disaMachine }
      });

      setColumns(res.data.masterCols || []);
      setShiftsData(res.data.shiftsData || { 1: {}, 2: {}, 3: {} });
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

  const getRowTotal = (shift) => {
    return columns.reduce((sum, col) => sum + (parseInt(shiftsData[shift][col.key]) || 0), 0);
  };

  const getColTotal = (key) => {
    return [1, 2, 3].reduce((sum, shift) => sum + (parseInt(shiftsData[shift][key]) || 0), 0);
  };

  const getGrandTotal = () => {
    return [1, 2, 3].reduce((sum, shift) => sum + getRowTotal(shift), 0);
  };

  const handleSave = async () => {
    setLoading(true);
    const payloadData = { ...shiftsData };
    [1, 2, 3].forEach(s => { payloadData[s].rowTotal = getRowTotal(s); });

    try {
      await axios.post('http://localhost:5000/api/unpoured-moulds/save', {
        date: headerData.date,
        disa: headerData.disaMachine,
        shiftsData: payloadData
      });
      setNotification({ show: true, type: 'success', message: 'Data Saved Successfully!' });
      setTimeout(() => setNotification({ show: false }), 3000);
    } catch (error) {
      setNotification({ show: true, type: 'error', message: 'Failed to save data.' });
    }
    setLoading(false);
  };

  // --- PDF GENERATION LOGIC (UPDATED FOR PERFECT ALIGNMENT & DASHES) ---
  const generatePDF = () => {
    setNotification({ show: true, type: 'loading', message: 'Generating PDF...' });

    try {
      // Create landscape document
      const doc = new jsPDF('l', 'mm', 'a4');

      // Titles and Headers
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("UN POURED MOULD DETAILS", 148.5, 15, { align: 'center' });

      doc.setFontSize(11);
      doc.text(` ${headerData.disaMachine}`, 8, 25);
      const formattedDate = new Date(headerData.date).toLocaleDateString('en-GB');
      doc.text(`DATE: ${formattedDate}`, 289 - doc.getTextWidth(`DATE: ${formattedDate}`) - 8, 25);

      // Construct Grouped Headers (Row 1)
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

      // Construct Sub Headers (Row 2)
      const headRow2 = columns.map(col => ({
        content: col.label, // Includes \n to wrap text vertically
        styles: { halign: 'center', valign: 'middle', fontSize: 5.5 } // Smaller font to avoid awkward wraps
      }));

      // Map Body Data (Shifts 1, 2, 3)
      const bodyRows = [1, 2, 3].map(shift => {
        const row = [shift.toString()];
        columns.forEach(col => {
          const val = shiftsData[shift][col.key];
          // ✅ If empty or null, put a dash "-"
          row.push(val === '' || val === null || val === undefined ? '-' : val.toString());
        });

        const rowTotal = getRowTotal(shift);
        row.push(rowTotal === 0 ? '-' : rowTotal.toString());
        return row;
      });

      // Map Final Total Row
      const totalRow = ['TOTAL'];
      columns.forEach(col => {
        const colTotal = getColTotal(col.key);
        // ✅ If column total is 0, put a dash "-"
        totalRow.push(colTotal === 0 ? '-' : colTotal.toString());
      });

      const grandTotal = getGrandTotal();
      totalRow.push(grandTotal === 0 ? '-' : grandTotal.toString());

      bodyRows.push(totalRow);

      // Generate Table using AutoTable
      autoTable(doc, {
        startY: 32,
        margin: { left: 5, right: 5 }, // Stretches columns to give them more breathing room
        head: [headRow1, headRow2],
        body: bodyRows,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: { top: 3.5, right: 1, bottom: 3.5, left: 1 }, // Creates neat vertical box spacing
          lineColor: [0, 0, 0],
          lineWidth: 0.15,
          textColor: [0, 0, 0],
          halign: 'center',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          minCellHeight: 12 // Keeps header tall and clean
        },
        bodyStyles: {
          minCellHeight: 10 // Paces out the rows so numbers aren't crammed
        },
        didParseCell: function (data) {
          // Emphasize the final TOTAL row
          if (data.section === 'body' && data.row.index === bodyRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        }
      });

      // Save PDF
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

        {/* --- Excel Table Section --- */}
        <div className="p-6 overflow-x-auto min-h-[400px] custom-scrollbar">
          <table className="w-full text-center border-collapse table-fixed min-w-[2300px]">

            <thead className="bg-gray-100">
              {/* Dynamic Group Header Row — computed from fetched columns */}
              <tr className="text-xs text-gray-600 uppercase border-y-2 border-orange-200">
                <th className="border border-gray-300 p-3 w-20 bg-gray-100 z-10" rowSpan="2">SHIFT</th>
                {(() => {
                  // Build group spans dynamically
                  const groups = [];
                  columns.forEach(col => {
                    if (groups.length === 0 || groups[groups.length - 1].name !== col.group) {
                      groups.push({ name: col.group, count: 1 });
                    } else {
                      groups[groups.length - 1].count++;
                    }
                  });
                  return groups.map((g, i) => (
                    <th key={i} className="border border-gray-300 p-2 border-r-2 border-r-gray-400" colSpan={g.count}>
                      {g.name}
                    </th>
                  ));
                })()}
                <th className="border border-gray-300 p-3 w-24 bg-gray-200 z-10 border-l-2 border-l-orange-300" rowSpan="2">TOTAL</th>
              </tr>

              <tr className="text-[10px] text-gray-500 uppercase tracking-wide bg-gray-50">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`border border-gray-300 p-2 align-bottom whitespace-pre-wrap leading-snug w-20 ${col.isLastInGroup ? 'border-r-2 border-r-gray-400' : ''}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {[1, 2, 3].map(shift => (
                <tr key={shift} className="hover:bg-orange-50/30 transition-colors group h-14">
                  <td className="border border-gray-300 font-black text-gray-700 bg-gray-50  left-0 z-10 group-hover:bg-orange-50/80">
                    {shift}
                  </td>

                  {columns.map(col => (
                    <td key={col.key} className={`border border-gray-300 p-0 relative ${col.isLastInGroup ? 'border-r-2 border-r-gray-400' : ''}`}>
                      <input
                        type="number"
                        min="0"
                        value={shiftsData[shift][col.key]}
                        onChange={(e) => handleInputChange(shift, col.key, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="absolute inset-0 w-full h-full text-center text-sm font-bold text-gray-800 bg-transparent outline-none focus:bg-orange-100 focus:ring-inset focus:ring-2 focus:ring-orange-500 [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                      />
                    </td>
                  ))}

                  <td className="border border-gray-300 font-bold text-gray-800 bg-gray-100  right-0 z-10 border-l-2 border-l-orange-300">
                    {getRowTotal(shift) || ''}
                  </td>
                </tr>
              ))}

              {/* Final TOTAL Row */}
              <tr className="bg-gray-200 h-14 font-black">
                <td className="border border-gray-400 text-gray-800  left-0 z-10 bg-gray-200">TOTAL</td>

                {columns.map(col => (
                  <td key={col.key} className={`border border-gray-400 text-gray-800 ${col.isLastInGroup ? 'border-r-2 border-r-gray-500' : ''}`}>
                    {getColTotal(col.key) || ''}
                  </td>
                ))}

                <td className="border border-gray-400 text-xl text-orange-800 bg-orange-200  right-0 z-10 border-l-2 border-l-orange-400 shadow-inner">
                  {getGrandTotal() || '0'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* --- Footer Action Bar --- */}
        <div id="checklist-footer" className="bg-slate-100 p-8 border-t border-gray-200  bottom-0 z-20 flex justify-end gap-6 rounded-b-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">

          {/* ✅ Added PDF Download Button */}
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