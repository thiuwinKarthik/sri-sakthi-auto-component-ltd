import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FileDown, Calendar, Users, X, Loader, AlertTriangle, CheckCircle, Settings, FileText, LogOut } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateUnPouredMouldPDF, generateDmmSettingPDF, generateChecklistPDF, generateErrorProofPDF } from '../utils/pdfGenerators';
import { removeToken, getUser } from '../utils/auth';

// Toast Notification component for consistency
const NotificationToast = ({ data, onClose }) => {
    const isError = data.type === 'error';
    const isLoading = data.type === 'loading';

    React.useEffect(() => {
        if (data.show && !isLoading) {
            const timer = setTimeout(() => onClose(), 3000);
            return () => clearTimeout(timer);
        }
    }, [data.show, isLoading, onClose]);

    if (!data.show) return null;

    return (
        <div className="fixed top-6 right-6 z-[200] animate-slide-in-right">
            <div className={`
                flex items-center gap-4 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border 
                ${isError ? 'bg-red-500/10 border-red-500/30 text-red-200'
                    : isLoading ? 'bg-[#ff9100]/10 border-[#ff9100]/30 text-[#ff9100]'
                        : 'bg-green-500/10 border-green-500/30 text-green-200'}
            `}>
                <div className="flex-shrink-0">
                    {isLoading ? <Loader className="w-6 h-6 animate-spin" /> : isError ? <AlertTriangle className="w-6 h-6 text-red-500" /> : <CheckCircle className="w-6 h-6 text-green-500" />}
                </div>
                <div className="flex flex-col">
                    <h4 className="text-sm font-bold tracking-wide uppercase">
                        {isLoading ? 'Processing' : isError ? 'Error' : 'Success'}
                    </h4>
                    <p className="text-sm opacity-90">{data.message}</p>
                </div>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const navigate = useNavigate();

    const user = getUser();

    const handleLogout = () => {
        removeToken();
        navigate('/login');
    };

    // Modal States
    const [actionModal, setActionModal] = useState({ show: false, selectedForm: null });
    const [pdfModal, setPdfModal] = useState({ show: false, selectedForm: null });
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState({ show: false, type: '', message: '' });

    const forms = [
        { name: "Performance", id: "performance" },
        { name: "DISA Matic Product Report", id: "disamatic-report" },
        { name: "Unpoured Mould Details", id: "unpoured-mould-details" },
        { name: "DMM Setting Parameters", id: "dmm-setting-parameters" },
        { name: "DISA Operator Checklist", id: "disa-operator" },
        { name: "Layered Process Audit", id: "lpa" },
        { name: "Moulding Quantity Report", id: "moulding-qty" },
        { name: "Error Proof Verification", id: "error-proof" },
        { name: "Add Users", id: "users", isSpecial: true }
    ];

    const handleGridClick = (form) => {
        if (form.isSpecial && form.id === 'users') {
            navigate('/admin/users');
        } else {
            setActionModal({ show: true, selectedForm: form });
        }
    };

    const openPdfModal = (form) => {
        setActionModal({ show: false, selectedForm: null });
        setPdfModal({ show: true, selectedForm: form });
        const today = new Date().toISOString().split('T')[0];
        setDateRange({ from: today, to: today });
    };

    const handleManageForm = (form) => {
        const configForms = ['disa-operator', 'lpa', 'error-proof', 'unpoured-mould-details', 'dmm-setting-parameters'];
        setActionModal({ show: false, selectedForm: null });

        if (configForms.includes(form.id)) {
            // Master Schema Setup Route
            navigate(`/admin/config/${form.id}`);
        } else {
            // Data Entry Route acting as Manage Data
            navigate(`/${form.id}`);
        }
    };

    const handleDownloadPDF = async () => {
        if (!dateRange.from || !dateRange.to) {
            setNotification({ show: true, type: 'error', message: 'Please select both From and To dates.' });
            return;
        }

        setLoading(true);
        setNotification({ show: true, type: 'loading', message: 'Generating PDF Report...' });

        try {
            // Check if it's one of the forms that doesn't have a backend yet
            const noBackendForms = ["performance", "moulding-qty", "disamatic-report"];
            if (noBackendForms.includes(pdfModal.selectedForm.id)) {
                setNotification({ show: true, type: 'error', message: `${pdfModal.selectedForm.name} data module is currently pending implementation.` });
                setLoading(false);
                return;
            }

            // Fetch Real Data using the Date Range
            const res = await axios.get(`http://localhost:5000/api/reports/${pdfModal.selectedForm.id}`, {
                params: { fromDate: dateRange.from, toDate: dateRange.to }
            });

            const data = res.data;

            // Route to specific native PDF generator based on form ID
            switch (pdfModal.selectedForm.id) {
                case 'unpoured-mould-details':
                    generateUnPouredMouldPDF(data, dateRange);
                    break;
                case 'dmm-setting-parameters':
                    generateDmmSettingPDF(data, dateRange);
                    break;
                case 'disa-operator':
                    generateChecklistPDF(data, dateRange, "DISA MACHINE OPERATOR CHECK SHEET", "Non-Conformance Report");
                    break;
                case 'lpa':
                    generateChecklistPDF(data, dateRange, "BOTTOM LEVEL PROCESS AUDIT", "Non-Conformance Report");
                    break;
                case 'error-proof':
                    generateErrorProofPDF(data, dateRange);
                    break;
                default:
                    setNotification({ show: true, type: 'error', message: 'Report format mapping not found.' });
                    setLoading(false);
                    return;
            }

            setNotification({ show: true, type: 'success', message: 'Bulk Export Downloaded Successfully!' });
            setPdfModal({ show: false, selectedForm: null });

        } catch (error) {
            setNotification({ show: true, type: 'error', message: 'Failed to generate PDF.' });
        }

        setLoading(false);
    };

    return (
        <div className="h-screen w-screen bg-[#2d2d2d] flex flex-col overflow-hidden font-sans relative">
            <NotificationToast data={notification} onClose={() => setNotification(prev => ({ ...prev, show: false }))} />

            <div className="h-1.5 bg-[#ff9100] flex-shrink-0 shadow-[0_0_15px_rgba(255,145,0,0.5)]" />

            {/* Navigation Bar matching original dashboard (Moved to Top Left) */}
            <div className="w-full flex justify-between items-center px-10 pt-6 absolute top-0 left-0 z-10">
                <Link to="/admin" className="flex items-center gap-2 text-[#ff9100] font-bold uppercase tracking-wider text-sm hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:border-[#ff9100]/50 shadow-lg backdrop-blur-sm">
                    ← Back to Dashboard
                </Link>
                <div className="flex items-center gap-4">
                    <span className="text-white/30 text-xs font-mono uppercase tracking-wider">
                        {user ? `${user.username} · ${user.role}` : ''}
                    </span>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-white/50 hover:text-[#ff9100] text-xs font-bold uppercase tracking-widest transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg border border-white/10 hover:border-[#ff9100]/40 shadow-lg backdrop-blur-sm"
                    >
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </div>

            {/* Corporate Header */}
            <div className="py-8 pt-16 flex-shrink-0 flex flex-col items-center">
                <h1 className="text-[2.5rem] md:text-[3.5rem] font-black text-center text-white tracking-tighter uppercase leading-tight drop-shadow-lg">
                    Admin Dashboard
                </h1>
                <div className="text-[#ff9100] tracking-widest uppercase text-sm font-bold mt-2">Sakthi Auto Component Limited</div>
                <div className="w-32 h-1 bg-[#ff9100] mt-4 rounded-full" />
            </div>

            <div className="flex-1 flex justify-center items-center px-10 pb-10 overflow-y-auto mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 w-full max-w-7xl">
                    {forms.map((form) => (
                        <button
                            key={form.name}
                            onClick={() => handleGridClick(form)}
                            className={`
                                relative group border text-white rounded-2xl flex flex-col items-center justify-center text-center p-6 shadow-xl transition-all duration-300 hover:scale-[1.03] active:scale-95 overflow-hidden h-40
                                ${form.isSpecial
                                    ? 'bg-gradient-to-br from-[#ff9100]/80 to-orange-700 border-[#ff9100] hover:shadow-[0_0_30px_rgba(255,145,0,0.6)]'
                                    : 'bg-[#383838] border-white/5 hover:bg-white/10 hover:border-[#ff9100]/50'}
                            `}
                        >
                            {form.isSpecial ? (
                                <Users className="w-10 h-10 mb-3 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                            ) : (
                                <Settings className="w-8 h-8 mb-3 text-[#ff9100] opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                            )}
                            <span className="relative z-10 text-sm md:text-base font-bold uppercase tracking-wide group-hover:text-white leading-tight">
                                {form.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom Footer Border */}
            <div className="h-1.5 bg-[#ff9100] flex-shrink-0 mt-auto" />

            {/* --- Action Selection Modal --- */}
            {actionModal.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#383838] border border-white/10 w-full max-w-lg rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden scale-in relative">
                        {/* Header Image / Pattern Area */}
                        <div className="h-24 bg-gradient-to-br from-[#ff9100] to-orange-800 relative flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
                            <h3 className="relative z-10 text-2xl font-black text-white uppercase tracking-widest drop-shadow-md">
                                Select Action
                            </h3>
                            <button onClick={() => setActionModal({ show: false, selectedForm: null })} className="absolute top-4 right-4 z-20 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/40 p-2 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-8 py-10 flex flex-col items-center gap-6">
                            <div className="text-center mb-4">
                                <p className="text-sm font-bold text-[#ff9100] uppercase tracking-[0.2em] mb-2">Target Module</p>
                                <h2 className="text-2xl font-black text-white leading-tight">{actionModal.selectedForm.name}</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                {/* Export Option */}
                                <button
                                    onClick={() => openPdfModal(actionModal.selectedForm)}
                                    className="group flex flex-col items-center justify-center gap-4 bg-[#2a2a2a] hover:bg-[#333] border-2 border-transparent hover:border-[#ff9100]/50 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 shadow-lg"
                                >
                                    <div className="bg-[#ff9100]/10 p-4 rounded-full group-hover:scale-110 transition-transform group-hover:bg-[#ff9100]/20">
                                        <FileText className="w-8 h-8 text-[#ff9100]" />
                                    </div>
                                    <div className="text-center">
                                        <div className="text-white font-bold uppercase tracking-wide text-sm mb-1">Export Data</div>
                                        <div className="text-white/40 text-[10px] uppercase font-bold">Generate Bulk PDF</div>
                                    </div>
                                </button>

                                {/* Manage Option */}
                                <button
                                    onClick={() => handleManageForm(actionModal.selectedForm)}
                                    className="group flex flex-col items-center justify-center gap-4 bg-[#2a2a2a] hover:bg-[#333] border-2 border-transparent hover:border-[#ff9100]/50 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 shadow-lg relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 bg-[#ff9100] text-black text-[9px] font-black uppercase tracking-wider py-1 px-3 rounded-bl-lg flex items-center gap-1 shadow-md">
                                        <Settings size={10} /> Admin Setup
                                    </div>
                                    <div className="bg-[#ff9100]/10 p-4 rounded-full group-hover:scale-110 transition-transform group-hover:bg-[#ff9100]/20">
                                        <Settings className="w-8 h-8 text-[#ff9100]" />
                                    </div>
                                    <div className="text-center">
                                        <div className="text-white font-bold uppercase tracking-wide text-sm mb-1">Manage Form</div>
                                        <div className="text-white/40 text-[10px] uppercase font-bold">Edit Structure & Parameters</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Date Selection PDF Modal --- */}
            {pdfModal.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#383838] border border-white/10 w-full max-w-md rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] overflow-hidden scale-in">
                        <div className="bg-[#2a2a2a] px-6 py-5 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-extrabold text-lg text-white uppercase tracking-widest flex items-center gap-2">
                                <FileDown size={20} className="text-[#ff9100]" /> Bulk PDF Export
                            </h3>
                            <button onClick={() => setPdfModal({ show: false, selectedForm: null })} className="text-white/40 hover:text-[#ff9100] transition-colors p-1">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 flex flex-col gap-6">
                            <div className="bg-white/5 border border-[#ff9100]/30 rounded-xl p-4 text-center">
                                <div className="text-xs font-bold text-[#ff9100] uppercase tracking-widest mb-1">Target Report</div>
                                <div className="text-lg font-bold text-white uppercase leading-tight">{pdfModal.selectedForm.name}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                                        <Calendar size={14} /> From Date
                                    </label>
                                    <input
                                        type="date"
                                        value={dateRange.from}
                                        onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                                        className="w-full bg-[#222] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#ff9100] focus:ring-1 focus:ring-[#ff9100] transition-all cursor-pointer font-bold [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                                        <Calendar size={14} /> To Date
                                    </label>
                                    <input
                                        type="date"
                                        value={dateRange.to}
                                        min={dateRange.from}
                                        onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                                        className="w-full bg-[#222] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#ff9100] focus:ring-1 focus:ring-[#ff9100] transition-all cursor-pointer font-bold [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button
                                    onClick={() => setPdfModal({ show: false, selectedForm: null })}
                                    className="flex-1 py-3 text-sm font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={loading}
                                    className="flex-1 bg-[#ff9100] hover:bg-orange-500 text-white font-bold py-3 rounded-xl uppercase transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,145,0,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader className="animate-spin w-5 h-5" /> : <FileDown className="w-5 h-5" />}
                                    {loading ? 'Generating...' : 'Download'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes scale-in { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .scale-in { animation: scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        @keyframes slide-in-right { 0% { transform: translateX(100%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
        </div>
    );
};

export default AdminDashboard;
