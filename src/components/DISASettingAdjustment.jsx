import React, { useEffect, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MAX_MOULDS = 600000;
const API = "http://localhost:5000/api/disa";

const getDefaultDate = () => {
    const now = new Date();
    if (now.getHours() < 7) now.setDate(now.getDate() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const parseWorkItems = (text) => {
    if (!text) return [""];
    return text.split("\n").map(l => l.replace(/^•\s*/, "").trim()).filter(Boolean).length ? text.split("\n").map(l => l.replace(/^•\s*/, "").trim()).filter(Boolean) : [""];
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "—";

const inp = "w-full border-2 border-gray-400 p-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm text-gray-900 bg-white placeholder-gray-400 font-medium";
const roInp = "w-full border-2 border-gray-300 p-2 rounded bg-gray-100 cursor-not-allowed text-gray-700 text-sm font-medium";
const editInp = "w-full border-2 border-orange-400 p-1.5 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs text-gray-900 bg-white font-medium";
const thCls = "border border-gray-400 p-2 bg-gray-100 text-gray-900 font-bold text-sm";
const tdCls = "border border-gray-300 p-2 text-gray-900 text-sm align-top";

const DISASettingAdjustment = () => {
    const [customCols, setCustomCols] = useState([]);
    
    // Form state
    const [recordDate, setRecordDate] = useState(getDefaultDate());
    const [mouldCountNo, setMouldCountNo] = useState("");
    const [prevMouldCountNo, setPrevMouldCountNo] = useState(0);
    const [noOfMoulds, setNoOfMoulds] = useState(0);
    const [workCarriedOut, setWorkCarriedOut] = useState([""]);
    const [preventiveWorkCarried, setPreventiveWorkCarried] = useState([""]);
    const [remarks, setRemarks] = useState("");
    const [customValues, setCustomValues] = useState({});

    // Records state
    const [records, setRecords] = useState([]);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editRow, setEditRow] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    useEffect(() => {
        loadCustomCols();
        fetchLastCount();
        fetchRecords();
    }, []);

    useEffect(() => {
        if (mouldCountNo === "") { setNoOfMoulds(0); return; }
        const cur = Number(mouldCountNo);
        setNoOfMoulds(cur >= prevMouldCountNo ? cur - prevMouldCountNo : (MAX_MOULDS - prevMouldCountNo) + cur);
    }, [mouldCountNo, prevMouldCountNo]);

    const loadCustomCols = async () => {
        try {
            const res = await axios.get(`${API}/custom-columns`);
            setCustomCols(res.data);
        } catch { console.error("Failed to load custom columns"); }
    };

    const fetchLastCount = async () => {
        try {
            const res = await axios.get(`${API}/last-mould-count`);
            setPrevMouldCountNo(res.data.prevMouldCountNo || 0);
        } catch { console.error("Failed to fetch last count"); }
    };

    const fetchRecords = async () => {
        setLoadingRecords(true);
        try {
            const res = await axios.get(`${API}/records`);
            setRecords(res.data);
        } catch { toast.error("Failed to load records."); }
        finally { setLoadingRecords(false); }
    };

    const startEdit = (row) => {
        setEditingId(row.id);
        setEditRow({
            ...row,
            recordDate: String(row.recordDate).split("T")[0],
            workItems: parseWorkItems(row.workCarriedOut),
            preventiveItems: parseWorkItems(row.preventiveWorkCarried),
            customValues: row.customValues || {},
        });
    };
    const cancelEdit = () => { setEditingId(null); setEditRow(null); };
    const setEF = (f, v) => setEditRow(p => ({ ...p, [f]: v }));
    const setECustom = (colId, v) => setEditRow(p => ({ ...p, customValues: { ...p.customValues, [colId]: v } }));

    const handleSaveEdit = async () => {
        try {
            await axios.put(`${API}/records/${editingId}`, {
                recordDate: editRow.recordDate,
                mouldCountNo: Number(editRow.mouldCountNo),
                prevMouldCountNo: Number(editRow.prevMouldCountNo),
                noOfMoulds: Number(editRow.noOfMoulds),
                workCarriedOut: editRow.workItems.filter(x => x.trim()).map(x => `• ${x.trim()}`).join("\n"),
                preventiveWorkCarried: editRow.preventiveItems.filter(x => x.trim()).map(x => `• ${x.trim()}`).join("\n"),
                remarks: editRow.remarks,
                customValues: editRow.customValues,
            });
            toast.success("Record updated!");
            cancelEdit();
            fetchRecords();
            fetchLastCount();
        } catch { toast.error("Failed to update record."); }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API}/records/${id}`);
            toast.success("Record deleted!");
            setDeleteConfirmId(null);
            fetchRecords();
            fetchLastCount();
        } catch { toast.error("Failed to delete record."); }
    };

    const handleSubmit = async () => {
        if (!mouldCountNo) { toast.warning("Please enter a Current Mould Counter value."); return; }
        try {
            await axios.post(`${API}/add`, {
                recordDate,
                mouldCountNo: Number(mouldCountNo),
                prevMouldCountNo,
                noOfMoulds,
                workCarriedOut: workCarriedOut.filter(i => i.trim()).map(i => `• ${i.trim()}`).join("\n"),
                preventiveWorkCarried: preventiveWorkCarried.filter(i => i.trim()).map(i => `• ${i.trim()}`).join("\n"),
                remarks,
                customValues,
            });
            toast.success("Record saved successfully!");
            setPrevMouldCountNo(Number(mouldCountNo));
            setMouldCountNo(""); setWorkCarriedOut([""]); setPreventiveWorkCarried([""]); setRemarks(""); setCustomValues({});
            fetchRecords();
        } catch { toast.error("Error saving record. Please try again."); }
    };

    return (
        <div className="w-full space-y-8">
            <ToastContainer position="top-right" autoClose={3000} theme="colored" />

            <div className="bg-white w-full rounded-xl p-8 shadow-2xl overflow-x-auto">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                    <h2 className="text-2xl font-bold text-gray-900">DISA SETTING ADJUSTMENT RECORD</h2>
                </div>

                <div className="min-w-[1100px]">
                    <table className="w-full border-collapse border-2 border-gray-400 text-sm mb-6">
                        <thead>
                            <tr>
                                <th className={thCls + " w-32"}>Date</th>
                                <th className={thCls + " w-36"}>Current Mould Counter</th>
                                <th className={thCls + " w-36"}>Previous Mould Counter</th>
                                <th className={thCls + " w-36"}>No. of Moulds</th>
                                <th className={thCls + " w-48"}>
                                    <div className="flex justify-between">Work Carried Out <button onClick={() => setWorkCarriedOut(p => [...p, ""])} className="text-orange-600 font-bold">+</button></div>
                                </th>
                                <th className={thCls + " w-48"}>
                                    <div className="flex justify-between">Preventive Work <button onClick={() => setPreventiveWorkCarried(p => [...p, ""])} className="text-orange-600 font-bold">+</button></div>
                                </th>
                                <th className={thCls + " w-36"}>Remarks</th>
                                
                                {/* Dynamic Columns - NO AMBER STYLING */}
                                {customCols.map(col => (
                                    <th key={col.id} className={thCls + " w-40"}>{col.columnName}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="align-top">
                                <td className="border border-gray-300 p-2"><input type="date" className={inp} value={recordDate} onChange={e => setRecordDate(e.target.value)} /></td>
                                <td className="border border-gray-300 p-2"><input type="number" className={inp} value={mouldCountNo} onChange={e => setMouldCountNo(e.target.value)} /></td>
                                <td className="border border-gray-300 p-2"><input type="number" className={roInp} value={prevMouldCountNo} readOnly /></td>
                                <td className="border border-gray-300 p-2"><input type="number" className={roInp} value={noOfMoulds} readOnly /></td>
                                <td className="border border-gray-300 p-2">
                                    <div className="flex flex-col gap-2">
                                        {workCarriedOut.map((w, i) => (
                                            <input key={i} type="text" className={inp} value={w} onChange={e => { const a = [...workCarriedOut]; a[i] = e.target.value; setWorkCarriedOut(a); }} />
                                        ))}
                                    </div>
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <div className="flex flex-col gap-2">
                                        {preventiveWorkCarried.map((p, i) => (
                                            <input key={i} type="text" className={inp} value={p} onChange={e => { const a = [...preventiveWorkCarried]; a[i] = e.target.value; setPreventiveWorkCarried(a); }} />
                                        ))}
                                    </div>
                                </td>
                                <td className="border border-gray-300 p-2"><textarea className={inp + " resize-y min-h-[40px]"} value={remarks} onChange={e => setRemarks(e.target.value)} /></td>
                                
                                {/* Dynamic Inputs - NO AMBER STYLING */}
                                {customCols.map(col => (
                                    <td key={col.id} className="border border-gray-300 p-2">
                                        <input type="text" className={inp} value={customValues[col.id] || ""} onChange={e => setCustomValues(p => ({ ...p, [col.id]: e.target.value }))} placeholder={col.columnName} />
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-4 mt-4">
                    <button onClick={() => window.open(`${API}/report`, "_blank")} className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded font-bold">Generate PDF</button>
                    <button onClick={handleSubmit} className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2 rounded font-bold">Submit</button>
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white w-full rounded-xl p-8 shadow-2xl overflow-x-auto">
                <h2 className="text-xl font-bold text-gray-900 border-l-4 border-orange-500 pl-3 mb-6 uppercase tracking-tight">All Records</h2>
                {loadingRecords ? (
                    <div className="text-center py-10 text-gray-600 font-bold uppercase tracking-widest text-sm">Loading records…</div>
                ) : (
                    <table className="w-full border-collapse border-2 border-gray-400 text-sm">
                        <thead>
                            <tr>
                                <th className={thCls + " w-28"}>Date</th>
                                <th className={thCls + " w-32"}>Current Mould</th>
                                <th className={thCls + " w-28"}>No. of Moulds</th>
                                <th className={thCls}>Work Carried Out</th>
                                <th className={thCls}>Preventive Work</th>
                                <th className={thCls + " w-36"}>Remarks</th>
                                
                                {/* Dynamic Headers - NO AMBER STYLING */}
                                {customCols.map(col => <th key={col.id} className={thCls + " w-40"}>{col.columnName}</th>)}
                                
                                <th className={thCls + " w-28 text-center"}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((row) => (
                                editingId === row.id ? (
                                    <tr key={row.id} className="bg-orange-50/40">
                                        <td className="border border-orange-200 p-1.5"><input type="date" value={editRow.recordDate} onChange={e => setEF("recordDate", e.target.value)} className={editInp} /></td>
                                        <td className="border border-orange-200 p-1.5"><input type="number" value={editRow.mouldCountNo} onChange={e => setEF("mouldCountNo", e.target.value)} className={editInp} /></td>
                                        <td className="border border-orange-200 p-1.5"><input type="number" value={editRow.noOfMoulds} onChange={e => setEF("noOfMoulds", e.target.value)} className={editInp} /></td>
                                        <td className="border border-orange-200 p-1.5">
                                            {editRow.workItems.map((w, i) => <input key={i} type="text" value={w} onChange={e => { const a=[...editRow.workItems]; a[i]=e.target.value; setEF("workItems", a); }} className={editInp + " mb-1"} />)}
                                        </td>
                                        <td className="border border-orange-200 p-1.5">
                                            {editRow.preventiveItems.map((p, i) => <input key={i} type="text" value={p} onChange={e => { const a=[...editRow.preventiveItems]; a[i]=e.target.value; setEF("preventiveItems", a); }} className={editInp + " mb-1"} />)}
                                        </td>
                                        <td className="border border-orange-200 p-1.5"><textarea value={editRow.remarks} onChange={e => setEF("remarks", e.target.value)} className={editInp + " resize-y min-h-[36px]"} /></td>
                                        
                                        {/* Dynamic Edit Inputs */}
                                        {customCols.map(col => (
                                            <td key={col.id} className="border border-orange-200 p-1.5">
                                                <input type="text" value={editRow.customValues?.[col.id] || ""} onChange={e => setECustom(col.id, e.target.value)} className={editInp} />
                                            </td>
                                        ))}
                                        
                                        <td className="border border-orange-200 p-1.5 text-center">
                                            <div className="flex flex-col gap-1.5">
                                                <button onClick={handleSaveEdit} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold w-full">Save</button>
                                                <button onClick={cancelEdit} className="bg-gray-400 text-white px-2 py-1 rounded text-xs font-bold w-full">Cancel</button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    <tr key={row.id} className="hover:bg-orange-50/30">
                                        <td className={tdCls + " text-center font-semibold"}>{fmtDate(row.recordDate)}</td>
                                        <td className={tdCls + " text-center"}>{row.mouldCountNo || "—"}</td>
                                        <td className={tdCls + " text-center font-bold text-orange-600"}>{row.noOfMoulds ?? "—"}</td>
                                        <td className={tdCls + " whitespace-pre-line"}>{row.workCarriedOut || "—"}</td>
                                        <td className={tdCls + " whitespace-pre-line"}>{row.preventiveWorkCarried || "—"}</td>
                                        <td className={tdCls}>{row.remarks || "—"}</td>
                                        
                                        {/* Dynamic Values Display - NO AMBER STYLING */}
                                        {customCols.map(col => (
                                            <td key={col.id} className={tdCls}>{row.customValues?.[col.id] || "—"}</td>
                                        ))}
                                        
                                        <td className={tdCls + " text-center"}>
                                            {deleteConfirmId === row.id ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-red-600 text-[10px] font-bold">Confirm?</span>
                                                    <button onClick={() => handleDelete(row.id)} className="bg-red-600 text-white px-2 py-1 rounded text-xs">Yes</button>
                                                    <button onClick={() => setDeleteConfirmId(null)} className="bg-gray-400 text-white px-2 py-1 rounded text-xs">No</button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-1 justify-center">
                                                    <button onClick={() => startEdit(row)} className="bg-blue-600 text-white px-2 py-1.5 rounded text-xs">Edit</button>
                                                    <button onClick={() => setDeleteConfirmId(row.id)} className="bg-red-600 text-white px-2 py-1.5 rounded text-xs">Del</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default DISASettingAdjustment;