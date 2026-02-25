import { useEffect, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { isAdmin } from '../utils/auth';

const MAX_MOULDS = 600000;
const API = "http://localhost:5000/api/disa";

const getDefaultDate = () => {
    const now = new Date();
    if (now.getHours() < 7) now.setDate(now.getDate() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const parseWorkItems = (text) => {
    if (!text) return [""];
    const lines = text.split("\n").map(l => l.replace(/^•\s*/, "").trim()).filter(Boolean);
    return lines.length ? lines : [""];
};

const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB");
};

// Shared style tokens
const inp = "w-full border-2 border-gray-400 p-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm text-gray-900 bg-white placeholder-gray-400 font-medium";
const roInp = "w-full border-2 border-gray-300 p-2 rounded bg-gray-100 cursor-not-allowed text-gray-700 text-sm font-medium";
const editInp = "w-full border-2 border-orange-400 p-1.5 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs text-gray-900 bg-white placeholder-gray-400 font-medium";
const thCls = "border border-gray-400 p-2 bg-gray-100 text-gray-900 font-bold text-sm";
const tdCls = "border border-gray-300 p-2 text-gray-900 text-sm align-top";

const DISASettingAdjustment = () => {
    const adminMode = isAdmin();

    // ─── Custom columns ─────────────────────────────────────────────────────
    const [customCols, setCustomCols] = useState([]);   // [{id, columnName, displayOrder}]
    const [newColName, setNewColName] = useState("");
    const [addingCol, setAddingCol] = useState(false);
    const [showColManager, setShowColManager] = useState(false);

    // ─── Entry form state ────────────────────────────────────────────────────
    const [recordDate, setRecordDate] = useState(getDefaultDate());
    const [mouldCountNo, setMouldCountNo] = useState("");
    const [prevMouldCountNo, setPrevMouldCountNo] = useState(0);
    const [noOfMoulds, setNoOfMoulds] = useState(0);
    const [workCarriedOut, setWorkCarriedOut] = useState([""]);
    const [preventiveWorkCarried, setPreventiveWorkCarried] = useState([""]);
    const [remarks, setRemarks] = useState("");
    const [customValues, setCustomValues] = useState({});  // {columnId: value}

    // ─── Admin records state ─────────────────────────────────────────────────
    const [records, setRecords] = useState([]);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editRow, setEditRow] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [filterFrom, setFilterFrom] = useState("");
    const [filterTo, setFilterTo] = useState("");

    useEffect(() => {
        loadCustomCols();
        axios.get(`${API}/last-mould-count`)
            .then(res => setPrevMouldCountNo(res.data.prevMouldCountNo))
            .catch(err => console.error(err));
        if (adminMode) fetchRecords();
    }, []);

    useEffect(() => {
        if (mouldCountNo === "") { setNoOfMoulds(0); return; }
        const cur = Number(mouldCountNo);
        setNoOfMoulds(cur >= prevMouldCountNo ? cur - prevMouldCountNo : (MAX_MOULDS - prevMouldCountNo) + cur);
    }, [mouldCountNo, prevMouldCountNo]);

    // ─── Custom column handlers ──────────────────────────────────────────────
    const loadCustomCols = async () => {
        try {
            const res = await axios.get(`${API}/custom-columns`);
            setCustomCols(res.data);
        } catch { console.error("Failed to load custom columns"); }
    };

    const handleAddColumn = async () => {
        if (!newColName.trim()) { toast.warning("Enter a column name."); return; }
        setAddingCol(true);
        try {
            const res = await axios.post(`${API}/custom-columns`, { columnName: newColName.trim() });
            setCustomCols(prev => [...prev, res.data]);
            setNewColName("");
            toast.success(`Column "${res.data.columnName}" added!`);
        } catch { toast.error("Failed to add column."); }
        finally { setAddingCol(false); }
    };

    const handleDeleteColumn = async (col) => {
        if (!window.confirm(`Remove column "${col.columnName}"? Existing values will be hidden but not deleted.`)) return;
        try {
            await axios.delete(`${API}/custom-columns/${col.id}`);
            setCustomCols(prev => prev.filter(c => c.id !== col.id));
            toast.success(`Column "${col.columnName}" removed.`);
        } catch { toast.error("Failed to remove column."); }
    };

    // ─── Record fetch ────────────────────────────────────────────────────────
    const fetchRecords = async (from = "", to = "") => {
        setLoadingRecords(true);
        try {
            const params = {};
            if (from && to) { params.fromDate = from; params.toDate = to; }
            const res = await axios.get(`${API}/records`, { params });
            setRecords(res.data);
        } catch { toast.error("Failed to load records."); }
        finally { setLoadingRecords(false); }
    };

    // ─── Edit handlers ────────────────────────────────────────────────────────
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
    const setEWork = (i, v) => { const a = [...editRow.workItems]; a[i] = v; setEF("workItems", a); };
    const setEPrev = (i, v) => { const a = [...editRow.preventiveItems]; a[i] = v; setEF("preventiveItems", a); };
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
            fetchRecords(filterFrom, filterTo);
        } catch { toast.error("Failed to update record."); }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API}/records/${id}`);
            toast.success("Record deleted!");
            setDeleteConfirmId(null);
            fetchRecords(filterFrom, filterTo);
        } catch { toast.error("Failed to delete record."); }
    };

    // ─── Submit ──────────────────────────────────────────────────────────────
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
            if (adminMode) fetchRecords(filterFrom, filterTo);
        } catch { toast.error("Error saving record. Please try again."); }
    };

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="w-full space-y-8">
            <ToastContainer position="top-right" autoClose={3000} theme="colored" />

            {/* ── Entry Form ─────────────────────────────────────────────────── */}
            <div className="bg-white w-full rounded-xl p-8 shadow-2xl overflow-x-auto">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                    <h2 className="text-2xl font-bold text-gray-900">
                        DISA SETTING ADJUSTMENT RECORD
                        {adminMode && <span className="ml-3 text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded uppercase tracking-wider align-middle">Admin Mode</span>}
                    </h2>
                    {adminMode && (
                        <button
                            onClick={() => setShowColManager(v => !v)}
                            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                            ⚙ Manage Columns
                        </button>
                    )}
                </div>

                {/* ── Column Manager (admin only) ─ */}
                {adminMode && showColManager && (
                    <div className="mb-6 p-5 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl">
                        <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-4">Custom Columns</h3>

                        {/* Existing columns */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {customCols.length === 0 && <span className="text-gray-400 text-sm italic">No custom columns yet. Add one below.</span>}
                            {customCols.map(col => (
                                <div key={col.id} className="flex items-center gap-2 bg-white border-2 border-orange-300 rounded-lg px-3 py-1.5">
                                    <span className="text-sm font-bold text-gray-800">{col.columnName}</span>
                                    <button onClick={() => handleDeleteColumn(col)}
                                        className="text-red-500 hover:text-red-700 font-black text-base leading-none ml-1" title="Remove column">✕</button>
                                </div>
                            ))}
                        </div>

                        {/* Add new column */}
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                value={newColName}
                                onChange={e => setNewColName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddColumn()}
                                placeholder="New column name (e.g. Supervisor Sign, Incharge)"
                                className="flex-1 border-2 border-gray-400 p-2 rounded-lg text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 max-w-sm"
                            />
                            <button
                                onClick={handleAddColumn}
                                disabled={addingCol}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50">
                                {addingCol ? "Adding…" : "+ Add Column"}
                            </button>
                        </div>
                    </div>
                )}

                <div className="min-w-[1100px]">
                    <table className="w-full border-collapse border-2 border-gray-400 text-sm mb-6">
                        <thead>
                            <tr>
                                <th className={thCls + " w-32"}>Date</th>
                                <th className={thCls + " w-36"}>Current Mould Counter</th>
                                <th className={thCls + " w-36"}>Previous Mould Counter</th>
                                <th className={thCls + " w-36"}>No. of Moulds</th>
                                <th className={thCls + " w-48"}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span>Work Carried Out</span>
                                        <button onClick={() => setWorkCarriedOut(p => [...p, ""])}
                                            className="bg-orange-500 hover:bg-orange-600 text-white w-6 h-6 rounded flex items-center justify-center font-bold text-lg leading-none">+</button>
                                    </div>
                                </th>
                                <th className={thCls + " w-48"}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span>Preventive Work Carried</span>
                                        <button onClick={() => setPreventiveWorkCarried(p => [...p, ""])}
                                            className="bg-orange-500 hover:bg-orange-600 text-white w-6 h-6 rounded flex items-center justify-center font-bold text-lg leading-none">+</button>
                                    </div>
                                </th>
                                <th className={thCls + " w-36"}>Remarks</th>
                                {customCols.map(col => (
                                    <th key={col.id} className={thCls + " w-40 bg-amber-50 text-amber-900"}>{col.columnName}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="align-top">
                                <td className="border border-gray-300 p-2">
                                    <input type="date" className={inp + " cursor-pointer [color-scheme:light]"} value={recordDate} onChange={e => setRecordDate(e.target.value)} />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <input type="number" className={inp} placeholder="Enter count" value={mouldCountNo} onChange={e => setMouldCountNo(e.target.value)} />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <input type="number" className={roInp} value={prevMouldCountNo} readOnly />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <input type="number" className={roInp} value={noOfMoulds} readOnly />
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <div className="flex flex-col gap-2">
                                        {workCarriedOut.map((w, i) => (
                                            <div key={i} className="flex gap-1">
                                                <input type="text" className={inp} placeholder={`Task ${i + 1}`} value={w} onChange={e => { const a = [...workCarriedOut]; a[i] = e.target.value; setWorkCarriedOut(a); }} />
                                                {workCarriedOut.length > 1 && <button onClick={() => setWorkCarriedOut(workCarriedOut.filter((_, x) => x !== i))} className="text-red-500 font-bold hover:text-red-700 px-1">✕</button>}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <div className="flex flex-col gap-2">
                                        {preventiveWorkCarried.map((p, i) => (
                                            <div key={i} className="flex gap-1">
                                                <input type="text" className={inp} placeholder={`Action ${i + 1}`} value={p} onChange={e => { const a = [...preventiveWorkCarried]; a[i] = e.target.value; setPreventiveWorkCarried(a); }} />
                                                {preventiveWorkCarried.length > 1 && <button onClick={() => setPreventiveWorkCarried(preventiveWorkCarried.filter((_, x) => x !== i))} className="text-red-500 font-bold hover:text-red-700 px-1">✕</button>}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="border border-gray-300 p-2">
                                    <textarea className={inp + " resize-y min-h-[40px]"} placeholder="Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} />
                                </td>
                                {customCols.map(col => (
                                    <td key={col.id} className="border border-amber-200 p-2 bg-amber-50/40">
                                        <input
                                            type="text"
                                            className={inp + " bg-amber-50"}
                                            placeholder={col.columnName}
                                            value={customValues[col.id] || ""}
                                            onChange={e => setCustomValues(p => ({ ...p, [col.id]: e.target.value }))}
                                        />
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-4 mt-4">
                    <button onClick={() => window.open(`${API}/report`, "_blank")}
                        className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded font-bold transition-colors">
                        Generate Report (PDF)
                    </button>
                    <button onClick={handleSubmit}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2 rounded font-bold transition-colors">
                        Submit
                    </button>
                </div>
            </div>

            {/* ── Admin Records Table ────────────────────────────────────────── */}
            {adminMode && (
                <div className="bg-white w-full rounded-xl p-8 shadow-2xl overflow-x-auto">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-orange-500 pl-3 uppercase tracking-tight">All Records</h2>
                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">From</label>
                                <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                                    className="border-2 border-gray-400 p-1.5 rounded text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer [color-scheme:light]" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">To</label>
                                <input type="date" value={filterTo} min={filterFrom} onChange={e => setFilterTo(e.target.value)}
                                    className="border-2 border-gray-400 p-1.5 rounded text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer [color-scheme:light]" />
                            </div>
                            <button onClick={() => fetchRecords(filterFrom, filterTo)}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-bold text-sm">Filter</button>
                            <button onClick={() => { setFilterFrom(""); setFilterTo(""); fetchRecords(); }}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded font-bold text-sm">Clear</button>
                        </div>
                    </div>

                    {loadingRecords ? (
                        <div className="text-center py-10 text-gray-600 font-bold uppercase tracking-widest text-sm">Loading records…</div>
                    ) : records.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-sm">No records found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border-2 border-gray-400 text-sm">
                                <thead>
                                    <tr>
                                        <th className={thCls + " w-8"}>#</th>
                                        <th className={thCls + " w-28"}>Date</th>
                                        <th className={thCls + " w-32"}>Current Mould</th>
                                        <th className={thCls + " w-32"}>Prev. Mould</th>
                                        <th className={thCls + " w-28"}>No. of Moulds</th>
                                        <th className={thCls}>Work Carried Out</th>
                                        <th className={thCls}>Preventive Work</th>
                                        <th className={thCls + " w-36"}>Remarks</th>
                                        {customCols.map(col => (
                                            <th key={col.id} className={thCls + " w-40 bg-amber-50 text-amber-900"}>{col.columnName}</th>
                                        ))}
                                        <th className={thCls + " w-28 text-center"}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map((row, idx) => (
                                        editingId === row.id ? (
                                            <tr key={row.id} className="bg-orange-50/40">
                                                <td className={tdCls + " text-center text-gray-400 text-xs"}>{idx + 1}</td>
                                                <td className="border border-orange-200 p-1.5">
                                                    <input type="date" value={editRow.recordDate} onChange={e => setEF("recordDate", e.target.value)} className={editInp + " cursor-pointer [color-scheme:light]"} />
                                                </td>
                                                <td className="border border-orange-200 p-1.5">
                                                    <input type="number" value={editRow.mouldCountNo} onChange={e => setEF("mouldCountNo", e.target.value)} className={editInp} />
                                                </td>
                                                <td className="border border-orange-200 p-1.5">
                                                    <input type="number" value={editRow.prevMouldCountNo} onChange={e => setEF("prevMouldCountNo", e.target.value)} className={editInp} />
                                                </td>
                                                <td className="border border-orange-200 p-1.5">
                                                    <input type="number" value={editRow.noOfMoulds} onChange={e => setEF("noOfMoulds", e.target.value)} className={editInp} />
                                                </td>
                                                <td className="border border-orange-200 p-1.5">
                                                    <div className="flex flex-col gap-1">
                                                        {editRow.workItems.map((w, i) => (
                                                            <div key={i} className="flex gap-1">
                                                                <input type="text" value={w} onChange={e => setEWork(i, e.target.value)} className={editInp} />
                                                                {editRow.workItems.length > 1 && <button onClick={() => setEF("workItems", editRow.workItems.filter((_, x) => x !== i))} className="text-red-500 font-bold text-xs">✕</button>}
                                                            </div>
                                                        ))}
                                                        <button onClick={() => setEF("workItems", [...editRow.workItems, ""])} className="text-orange-600 text-xs font-bold text-left">+ Add</button>
                                                    </div>
                                                </td>
                                                <td className="border border-orange-200 p-1.5">
                                                    <div className="flex flex-col gap-1">
                                                        {editRow.preventiveItems.map((w, i) => (
                                                            <div key={i} className="flex gap-1">
                                                                <input type="text" value={w} onChange={e => setEPrev(i, e.target.value)} className={editInp} />
                                                                {editRow.preventiveItems.length > 1 && <button onClick={() => setEF("preventiveItems", editRow.preventiveItems.filter((_, x) => x !== i))} className="text-red-500 font-bold text-xs">✕</button>}
                                                            </div>
                                                        ))}
                                                        <button onClick={() => setEF("preventiveItems", [...editRow.preventiveItems, ""])} className="text-orange-600 text-xs font-bold text-left">+ Add</button>
                                                    </div>
                                                </td>
                                                <td className="border border-orange-200 p-1.5">
                                                    <textarea value={editRow.remarks} onChange={e => setEF("remarks", e.target.value)} className={editInp + " resize-y min-h-[36px]"} />
                                                </td>
                                                {customCols.map(col => (
                                                    <td key={col.id} className="border border-amber-300 p-1.5 bg-amber-50/40">
                                                        <input type="text" value={editRow.customValues?.[col.id] || ""} onChange={e => setECustom(col.id, e.target.value)} className={editInp + " bg-amber-50"} placeholder={col.columnName} />
                                                    </td>
                                                ))}
                                                <td className="border border-orange-200 p-1.5 text-center">
                                                    <div className="flex flex-col gap-1.5">
                                                        <button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 rounded text-xs font-bold w-full">Save</button>
                                                        <button onClick={cancelEdit} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-2 py-1.5 rounded text-xs font-bold w-full">Cancel</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr key={row.id} className="hover:bg-orange-50/30 transition-colors">
                                                <td className={tdCls + " text-center text-gray-400 text-xs"}>{idx + 1}</td>
                                                <td className={tdCls + " text-center font-semibold"}>{fmtDate(row.recordDate)}</td>
                                                <td className={tdCls + " text-center"}>{row.mouldCountNo || "—"}</td>
                                                <td className={tdCls + " text-center"}>{row.prevMouldCountNo || "—"}</td>
                                                <td className={tdCls + " text-center font-bold text-orange-600"}>{row.noOfMoulds ?? "—"}</td>
                                                <td className={tdCls + " whitespace-pre-line"}>{row.workCarriedOut || "—"}</td>
                                                <td className={tdCls + " whitespace-pre-line"}>{row.preventiveWorkCarried || "—"}</td>
                                                <td className={tdCls}>{row.remarks || "—"}</td>
                                                {customCols.map(col => (
                                                    <td key={col.id} className={tdCls + " bg-amber-50/50 font-medium text-amber-900"}>
                                                        {row.customValues?.[col.id] || "—"}
                                                    </td>
                                                ))}
                                                <td className={tdCls + " text-center"}>
                                                    {deleteConfirmId === row.id ? (
                                                        <div className="flex flex-col gap-1.5">
                                                            <span className="text-red-600 text-xs font-bold">Confirm?</span>
                                                            <button onClick={() => handleDelete(row.id)} className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-bold w-full">Yes</button>
                                                            <button onClick={() => setDeleteConfirmId(null)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-2 py-1 rounded text-xs font-bold w-full">Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-1.5 justify-center">
                                                            <button onClick={() => startEdit(row)} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-xs font-bold">Edit</button>
                                                            <button onClick={() => setDeleteConfirmId(row.id)} className="bg-red-600 hover:bg-red-700 text-white px-2 py-1.5 rounded text-xs font-bold">Del</button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DISASettingAdjustment;
