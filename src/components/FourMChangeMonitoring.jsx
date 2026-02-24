import { useEffect, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const getShiftAndDate = () => {
    const now = new Date();
    const hours = now.getHours();
    let shift = "I";
    if (hours >= 7 && hours < 15) shift = "I";
    else if (hours >= 15 && hours < 23) shift = "II";
    else {
        shift = "III";
        if (hours < 7) now.setDate(now.getDate() - 1);
    }
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return { recordDate: `${year}-${month}-${day}`, shift };
};

const StatusSelect = ({ value, onChange, options = ["-", "OK", "Not OK"] }) => (
    <select
        className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm text-center appearance-none bg-white cursor-pointer text-black"
        value={value}
        onChange={(e) => onChange(e.target.value)}
    >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
);

const FourMChangeMonitoring = () => {
    const { recordDate, shift } = getShiftAndDate();

    const [line, setLine] = useState("DISA - I");
    const [partName, setPartName] = useState("");
    const [mcNo, setMcNo] = useState("");
    const [type4M, setType4M] = useState("");
    const [description, setDescription] = useState("");

    const [firstPart, setFirstPart] = useState("-");
    const [lastPart, setLastPart] = useState("-");
    const [inspFreq, setInspFreq] = useState("-");
    const [retroChecking, setRetroChecking] = useState("-");
    const [quarantine, setQuarantine] = useState("-");
    const [partId, setPartId] = useState("-");
    const [internalComm, setInternalComm] = useState("-");
    const [inchargeSign, setInchargeSign] = useState("");

    const [inchargeList, setInchargeList] = useState([]);
    const [showInchargeDropdown, setShowInchargeDropdown] = useState(false);
    const [fourMOptions, setFourMOptions] = useState([]);

    useEffect(() => {
        axios.get("http://localhost:5000/api/4m-change/incharges")
            .then((res) => setInchargeList(res.data || []))
            .catch(() => setInchargeList([]));

        axios.get("http://localhost:5000/api/4m-change/types")
            .then((res) => {
                const types = res.data?.length > 0 ? res.data
                    : [{ typeName: "Man" }, { typeName: "Machine" }, { typeName: "Material" }, { typeName: "Method" }];
                setFourMOptions(types);
                setType4M(types[0].typeName);
            })
            .catch(() => {
                const defaults = [{ typeName: "Man" }, { typeName: "Machine" }, { typeName: "Material" }, { typeName: "Method" }];
                setFourMOptions(defaults);
                setType4M("Man");
            });
    }, []);

    const handleSubmit = async () => {
        if (!partName || !mcNo || !description || !type4M) {
            toast.warning("Please fill in Part Name, M/c No, Type of 4M, and Description.");
            return;
        }
        try {
            await axios.post("http://localhost:5000/api/4m-change/add", {
                line, partName, recordDate, shift, mcNo, type4M, description,
                firstPart, lastPart, inspFreq, retroChecking, quarantine,
                partId, internalComm, inchargeSign
            });
            toast.success("Record saved successfully!");
            setMcNo(""); setDescription(""); setInchargeSign("");
            if (fourMOptions.length > 0) setType4M(fourMOptions[0].typeName);
            setFirstPart("-"); setLastPart("-"); setInspFreq("-");
            setRetroChecking("-"); setQuarantine("-"); setPartId("-"); setInternalComm("-");
        } catch (err) {
            console.error(err);
            toast.error("Error saving record. Please try again.");
        }
    };

    const handleGenerateReport = () => {
        window.open("http://localhost:5000/api/4m-change/report", "_blank");
    };

    const inputCls = "w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm text-black bg-white";

    return (
        <div className="w-full">
            <ToastContainer position="top-right" autoClose={3000} theme="colored" />

            <div className="bg-white w-full rounded-xl p-8 shadow-2xl overflow-x-auto">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                    4M CHANGE MONITORING CHECK SHEET
                </h2>

                {/* Header Controls */}
                <div className="flex justify-between items-center mb-6 bg-gray-50 p-4 rounded border border-gray-200">
                    <div className="flex items-center gap-4">
                        <label className="font-bold text-gray-700">Line:</label>
                        <select
                            className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm bg-white text-black cursor-pointer"
                            value={line}
                            onChange={(e) => setLine(e.target.value)}
                        >
                            <option value="DISA - I">DISA - I</option>
                            <option value="DISA - II">DISA - II</option>
                            <option value="DISA - III">DISA - III</option>
                            <option value="DISA - IV">DISA - IV</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-4 w-1/3">
                        <label className="font-bold text-gray-700 whitespace-nowrap">Part Name:</label>
                        <input
                            type="text"
                            className={inputCls}
                            placeholder="Enter Part Name..."
                            value={partName}
                            onChange={(e) => setPartName(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="min-w-[1200px]">
                    <table className="w-full border-collapse border border-gray-300 text-sm mb-6">
                        <thead className="bg-gray-100 text-gray-700 text-center text-xs">
                            <tr>
                                <th className="border border-gray-300 p-2 w-24">Date / Shift</th>
                                <th className="border border-gray-300 p-2 w-24">M/c. No</th>
                                <th className="border border-gray-300 p-2 w-32">Type of 4M</th>
                                <th className="border border-gray-300 p-2 w-48">Description</th>
                                <th className="border border-gray-300 p-2 w-20">First Part</th>
                                <th className="border border-gray-300 p-2 w-20">Last Part</th>
                                <th className="border border-gray-300 p-2 w-24">Insp. Freq<br />(N/I)</th>
                                <th className="border border-gray-300 p-2 w-24">Retro<br />Checking</th>
                                <th className="border border-gray-300 p-2 w-24">Quarantine</th>
                                <th className="border border-gray-300 p-2 w-24">Part<br />Ident.</th>
                                <th className="border border-gray-300 p-2 w-24">Internal<br />Comm.</th>
                                <th className="border border-gray-300 p-2 w-40">Incharge Sign</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                {/* Date / Shift (read-only) */}
                                <td className="border border-gray-300 p-2 align-middle text-center">
                                    <div className="font-semibold text-gray-700 text-xs">{recordDate}</div>
                                    <div className="text-gray-500 text-xs">Shift {shift}</div>
                                </td>

                                {/* M/c No */}
                                <td className="border border-gray-300 p-2 align-top">
                                    <input type="text" className={inputCls} value={mcNo} onChange={(e) => setMcNo(e.target.value)} />
                                </td>

                                {/* Type of 4M */}
                                <td className="border border-gray-300 p-2 align-top">
                                    <select
                                        className={inputCls + " cursor-pointer"}
                                        value={type4M}
                                        onChange={(e) => setType4M(e.target.value)}
                                    >
                                        {fourMOptions.map((opt, idx) => (
                                            <option key={idx} value={opt.typeName}>{opt.typeName}</option>
                                        ))}
                                    </select>
                                </td>

                                {/* Description */}
                                <td className="border border-gray-300 p-2 align-top">
                                    <textarea className={inputCls + " resize-y min-h-[40px]"} value={description} onChange={(e) => setDescription(e.target.value)} />
                                </td>

                                {/* Status selects */}
                                <td className="border border-gray-300 p-2 align-top"><StatusSelect value={firstPart} onChange={setFirstPart} /></td>
                                <td className="border border-gray-300 p-2 align-top"><StatusSelect value={lastPart} onChange={setLastPart} /></td>
                                <td className="border border-gray-300 p-2 align-top"><StatusSelect value={inspFreq} onChange={setInspFreq} options={["-", "N", "I"]} /></td>
                                <td className="border border-gray-300 p-2 align-top"><StatusSelect value={retroChecking} onChange={setRetroChecking} /></td>
                                <td className="border border-gray-300 p-2 align-top"><StatusSelect value={quarantine} onChange={setQuarantine} /></td>
                                <td className="border border-gray-300 p-2 align-top"><StatusSelect value={partId} onChange={setPartId} /></td>
                                <td className="border border-gray-300 p-2 align-top"><StatusSelect value={internalComm} onChange={setInternalComm} /></td>

                                {/* Incharge Sign — searchable */}
                                <td className="border border-gray-300 p-2 align-top relative">
                                    <input
                                        type="text"
                                        className={inputCls}
                                        placeholder="Search supervisor..."
                                        value={inchargeSign}
                                        onChange={(e) => { setInchargeSign(e.target.value); setShowInchargeDropdown(true); }}
                                        onFocus={() => setShowInchargeDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowInchargeDropdown(false), 200)}
                                    />
                                    {showInchargeDropdown && (
                                        <ul className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-300 rounded shadow-xl max-h-48 overflow-y-auto z-50">
                                            {inchargeList
                                                .filter(p => (p.name || "").toLowerCase().includes((inchargeSign || "").toLowerCase()))
                                                .map((p, i) => (
                                                    <li
                                                        key={i}
                                                        className="p-2 text-left hover:bg-orange-50 cursor-pointer text-sm text-black border-b border-gray-100 last:border-none"
                                                        onMouseDown={(e) => { e.preventDefault(); setInchargeSign(p.name); setShowInchargeDropdown(false); }}
                                                    >
                                                        {p.name}
                                                    </li>
                                                ))}
                                            {inchargeList.filter(p => (p.name || "").toLowerCase().includes((inchargeSign || "").toLowerCase())).length === 0 && (
                                                <li className="p-2 text-gray-500 text-sm italic">No matches found</li>
                                            )}
                                        </ul>
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 mt-4">
                    <button
                        onClick={handleGenerateReport}
                        className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded font-bold transition-colors"
                    >
                        Generate Report (PDF)
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2 rounded font-bold transition-colors"
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FourMChangeMonitoring;
