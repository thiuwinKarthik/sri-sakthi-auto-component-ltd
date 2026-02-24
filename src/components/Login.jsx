import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { saveToken } from '../utils/auth';
import { Eye, EyeOff, LogIn, UserPlus, AlertCircle, Loader, CheckCircle } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('login'); // 'login' | 'signup'

    // Shared fields
    const [form, setForm] = useState({ username: '', password: '', confirm: '', role: 'OPERATOR' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const switchTab = (t) => {
        setTab(t);
        setForm({ username: '', password: '', confirm: '', role: 'OPERATOR' });
        setError('');
        setSuccess('');
    };

    /* -------- SIGN IN -------- */
    const handleLogin = async (e) => {
        e.preventDefault();
        if (!form.username.trim() || !form.password.trim()) {
            setError('Username and password are required.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', {
                username: form.username.trim(),
                password: form.password
            });
            saveToken(res.data.token);
            if (res.data.user.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /* -------- SIGN UP -------- */
    const handleRegister = async (e) => {
        e.preventDefault();
        if (!form.username.trim() || !form.password.trim()) {
            setError('Username and password are required.');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (form.password !== form.confirm) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('http://localhost:5000/api/auth/register', {
                username: form.username.trim(),
                password: form.password,
                role: form.role
            });
            saveToken(res.data.token);
            // Route based on assigned role
            if (res.data.user.role === 'ADMIN') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const isLogin = tab === 'login';

    return (
        <div className="h-screen w-screen bg-[#2d2d2d] flex flex-col overflow-hidden font-sans">
            {/* Top Orange Border */}
            <div className="h-1.5 bg-[#ff9100] flex-shrink-0 shadow-[0_0_15px_rgba(255,145,0,0.5)]" />

            {/* Main body */}
            <div className="flex-1 flex flex-col items-center justify-center px-4">

                {/* Company header */}
                <div className="flex flex-col items-center mb-10">
                    <h1 className="text-[2rem] md:text-[3rem] font-black text-center text-white tracking-tighter uppercase leading-tight drop-shadow-lg">
                        Sakthi Auto Component Limited
                    </h1>
                    <div className="w-32 h-1 bg-[#ff9100] mt-2 rounded-full" />
                    <p className="text-[#ff9100] tracking-widest uppercase text-xs font-bold mt-3">
                        Production Management System
                    </p>
                </div>

                {/* Card */}
                <div className="w-full max-w-md bg-[#383838] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Top color stripe */}
                    <div className="h-2 bg-[#ff9100]" />

                    {/* Tab switcher */}
                    <div className="flex border-b border-white/10 bg-[#2a2a2a]">
                        <button
                            onClick={() => switchTab('login')}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-widest transition-colors ${isLogin
                                ? 'text-[#ff9100] border-b-2 border-[#ff9100]'
                                : 'text-white/30 hover:text-white/60'
                                }`}
                        >
                            <LogIn className="w-4 h-4" /> Sign In
                        </button>
                        <button
                            onClick={() => switchTab('signup')}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-widest transition-colors ${!isLogin
                                ? 'text-[#ff9100] border-b-2 border-[#ff9100]'
                                : 'text-white/30 hover:text-white/60'
                                }`}
                        >
                            <UserPlus className="w-4 h-4" /> Sign Up
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={isLogin ? handleLogin : handleRegister} className="px-8 py-8 flex flex-col gap-5">

                        {/* Error / Success banners */}
                        {error && (
                            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 text-green-300 rounded-xl px-4 py-3 text-sm">
                                <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-400" />
                                {success}
                            </div>
                        )}

                        {/* Username */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-white/50 uppercase tracking-widest">
                                Username
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                autoComplete="username"
                                placeholder="Enter username"
                                className="w-full bg-[#222] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#ff9100] focus:ring-1 focus:ring-[#ff9100] transition-all font-medium"
                            />
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-white/50 uppercase tracking-widest">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                                    placeholder={isLogin ? 'Enter password' : 'Min. 6 characters'}
                                    className="w-full bg-[#222] border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/20 focus:outline-none focus:border-[#ff9100] focus:ring-1 focus:ring-[#ff9100] transition-all font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#ff9100] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password (Sign Up only) */}
                        {!isLogin && (
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-widest">
                                    Confirm Password
                                </label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="confirm"
                                    value={form.confirm}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    placeholder="Re-enter password"
                                    className="w-full bg-[#222] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#ff9100] focus:ring-1 focus:ring-[#ff9100] transition-all font-medium"
                                />
                            </div>
                        )}

                        {/* Role (Sign Up only) */}
                        {!isLogin && (
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-widest">
                                    Role
                                </label>
                                <div className="relative">
                                    <select
                                        name="role"
                                        value={form.role}
                                        onChange={handleChange}
                                        className="w-full bg-[#222] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff9100] focus:ring-1 focus:ring-[#ff9100] transition-all font-medium appearance-none cursor-pointer"
                                    >
                                        <option value="OPERATOR">Operator</option>
                                        <option value="SUPERVISOR">Supervisor</option>
                                        <option value="HOD">HOD (Head of Department)</option>
                                        <option value="HOF">HOF (Head of Foundry)</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-white/40">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#ff9100] hover:bg-orange-500 text-white font-black py-3.5 rounded-xl uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,145,0,0.3)] hover:shadow-[0_0_30px_rgba(255,145,0,0.5)] disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 mt-1"
                        >
                            {loading ? (
                                <><Loader className="w-5 h-5 animate-spin" /> {isLogin ? 'Signing In...' : 'Creating Account...'}</>
                            ) : isLogin ? (
                                <><LogIn className="w-5 h-5" /> Sign In</>
                            ) : (
                                <><UserPlus className="w-5 h-5" /> Create Account</>
                            )}
                        </button>

                        {/* Toggle hint */}
                        <p className="text-center text-white/30 text-xs mt-1">
                            {isLogin ? "Don't have an account? " : 'Already have an account? '}
                            <button
                                type="button"
                                onClick={() => switchTab(isLogin ? 'signup' : 'login')}
                                className="text-[#ff9100] font-bold hover:underline"
                            >
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </button>
                        </p>
                    </form>
                </div>

                {/* Footer */}
                <p className="mt-8 text-white/20 text-xs uppercase tracking-widest">
                    © 2024 Sakthi Auto Component Ltd. All rights reserved.
                </p>
            </div>

            {/* Bottom Orange Border */}
            <div className="h-1.5 bg-[#ff9100] flex-shrink-0" />
        </div>
    );
}
