import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Save, Loader, AlertTriangle, CheckCircle, Edit, Trash2 } from 'lucide-react';

const NotificationToast = ({ data, onClose }) => {
    if (!data.show) return null;
    const isError = data.type === 'error';
    const isLoading = data.type === 'loading';

    // Auto-close toast for success/error
    React.useEffect(() => {
        if (data.show && !isLoading) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [data.show, isLoading, onClose]);

    return (
        <div className="fixed top-6 right-6 z-[200] animate-slide-in-right">
            <div className={`
                flex items-center gap-4 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border 
                ${isError ? 'bg-red-500/10 border-red-500/30 text-red-200'
                    : isLoading ? 'bg-[#ff9100]/10 border-[#ff9100]/30 text-[#ff9100]'
                        : 'bg-green-500/10 border-green-500/30 text-green-200'}
            `}>
                <div className="flex-shrink-0">
                    {isLoading ? (
                        <Loader className="w-6 h-6 animate-spin" />
                    ) : isError ? (
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    ) : (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                    )}
                </div>
                <div className="flex flex-col">
                    <h4 className="text-sm font-bold tracking-wide uppercase">
                        {isLoading ? 'Processing' : isError ? 'Error' : 'Success'}
                    </h4>
                    <p className="text-sm opacity-90">{data.message}</p>
                </div>
                <button onClick={onClose} className="ml-4 p-1 rounded-lg hover:bg-white/10 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

const AdminPanel = () => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '', role: 'operator' });
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState({ show: false, type: '', message: '' });
    const [deletePrompt, setDeletePrompt] = useState({ show: false, userId: null });

    const [users, setUsers] = useState([]);
    const [editUser, setEditUser] = useState(null); // null means create mode, otherwise { id, username, role }

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/users');
            setUsers(res.data);
        } catch (error) {
            setNotification({ show: true, type: 'error', message: 'Failed to fetch users' });
        }
    };

    const handleOpenCreateModal = () => {
        setEditUser(null);
        setFormData({ username: '', password: '', role: 'operator' });
        setShowCreateModal(true);
    };

    const handleOpenEditModal = (user) => {
        setEditUser(user);
        setFormData({ username: user.username, password: '', role: user.role });
        setShowCreateModal(true);
    };

    const handleCreateOrUpdateUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editUser) {
                // Update User
                if (!formData.username || !formData.role) {
                    setNotification({ show: true, type: 'error', message: 'Username and Role are required!' });
                    setLoading(false);
                    return;
                }
                const res = await axios.put(`http://localhost:5000/api/users/${editUser.Id}`, {
                    username: formData.username,
                    role: formData.role
                });
                setUsers(users.map(u => u.Id === editUser.Id ? res.data : u));
                setNotification({ show: true, type: 'success', message: 'User updated successfully!' });
            } else {
                // Create User
                if (!formData.username || !formData.password || !formData.role) {
                    setNotification({ show: true, type: 'error', message: 'All fields are required!' });
                    setLoading(false);
                    return;
                }
                const res = await axios.post('http://localhost:5000/api/users', formData);
                setUsers([...users, res.data]);
                setNotification({ show: true, type: 'success', message: 'User created successfully!' });
            }
            setShowCreateModal(false);
            setFormData({ username: '', password: '', role: 'operator' });
        } catch (error) {
            setNotification({
                show: true,
                type: 'error',
                message: error.response?.data?.error || 'Failed to save user.'
            });
        }
        setLoading(false);
    };

    const handleDeleteUser = async () => {
        if (!deletePrompt.userId) return;

        try {
            await axios.delete(`http://localhost:5000/api/users/${deletePrompt.userId}`);
            setUsers(users.filter(u => u.Id !== deletePrompt.userId));
            setNotification({ show: true, type: 'success', message: 'User deleted successfully!' });
        } catch (error) {
            setNotification({ show: true, type: 'error', message: 'Failed to delete user' });
        }
        setDeletePrompt({ show: false, userId: null });
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in relative">
            <NotificationToast data={notification} onClose={() => setNotification(prev => ({ ...prev, show: false }))} />

            {/* --- Action Bar --- */}
            <div className="flex justify-end">
                <button
                    onClick={handleOpenCreateModal}
                    className="bg-[#ff9100] hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl shadow-[0_0_15px_rgba(255,145,0,0.3)] hover:shadow-[0_0_20px_rgba(255,145,0,0.5)] uppercase flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95"
                >
                    <UserPlus size={20} /> Create New User
                </button>
            </div>

            {/* --- Users Table --- */}
            <div className="bg-[#383838] shadow-2xl rounded-2xl overflow-hidden border border-white/10">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#2a2a2a]">
                            <tr className="text-xs text-white/50 uppercase tracking-wider border-b border-white/10">
                                <th className="p-5 font-bold">ID</th>
                                <th className="p-5 font-bold">Username</th>
                                <th className="p-5 font-bold">Role</th>
                                <th className="p-5 font-bold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map((user, idx) => (
                                <tr key={user.Id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-5 text-white/60 font-mono text-sm">{idx + 1}</td>
                                    <td className="p-5 text-white font-bold text-lg">{user.Username}</td>
                                    <td className="p-5">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${user.Role === 'HOD'
                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                            : user.Role === 'HOF'
                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            }`}>
                                            {user.Role}
                                        </span>
                                    </td>
                                    <td className="p-5 text-center flex justify-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenEditModal(user)}
                                            className="p-2 bg-white/5 hover:bg-[#ff9100]/20 text-white hover:text-[#ff9100] rounded-lg transition-colors border border-white/5 hover:border-[#ff9100]/30"
                                            title="Edit User"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => setDeletePrompt({ show: true, userId: user.Id })}
                                            className="p-2 bg-white/5 hover:bg-red-500/20 text-white hover:text-red-400 rounded-lg transition-colors border border-white/5 hover:border-red-500/30"
                                            title="Delete User"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center p-12 text-white/40 italic">No users found in the system.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- Create User Modal --- */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#383838] border border-white/10 w-full max-w-md rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden scale-in">
                        <div className="bg-[#2a2a2a] px-6 py-5 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-extrabold text-lg text-white uppercase tracking-widest flex items-center gap-2">
                                <UserPlus size={20} className="text-[#ff9100]" /> {editUser ? 'Edit User' : 'Create User'}
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-white/40 hover:text-[#ff9100] transition-colors p-1">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateOrUpdateUser} className="p-6 flex flex-col gap-5">
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Username</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full bg-[#222] border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#ff9100] focus:ring-1 focus:ring-[#ff9100] transition-all"
                                    placeholder="Enter username"
                                />
                            </div>
                            {!editUser && (
                                <div>
                                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Password</label>
                                    <input
                                        type="password"
                                        required={!editUser}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-[#222] border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#ff9100] focus:ring-1 focus:ring-[#ff9100] transition-all"
                                        placeholder="Enter secure password"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Assign Role</label>
                                <div className="relative">
                                    <select
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full bg-[#222] border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#ff9100] focus:ring-1 focus:ring-[#ff9100] transition-all appearance-none cursor-pointer font-bold"
                                    >
                                        <option value="admin">ADMIN</option>
                                        <option value="hod">HOD (Head of Department)</option>
                                        <option value="hof">HOF (Head of Foundry)</option>
                                        <option value="supervisor">SUPERVISOR</option>
                                        <option value="operator">OPERATOR</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-white/50">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-4 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 text-sm font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-[#ff9100] hover:bg-orange-500 text-white font-bold py-3 rounded-xl uppercase transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,145,0,0.2)]"
                                >
                                    {loading ? <Loader className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                                    {loading ? 'Saving...' : (editUser ? 'Update User' : 'Create User')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Delete Confirmation Prompt --- */}
            {deletePrompt.show && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#383838] border border-red-500/30 w-full max-w-sm rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.3)] overflow-hidden scale-in">
                        <div className="p-6 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Delete User?</h3>
                            <p className="text-white/60 text-sm mb-6">
                                This action cannot be undone. Are you sure you want to permanently remove this user from the system?
                            </p>
                            <div className="flex w-full gap-3">
                                <button
                                    onClick={() => setDeletePrompt({ show: false, userId: null })}
                                    className="flex-1 py-3 text-sm font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteUser}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes scale-in {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .scale-in {
          animation: scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        @keyframes slide-in-right {
          0% { transform: translateX(100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
        </div>
    );
};

export default AdminPanel;
