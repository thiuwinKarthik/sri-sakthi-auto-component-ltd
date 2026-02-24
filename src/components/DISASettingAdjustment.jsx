import { useEffect, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MAX_MOULDS = 600000;

const getDefaultDate = () => {
    const now = new Date();
    if (now.getHours() < 7) now.setDate(now.getDate() - 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const DISASettingAdjustment = () => {
    const [recordDate, setRecordDate] = useState(getDefaultDate());
    const [mouldCountNo, setMouldCountNo] = useState("");
    const [prevMouldCountNo, setPrevMouldCountNo] = useState(0);
    const [noOfMoulds, setNoOfMoulds] = useState(0);
    const [workCarriedOut, setWorkCarriedOut] = useState([""]);
    const [preventiveWorkCarried, setPreventiveWorkCarried] = useState([""]);
    const [remarks, setRemarks] = useState("");

    // Fetch previous mould count on mount
    useEffect(() => {
        axios
            .get("http://localhost:5000/api/disa/last-mould-count")
            .then((res) => setPrevMouldCountNo(res.data.prevMouldCountNo))
            .catch((err) => console.error("Error fetching last count:", err));
    }, []);

    // Auto-calculate moulds (handles rollover)
    useEffect(() => {
        if (mouldCountNo === "") { setNoOfMoulds(0); return; }
        const current = Number(mouldCountNo);
        const calculated = current >= prevMouldCountNo
            ? current - prevMouldCountNo
            : (MAX_MOULDS - prevMouldCountNo) + current;
        setNoOfMoulds(calculated);
    }, [mouldCountNo, prevMouldCountNo]);

    const handleWorkCarriedOutChange = (index, value) => {
        const fields = [...workCarriedOut];
        fields[index] = value;
        setWorkCarriedOut(fields);
    };

    const handlePreventiveWorkChange = (index, value) => {
        const fields = [...preventiveWorkCarried];
        fields[index] = value;
        setPreventiveWorkCarried(fields);
    };

    const handleSubmit = async () => {
        if (!mouldCountNo) {
            toast.warning("Please enter a Current Mould Counter value.");
            return;
        }

        const finalWorkCarriedOut = workCarriedOut
            .filter(item => item.trim() !== "")
            .map(item => `• ${item.trim()}`)
            .join("\n");

        const finalPreventiveWork = preventiveWorkCarried
            .filter(item => item.trim() !== "")
            .map(item => `• ${item.trim()}`)
            .join("\n");

        try {
            await axios.post("http://localhost:5000/api/disa/add", {
                recordDate,
                mouldCountNo: Number(mouldCountNo),
                prevMouldCountNo,
                noOfMoulds,
                workCarriedOut: finalWorkCarriedOut,
                preventiveWorkCarried: finalPreventiveWork,
                remarks,
            });
            toast.success("Record saved successfully!");
            setPrevMouldCountNo(Number(mouldCountNo));
            setMouldCountNo("");
            setWorkCarriedOut([""]);
            setPreventiveWorkCarried([""]);
            setRemarks("");
        } catch (err) {
            console.error(err);
            toast.error("Error saving record. Please try again.");
        }
    };

    const handleGenerateReport = () => {
        window.open("http://localhost:5000/api/disa/report", "_blank");
    };

    const inputCls = "w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm text-black bg-white";
    const readOnlyCls = "w-full border border-gray-300 p-2 rounded bg-gray-100 cursor-not-allowed text-gray-600 focus:outline-none text-sm";

    return (
        <div className="w-full">
            <ToastContainer position="top-right" autoClose={3000} theme="colored" />

            <div className="bg-white w-full rounded-xl p-8 shadow-2xl overflow-x-auto">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                    DISA SETTING ADJUSTMENT RECORD
                </h2>

                <div className="min-w-[1100px]">
                    <table className="w-full border-collapse border border-gray-300 text-sm mb-6">
                        <thead className="bg-gray-100 text-gray-700">
                            <tr>
                                <th className="border border-gray-300 p-2 w-32">Date</th>
                                <th className="border border-gray-300 p-2 w-36">Current Mould Counter</th>
                                <th className="border border-gray-300 p-2 w-36">Previous Mould Counter</th>
                                <th className="border border-gray-300 p-2 w-36">Calculated No. of Moulds</th>

                                <th className="border border-gray-300 p-2 w-48">
                                    <div className="flex items-center justify-between gap-2">
                                        <span>Work Carried Out</span>
                                        <button
                                            onClick={() => setWorkCarriedOut([...workCarriedOut, ""])}
                                            className="bg-orange-500 hover:bg-orange-600 text-white w-6 h-6 rounded flex items-center justify-center font-bold text-lg leading-none flex-shrink-0"
                                            title="Add row"
                                        >+</button>
                                    </div>
                                </th>

                                <th className="border border-gray-300 p-2 w-48">
                                    <div className="flex items-center justify-between gap-2">
                                        <span>Preventive Work Carried</span>
                                        <button
                                            onClick={() => setPreventiveWorkCarried([...preventiveWorkCarried, ""])}
                                            className="bg-orange-500 hover:bg-orange-600 text-white w-6 h-6 rounded flex items-center justify-center font-bold text-lg leading-none flex-shrink-0"
                                            title="Add row"
                                        >+</button>
                                    </div>
                                </th>

                                <th className="border border-gray-300 p-2 w-48">Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                {/* Date */}
                                <td className="border border-gray-300 p-2 align-top">
                                    <input
                                        type="date"
                                        className={inputCls + " cursor-pointer"}
                                        value={recordDate}
                                        onChange={(e) => setRecordDate(e.target.value)}
                                    />
                                </td>

                                {/* Current Mould Counter */}
                                <td className="border border-gray-300 p-2 align-top">
                                    <input
                                        type="number"
                                        className={inputCls}
                                        placeholder="Enter count"
                                        value={mouldCountNo}
                                        onChange={(e) => setMouldCountNo(e.target.value)}
                                    />
                                </td>

                                {/* Previous Mould Counter (read-only) */}
                                <td className="border border-gray-300 p-2 align-top">
                                    <input
                                        type="number"
                                        className={readOnlyCls}
                                        value={prevMouldCountNo}
                                        readOnly
                                        title="Auto-fetched from database"
                                    />
                                </td>

                                {/* Calculated No. of Moulds (read-only) */}
                                <td className="border border-gray-300 p-2 align-top">
                                    <input
                                        type="number"
                                        className={readOnlyCls}
                                        value={noOfMoulds}
                                        readOnly
                                        title="Auto-calculated"
                                    />
                                </td>

                                {/* Work Carried Out – dynamic */}
                                <td className="border border-gray-300 p-2 align-top">
                                    <div className="flex flex-col gap-2">
                                        {workCarriedOut.map((work, index) => (
                                            <div key={`work-${index}`} className="flex gap-1">
                                                <input
                                                    type="text"
                                                    className={inputCls}
                                                    placeholder={`Task ${index + 1}`}
                                                    value={work}
                                                    onChange={(e) => handleWorkCarriedOutChange(index, e.target.value)}
                                                />
                                                {workCarriedOut.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setWorkCarriedOut(workCarriedOut.filter((_, i) => i !== index))}
                                                        className="text-red-500 font-bold hover:text-red-700 px-1"
                                                    >✕</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </td>

                                {/* Preventive Work – dynamic */}
                                <td className="border border-gray-300 p-2 align-top">
                                    <div className="flex flex-col gap-2">
                                        {preventiveWorkCarried.map((preventive, index) => (
                                            <div key={`prev-${index}`} className="flex gap-1">
                                                <input
                                                    type="text"
                                                    className={inputCls}
                                                    placeholder={`Action ${index + 1}`}
                                                    value={preventive}
                                                    onChange={(e) => handlePreventiveWorkChange(index, e.target.value)}
                                                />
                                                {preventiveWorkCarried.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreventiveWorkCarried(preventiveWorkCarried.filter((_, i) => i !== index))}
                                                        className="text-red-500 font-bold hover:text-red-700 px-1"
                                                    >✕</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </td>

                                {/* Remarks */}
                                <td className="border border-gray-300 p-2 align-top">
                                    <textarea
                                        className={inputCls + " resize-y min-h-[40px]"}
                                        placeholder="Remarks"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                    />
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

export default DISASettingAdjustment;
