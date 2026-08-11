/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  Shield, 
  ShieldAlert, 
  Users, 
  Lock, 
  Unlock, 
  Clock, 
  Activity, 
  Terminal, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Download, 
  Settings, 
  RefreshCw, 
  Sliders, 
  Globe, 
  Search, 
  Filter, 
  Database, 
  Sparkles, 
  UserCheck, 
  Power, 
  Key, 
  LogOut, 
  Info, 
  Calendar, 
  ChevronRight,
  Eye,
  EyeOff,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  FileSpreadsheet,
  Menu,
  X,
  Trash2
} from 'lucide-react';
import { User, LoginLog, AttackLog, BlockedIP, Alert, Report, SystemSettings, SecurityStats } from './types';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Core application state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'simulation' | 'activity_logs' | 'attack_logs' | 'blocked_ips' | 'user_manager' | 'reports' | 'settings' | 'about'>('dashboard');
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [chartsData, setChartsData] = useState<any>(null);
  const [loginLogsList, setLoginLogsList] = useState<LoginLog[]>([]);
  const [attackLogsList, setAttackLogsList] = useState<AttackLog[]>([]);
  const [blockedIPsList, setBlockedIPsList] = useState<BlockedIP[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [alertsList, setAlertsList] = useState<Alert[]>([]);
  const [reportsList, setReportsList] = useState<Report[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Filters state
  const [logsSearch, setLogsSearch] = useState('');
  const [logsStatusFilter, setLogsStatusFilter] = useState<string>('');
  const [attacksSearch, setAttacksSearch] = useState('');
  const [attacksTypeFilter, setAttacksTypeFilter] = useState<string>('');

  // Forms state
  const [newUsername, setNewUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Administrator' | 'User'>('User');
  const [userFormError, setUserFormError] = useState('');
  const [userFormSuccess, setUserFormSuccess] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [resetModalUserId, setResetModalUserId] = useState<string | null>(null);
  const [resetModalPassword, setResetModalPassword] = useState('');
  const [resetModalSuccess, setResetModalSuccess] = useState('');
  const [resetModalError, setResetModalError] = useState('');
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [manualIpAddress, setManualIpAddress] = useState('');
  const [manualIpReason, setManualIpReason] = useState('');
  const [manualIpDuration, setManualIpDuration] = useState('300');
  const [ipFormError, setIpFormError] = useState('');
  const [ipFormSuccess, setIpFormSuccess] = useState('');

  // Report creation state
  const [reportNotes, setReportNotes] = useState('');
  const [reportType, setReportType] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);



  // Simulation loader state
  const [activeSimulation, setActiveSimulation] = useState<string | null>(null);
  const [simulationResponse, setSimulationResponse] = useState<string | null>(null);

  // Fetch all state data helper
  const refreshAllData = async () => {
    const fetchJsonSafe = async <T,>(url: string): Promise<T | null> => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`Fetch to ${url} failed with status ${res.status}`);
          return null;
        }
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await res.json() as T;
        }
        console.warn(`Fetch to ${url} returned non-JSON content type: ${contentType}`);
        return null;
      } catch (err) {
        console.error(`Error fetching/parsing ${url}:`, err);
        return null;
      }
    };

    try {
      const [
        statsData,
        chartsData,
        logsData,
        attacksData,
        blockedData,
        usersData,
        alertsData,
        reportsData,
        settingsData
      ] = await Promise.all([
        fetchJsonSafe<any>('/api/analytics/stats'),
        fetchJsonSafe<any>('/api/analytics/charts'),
        fetchJsonSafe<any[]>('/api/logs?limit=100'),
        fetchJsonSafe<any[]>('/api/logs/attacks'),
        fetchJsonSafe<any[]>('/api/blocked-ips'),
        fetchJsonSafe<any[]>('/api/users'),
        fetchJsonSafe<any[]>('/api/alerts'),
        fetchJsonSafe<any[]>('/api/reports'),
        fetchJsonSafe<any>('/api/settings')
      ]);

      if (statsData) setStats(statsData);
      if (chartsData) setChartsData(chartsData);
      if (logsData) setLoginLogsList(logsData);
      if (attacksData) setAttackLogsList(attacksData);
      if (blockedData) setBlockedIPsList(blockedData);
      if (usersData) setUsersList(usersData);
      if (alertsData) setAlertsList(alertsData);
      if (reportsData) setReportsList(reportsData);
      if (settingsData) setSettings(settingsData);
      setLastSynced(new Date());
    } catch (err) {
      console.error('Error refreshing system data:', err);
    }
  };

  // Run on load and periodically
  useEffect(() => {
    // Force clean up of any legacy sessions on boot to ensure the login page always starts first
    localStorage.removeItem('mufasa_session');
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshAllData();
      const interval = setInterval(refreshAllData, 8000); // Poll every 8s
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Auth: handle login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthenticating(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
          ipAddress: '192.168.1.100' // Simulated user IP
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
      } else {
        setCurrentUser(data.user);
      }
    } catch (err) {
      setAuthError('Connection server error during login.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Auth: shortcut login buttons
  const triggerShortcutLogin = (role: 'Admin' | 'User') => {
    if (role === 'Admin') {
      setLoginUsername('admin');
      setLoginPassword('admin123');
    } else {
      setLoginUsername('john_developer');
      setLoginPassword('user123');
    }
  };

  // Auth: handle logout
  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
    setIsMobileMenuOpen(false);
  };

  // Simulation: Trigger attack on server
  const runSimulation = async (type: 'brute-force' | 'credential-stuffing' | 'rate-limit' | 'blocked-ip') => {
    setActiveSimulation(type);
    setSimulationResponse(null);
    try {
      const res = await fetch(`/api/simulation/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin' })
      });
      const data = await res.json();
      setSimulationResponse(data.message);
      await refreshAllData();
    } catch (err) {
      setSimulationResponse('Simulation request timeout.');
    } finally {
      setActiveSimulation(null);
    }
  };

  // Action: Unblock IP Address
  const handleUnblockIp = async (ipAddress: string) => {
    try {
      const res = await fetch('/api/blocked-ips/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress })
      });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (err) {
      console.error('Error unblocking IP:', err);
    }
  };

  // Action: Manual Block IP Address
  const handleManualBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIpFormError('');
    setIpFormSuccess('');

    if (!manualIpAddress || !manualIpReason) {
      setIpFormError('Please fill out all IP address parameters');
      return;
    }

    try {
      const res = await fetch('/api/blocked-ips/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: manualIpAddress,
          reason: manualIpReason,
          durationSeconds: Number(manualIpDuration)
        })
      });

      if (!res.ok) {
        const d = await res.json();
        setIpFormError(d.error || 'Failed to apply block');
      } else {
        setIpFormSuccess(`IP Address ${manualIpAddress} successfully banned.`);
        setManualIpAddress('');
        setManualIpReason('');
        await refreshAllData();
      }
    } catch (err) {
      setIpFormError('Server connection error.');
    }
  };

  // Action: Register User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');
    setUserFormSuccess('');

    if (!newUsername || !newUserEmail) {
      setUserFormError('All fields are mandatory.');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          email: newUserEmail,
          role: newUserRole,
          password: newUserPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setUserFormError(data.error || 'Failed to register user.');
      } else {
        setUserFormSuccess(`User ${newUsername} successfully created under role ${newUserRole}.`);
        setNewUsername('');
        setNewUserEmail('');
        setNewUserPassword('');
        await refreshAllData();
      }
    } catch (err) {
      setUserFormError('Server connection error.');
    }
  };

  // Action: Toggle User status (Activate/Deactivate)
  const handleToggleUserStatus = async (userId: string) => {
    try {
      const res = await fetch('/api/users/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        await refreshAllData();
      } else {
        const d = await res.json();
        alert(d.error || 'Action not permitted.');
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
    }
  };

  // Action: Permanently delete a user operator identity
  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        setDeleteConfirmUserId(null);
        await refreshAllData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete identity.');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  // Action: Open Reset/Update User Passcode Modal
  const handleResetPassword = (userId: string) => {
    setResetModalUserId(userId);
    setResetModalPassword('');
    setResetModalSuccess('');
    setResetModalError('');
    setShowModalPassword(false);
  };

  // Action: Submit updated passcode
  const handleSubmitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUserId) return;
    if (!resetModalPassword.trim()) {
      setResetModalError('Please enter a valid passcode.');
      return;
    }

    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetModalUserId, newPassword: resetModalPassword.trim() })
      });
      const d = await res.json();
      if (res.ok) {
        setResetModalSuccess(d.message);
        setResetModalError('');
        
        // Auto-reveal the passcode in the table
        const targetId = resetModalUserId;
        setVisiblePasswords(prev => ({ ...prev, [targetId]: true }));
        
        await refreshAllData();
        
        // Gracefully auto-close modal
        setTimeout(() => {
          setResetModalUserId(null);
          setResetModalPassword('');
          setResetModalSuccess('');
        }, 1800);
      } else {
        setResetModalError(d.error || 'Failed to update passcode.');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      setResetModalError('An error occurred. Please try again.');
    }
  };

  // Action: Generate Security Report
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          notes: reportNotes
        })
      });

      if (res.ok) {
        setReportNotes('');
        await refreshAllData();
      }
    } catch (err) {
      console.error('Error compiling report:', err);
    }
  };

  // Action: Update System Settings
  const handleUpdateSettings = async (updatedSettings: Partial<SystemSettings>) => {
    if (!settings) return;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        alert('Security parameters updated successfully.');
      }
    } catch (err) {
      console.error('Error updating settings:', err);
    }
  };



  // Action: Clear all alerts on server (mark as read)
  const handleClearAlerts = async () => {
    try {
      const res = await fetch('/api/alerts/mark-read', { method: 'POST' });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (err) {
      console.error('Error clearing alerts:', err);
    }
  };

  // Filters for Activity Logs
  const filteredLoginLogs = loginLogsList.filter(l => {
    const query = logsSearch.toLowerCase();
    const matchesSearch = l.username.toLowerCase().includes(query) || l.ipAddress.includes(query) || (l.failureReason && l.failureReason.toLowerCase().includes(query));
    const matchesStatus = logsStatusFilter === '' || l.status === logsStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filters for Attack Logs
  const filteredAttackLogs = attackLogsList.filter(a => {
    const query = attacksSearch.toLowerCase();
    const matchesSearch = a.ipAddress.includes(query) || (a.username && a.username.toLowerCase().includes(query)) || a.details.toLowerCase().includes(query);
    const matchesType = attacksTypeFilter === '' || a.type === attacksTypeFilter;
    return matchesSearch && matchesType;
  });

  // Color mappings
  const COLORS = {
    Success: '#10B981', // emerald
    Failed: '#EF4444', // red
    'Brute Force': '#EF4444',
    'Credential Stuffing': '#EC4899', // pink
    'Rate Limit Violation': '#F59E0B', // amber
    'Blocked IP Attempt': '#3B82F6', // blue
  };

  // Check if IP is actively blocked in frontend (for formatting countdowns/badges)
  const isIPCurrentlyBanned = (blockedUntilStr: string, status: string): boolean => {
    if (status !== 'Active') return false;
    return new Date(blockedUntilStr).getTime() > Date.now();
  };

  // Return Login layout if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12 font-sans relative overflow-hidden">
        {/* Animated Background Accents */}
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, -30, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{
            scale: [1, 1.15, 1],
            x: [0, -40, 0],
            y: [0, 20, 0]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            repeatType: "reverse",
            delay: 1
          }}
          className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" 
        />

        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            y: [0, -14, 0]
          }}
          transition={{ 
            opacity: { duration: 0.6, ease: "easeOut" },
            scale: { duration: 0.6, ease: "easeOut" },
            y: { 
              duration: 3.5, 
              repeat: Infinity, 
              repeatType: "reverse", 
              ease: "easeInOut" 
            }
          }}
          className="w-full max-w-md bg-slate-900/60 border border-slate-800/85 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] p-8 backdrop-blur-xl relative z-10 hover:border-slate-800 transition-all duration-300"
        >
          {/* Main Logo Header */}
          <div className="flex flex-col items-center justify-center text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-4">
              <Shield className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">MUFASA</h1>
            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mt-1">API Security Suite</p>
            <p className="text-slate-400 text-xs mt-3 max-w-xs leading-relaxed">
              Design & Implementation of a Web-Based Security Management System for Detecting Fraudulent Logins
            </p>
          </div>

          {/* Actual Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="username">Username</label>
              <div className="relative">
                <input 
                  id="username"
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter credential ID"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition duration-150"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="password">Password</label>
              <div className="relative">
                <input 
                  id="password"
                  type={showLoginPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter system passcode"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-3 pl-4 pr-11 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition duration-150"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                  title={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs text-red-300 leading-normal">{authError}</span>
              </div>
            )}

            <button 
              id="login-btn"
              type="submit"
              disabled={isAuthenticating}
              className="w-full bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-450 hover:to-blue-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/15 focus:outline-none transition duration-150 flex items-center justify-center gap-2 mt-2"
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Authenticating System...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Establish Secure Session
                </>
              )}
            </button>
          </form>

          {/* Scientific Academic Footer */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-mono">Academic Research Project</span>
            <span className="text-[10px] text-slate-500 block font-sans">Diploma in Information Technology — Securing Login Architecture</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Determine administrator access flag
  const isAdmin = currentUser.role === 'Administrator';

  // Format alert center counters
  const unreadAlertsCount = alertsList.filter(a => !a.isRead).length;

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col md:flex-row">
      {/* 1. SIDEBAR NAVIGATION */}
      <aside className="sticky top-0 z-30 w-full md:sticky md:top-0 md:h-screen md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 shrink-0 flex flex-col">
        {/* Core Suite Header - ALWAYS STAGNANT (Sticky top on mobile/desktop) */}
        <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-40 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-display font-bold text-white tracking-wide block">MUFASA</span>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block">Security Suite</span>
            </div>
          </div>

          {/* Toggle Menu Button for Mobile Screens */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-805 transition duration-150 flex items-center justify-center focus:outline-none"
            title="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Collapsible Mobile Navigation Wrapper */}
        <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col flex-1 overflow-y-auto max-h-[calc(100vh-80px)] md:max-h-none bg-slate-900 md:bg-transparent`}>
          {/* User Logged In Summary */}
          <div className="p-4 md:p-6 pb-0">
            <div className="bg-slate-850 rounded-lg p-3 border border-slate-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold uppercase border border-slate-700 text-xs">
                {currentUser.username[0]}
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-semibold text-slate-200 block truncate">{currentUser.username}</span>
                <span className="text-[10px] text-slate-400 block font-mono truncate">{currentUser.role}</span>
              </div>
            </div>
          </div>

          {/* Dynamic Navigation Menu */}
          <nav className="flex-1 p-4 space-y-1">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest px-3 block mb-2">Monitor Area</span>
            
            <button 
              type="button"
              onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition duration-150 ${activeTab === 'dashboard' ? 'bg-slate-800 text-white border-l-4 border-emerald-500 pl-2' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'}`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              Admin Dashboard
            </button>

            <button 
              type="button"
              onClick={() => { setActiveTab('activity_logs'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition duration-150 ${activeTab === 'activity_logs' ? 'bg-slate-800 text-white border-l-4 border-emerald-500 pl-2' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'}`}
            >
              <Database className="w-4 h-4 shrink-0" />
              Login Activity Logs
            </button>

            <button 
              type="button"
              onClick={() => { setActiveTab('attack_logs'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition duration-150 ${activeTab === 'attack_logs' ? 'bg-slate-800 text-white border-l-4 border-emerald-500 pl-2' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'}`}
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Attack Intrusion Logs
            </button>

            {isAdmin && (
              <>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest px-3 block pt-4 mb-2">Controls</span>

                <button 
                  type="button"
                  onClick={() => { setActiveTab('simulation'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition duration-150 ${activeTab === 'simulation' ? 'bg-slate-800 text-white border-l-4 border-amber-500 pl-2' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'}`}
                >
                  <Terminal className="w-4 h-4 shrink-0 text-amber-400" />
                  Simulation Mode
                </button>

                <button 
                  type="button"
                  onClick={() => { setActiveTab('blocked_ips'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition duration-150 ${activeTab === 'blocked_ips' ? 'bg-slate-800 text-white border-l-4 border-emerald-500 pl-2' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'}`}
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  IP Access Blocklist
                  {blockedIPsList.filter(b => isIPCurrentlyBanned(b.blockedUntil, b.status)).length > 0 && (
                    <span className="ml-auto bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                      {blockedIPsList.filter(b => isIPCurrentlyBanned(b.blockedUntil, b.status)).length}
                    </span>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={() => { setActiveTab('user_manager'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition duration-150 ${activeTab === 'user_manager' ? 'bg-slate-800 text-white border-l-4 border-emerald-500 pl-2' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'}`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  Identity Manager
                </button>

                <button 
                  type="button"
                  onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition duration-150 ${activeTab === 'reports' ? 'bg-slate-800 text-white border-l-4 border-emerald-500 pl-2' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'}`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  Security Audit Reports
                </button>

                <button 
                  type="button"
                  onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition duration-150 ${activeTab === 'settings' ? 'bg-slate-800 text-white border-l-4 border-emerald-500 pl-2' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'}`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  Suite Configurations
                </button>
              </>
            )}

            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest px-3 block pt-4 mb-2">Support</span>

            <button 
              type="button"
              onClick={() => { setActiveTab('about'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition duration-150 ${activeTab === 'about' ? 'bg-slate-800 text-white border-l-4 border-emerald-500 pl-2' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'}`}
            >
              <Info className="w-4 h-4 shrink-0" />
              Comparison & Guide
            </button>
          </nav>

          {/* Footer Logout Option */}
          <div className="p-4 border-t border-slate-800 bg-slate-905">
            <button 
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition duration-150"
            >
              <LogOut className="w-4 h-4" />
              Terminate Session
            </button>
          </div>
        </div>
      </aside>

      {/* 2. PRIMARY MAIN CONTENT PANEL */}
      <main className="flex-1 min-w-0 bg-slate-950 flex flex-col min-h-screen">
        {/* Top Header Controls Bar */}
        <header className="bg-slate-900 border-b border-slate-800 h-16 px-6 flex items-center justify-between relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-200 font-display uppercase tracking-wider">
              {activeTab === 'dashboard' && 'System Dashboard'}
              {activeTab === 'simulation' && 'Security Simulation Sandbox'}
              {activeTab === 'activity_logs' && 'User Login Activity Audits'}
              {activeTab === 'attack_logs' && 'Security Intrusion Detection'}
              {activeTab === 'blocked_ips' && 'IP Banishment Protocols'}
              {activeTab === 'user_manager' && 'Role & Access Identity Management'}
              {activeTab === 'reports' && 'Compiled Audits & Reports'}
              {activeTab === 'settings' && 'System Defense Configuration'}
              {activeTab === 'about' && 'Comparative Technologies & Framework'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Alert bell count */}
            {unreadAlertsCount > 0 && (
              <div className="relative">
                <button 
                  onClick={handleClearAlerts}
                  title="Clear All Notifications"
                  className="bg-slate-850 border border-slate-700/80 hover:bg-slate-800 rounded-xl p-2 flex items-center gap-2 text-xs font-medium text-amber-400 transition duration-150"
                >
                  <AlertTriangle className="w-4 h-4 animate-bounce" />
                  <span>{unreadAlertsCount} Unread Alert{unreadAlertsCount === 1 ? '' : 's'}</span>
                  <span className="text-[10px] text-slate-400 font-normal underline">(Mark Read)</span>
                </button>
              </div>
            )}

            {/* Sync timestamp and refresh button */}
            <div className="flex items-center gap-2.5">
              {lastSynced && (
                <span className="text-[11px] font-mono text-slate-400 hidden md:inline-block">
                  Last synced: <strong className="text-slate-200">{lastSynced.toLocaleTimeString()}</strong>
                </span>
              )}
              <button 
                onClick={refreshAllData}
                title="Manual Telemetry Refresh"
                className="bg-slate-805 border border-slate-700 hover:bg-slate-800 rounded-xl p-2.5 text-slate-400 hover:text-white transition duration-150 flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content View Routing Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">

          {/* VIEW: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Dynamic Security Health Warning Banner */}
              {stats && (
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
                  stats.threatLevel === 'High' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : stats.threatLevel === 'Medium' 
                    ? 'bg-yellow-500/10 border-yellow-500/30' 
                    : 'bg-emerald-500/10 border-emerald-500/30'
                }`}>
                  <div className="flex items-start gap-3.5">
                    <div className={`p-3 rounded-xl ${
                      stats.threatLevel === 'High' ? 'bg-red-500/15 text-red-400' : stats.threatLevel === 'Medium' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-emerald-500/15 text-emerald-400'
                    }`}>
                      <Shield className="w-6 h-6 shrink-0" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white tracking-wide">Threat Status: {stats.threatLevel}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          stats.threatLevel === 'High' ? 'bg-red-500/20 text-red-400' : stats.threatLevel === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          ● SYSTEM STABILIZED
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        {stats.threatLevel === 'High' && 'Warning: Multiple severe attack patterns detected over the last 24 hours. Rate limiting and IP bans are being automatically enforced.'}
                        {stats.threatLevel === 'Medium' && 'Caution: Medium-severity anomalous brute force probes detected. Automated systems are holding connection gates securely.'}
                        {stats.threatLevel === 'Low' && 'No active threats detected. Recent anomalies were mitigated automatically.'}
                      </p>
                    </div>
                  </div>

                </div>
              )}

              {/* STAT CARDS ROW */}
              {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Score Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-300" />
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-xs font-mono uppercase tracking-wider block">Security Score</span>
                          <div className="group/tip relative inline-flex items-center cursor-help">
                            <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-emerald-400 transition" />
                            <div className="absolute top-full left-0 mt-2 hidden group-hover/tip:block w-64 p-3 bg-slate-950 border border-slate-700 rounded-xl text-[10px] text-slate-300 font-normal leading-normal shadow-2xl z-50 pointer-events-none">
                              <div className="font-semibold text-emerald-400 mb-1">Score Calculation Matrix:</div>
                              <ul className="space-y-1 font-mono text-[10px] text-slate-300">
                                <li>• Baseline Score: <span className="text-white">100 pts</span></li>
                                <li>• Active IP Bans: <span className="text-red-400">-15 pts each</span></li>
                                <li>• Anomalous Alerts (24h): <span className="text-amber-400">-5 pts each</span></li>
                                <li>• Auth Failures (24h): <span className="text-yellow-400">-2 pts each</span></li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        <span className="text-3xl font-display font-bold text-white block mt-1.5">{stats.securityScore} <span className="text-xs text-slate-500 font-normal">/ 100</span></span>
                      </div>
                      <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${stats.securityScore > 80 ? 'bg-emerald-500' : stats.securityScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${stats.securityScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Active Bans Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all duration-300" />
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-slate-400 text-xs font-mono uppercase tracking-wider block">Banned IPs</span>
                        <span className="text-3xl font-display font-bold text-white block mt-1.5">{stats.blockedIPsCount}</span>
                      </div>
                      <div className="p-2.5 bg-red-500/15 text-red-400 rounded-xl">
                        <Globe className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                      <span>Currently Isolated Blocklist</span>
                      <span className="text-slate-500">Live Firewall</span>
                    </div>
                  </div>

                  {/* Logins Today Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-300" />
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-slate-400 text-xs font-mono uppercase tracking-wider block">Auth Activity (24h)</span>
                        <span className="text-3xl font-display font-bold text-white block mt-1.5">
                          {stats.successfulLoginsToday + stats.failedLoginsToday}
                        </span>
                      </div>
                      <div className="p-2.5 bg-blue-500/15 text-blue-400 rounded-xl">
                        <Activity className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-xs">
                      <span className="text-emerald-400 font-semibold">{stats.successfulLoginsToday} Ok</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-red-400 font-semibold">{stats.failedLoginsToday} Failures</span>
                    </div>
                  </div>

                  {/* Total Suspicious Incidents Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-300" />
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-slate-400 text-xs font-mono uppercase tracking-wider block">Anomalous Alerts (24h)</span>
                        <span className="text-3xl font-display font-bold text-white block mt-1.5">{stats.totalSuspiciousActivities}</span>
                      </div>
                      <div className="p-2.5 bg-amber-500/15 text-amber-400 rounded-xl">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                      {stats.totalSuspiciousActivities > 0 && stats.mostTargetedUser ? (
                        <span>Most Targeted: <strong className="text-slate-200">{stats.mostTargetedUser}</strong></span>
                      ) : (
                        <span className="text-slate-500 italic">Most Targeted: None</span>
                      )}
                      <span className="text-slate-500">24H Window</span>
                    </div>
                  </div>
                </div>
              )}

              {/* CHARTS GRID SECTION */}
              {chartsData ? (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Left Column: Logins Success vs Failed Pie & Attack types breakdown Donut */}
                  <div className="xl:col-span-1 space-y-6 flex flex-col">
                    {/* Ratio Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">Session Request Success Ratio</h4>
                        <span className="text-xs text-slate-500">Breakdown of legitimate logins vs authentication rejections.</span>
                      </div>
                      <div className="h-48 my-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartsData.pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              <Cell fill="#10B981" /> {/* success */}
                              <Cell fill="#EF4444" /> {/* failed */}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px' }} 
                              itemStyle={{ color: '#F1F5F9' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-around items-center text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                          <span className="text-slate-300">Success ({chartsData.pieData[0].value})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full" />
                          <span className="text-slate-300">Rejected ({chartsData.pieData[1].value})</span>
                        </div>
                      </div>
                    </div>

                    {/* Donut Card for Attacks */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">Threat Signatures Breakdown</h4>
                        <span className="text-xs text-slate-500">Distribution of blocked malicious login vectors.</span>
                      </div>
                      <div className="h-48 my-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartsData.donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {chartsData.donutData.map((entry: any, index: number) => {
                                let fill = '#8B5CF6'; // purple default
                                if (entry.name === 'Brute Force') fill = '#EF4444';
                                if (entry.name === 'Credential Stuffing') fill = '#EC4899';
                                if (entry.name === 'Rate Limit Violation') fill = '#F59E0B';
                                if (entry.name === 'Blocked IP Attempt') fill = '#3B82F6';
                                return <Cell key={`cell-${index}`} fill={fill} />;
                              })}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px' }} 
                              itemStyle={{ color: '#F1F5F9' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-red-500 rounded-sm" />
                          <span>Brute Force ({chartsData.donutData.find((d: any) => d.name === 'Brute Force')?.value || 0})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-pink-500 rounded-sm" />
                          <span>Stuffing ({chartsData.donutData.find((d: any) => d.name === 'Credential Stuffing')?.value || 0})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-amber-500 rounded-sm" />
                          <span>Rate Limits ({chartsData.donutData.find((d: any) => d.name === 'Rate Limit Violation')?.value || 0})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
                          <span>Banned IP ({chartsData.donutData.find((d: any) => d.name === 'Blocked IP Attempt')?.value || 0})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (2/3 size): Weekly Line Graph & Monthly Graph */}
                  <div className="xl:col-span-2 space-y-6">
                    {/* Weekly Line chart */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">Legitimate vs Malicious 7-Day Activity Trends</h4>
                        <span className="text-xs text-slate-500">Security gates historical success and blocked login failures.</span>
                      </div>
                      <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartsData.weeklyTrends}>
                            <defs>
                              <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                            <XAxis dataKey="day" stroke="#64748B" fontSize={11} />
                            <YAxis stroke="#64748B" fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px' }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Area type="monotone" dataKey="successful" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorSuccess)" name="Successful Sessions" />
                            <Area type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFailed)" name="Authentication Failures" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Fraudulent Login Attempts Per Day Column Graph */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">Daily Fraud Probes & Automated Defended Blocks</h4>
                        <span className="text-xs text-slate-500">Daily counts of flagged malicious login scans blocked in real-time.</span>
                      </div>
                      <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartsData.dailyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                            <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                            <YAxis stroke="#64748B" fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px' }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="failedAttempts" fill="#F59E0B" name="Blocked Password Failures" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="attacksDetected" fill="#EF4444" name="Flagged Attack Incidents" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
                  <span>Loading dashboard visual statistics...</span>
                </div>
              )}

              {/* QUICK TABLE LIST OF RECENT INTRUSIONS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 5 Recent Login Logs */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h4 className="text-sm font-semibold text-slate-200">Recent Login Session Logs</h4>
                    <button onClick={() => setActiveTab('activity_logs')} className="text-xs text-emerald-400 hover:underline">View All</button>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                          <th className="pb-2">User / Target</th>
                          <th className="pb-2">IP Address</th>
                          <th className="pb-2">Time</th>
                          <th className="pb-2 text-right">Gate Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                        {loginLogsList.slice(0, 5).map(l => (
                          <tr key={l.id} className="hover:bg-slate-850/35 transition">
                            <td className="py-2.5 font-medium text-white">{l.username}</td>
                            <td className="py-2.5 font-mono">{l.ipAddress}</td>
                            <td className="py-2.5 text-slate-400">{new Date(l.timestamp).toLocaleTimeString()}</td>
                            <td className="py-2.5 text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                                l.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                              }`}>
                                {l.status === 'Success' ? 'Authorized' : 'Rejected'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Unread Alerts Feed */}
                <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h4 className="text-sm font-semibold text-slate-200">Active Security Alerts</h4>
                    {alertsList.length > 0 && (
                      <button onClick={handleClearAlerts} className="text-xs text-slate-400 hover:text-white underline">Mark Read</button>
                    )}
                  </div>
                  <div className="mt-4 space-y-3">
                    {alertsList.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">No unread security alerts recorded.</p>
                    ) : (
                      alertsList.slice(0, 4).map(al => (
                        <div key={al.id} className={`p-3 rounded-xl border flex gap-2.5 ${
                          al.severity === 'High' ? 'bg-red-500/5 border-red-500/20' : al.severity === 'Medium' ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-slate-800/50 border-slate-800'
                        }`}>
                          <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                            al.severity === 'High' ? 'text-red-400' : al.severity === 'Medium' ? 'text-yellow-400' : 'text-slate-400'
                          }`} />
                          <div>
                            <span className="text-xs font-semibold text-slate-200 block leading-tight">{al.title}</span>
                            <span className="text-[10px] text-slate-400 block leading-normal mt-0.5">{al.message}</span>
                            <span className="text-[9px] text-slate-500 font-mono block mt-1">{new Date(al.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* VIEW: SECURITY SIMULATION SANDBOX */}
          {activeTab === 'simulation' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-amber-400 animate-pulse" />
                    MUFASA Security Simulation Sandbox
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Trigger active credential attack scenarios live on the server to test detection alerts, threat score degradation, and automated IP blocking protocols.
                  </p>
                </div>
                <span className="text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 py-1 px-2.5 rounded-full font-mono font-semibold self-start md:self-center">
                  ★ DIPLOMA PRESENTATION MODE ACTIVE
                </span>
              </div>

              {/* Simulator Control Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
                {/* Brute Force Trigger */}
                <div className="bg-slate-850 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-red-400 block">💥 Brute Force Attack</span>
                      <span className="text-[9px] font-mono font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">CRITICAL</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      Fires 5 rapid failed login tries in 5 seconds on administrator login routes from a mock host IP.
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => runSimulation('brute-force')}
                    disabled={activeSimulation !== null}
                    className="mt-5 w-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold py-2.5 px-3 rounded-lg border border-red-500/50 shadow-md shadow-red-600/20 transition duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {activeSimulation === 'brute-force' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : 'Simulate Brute Force'}
                  </button>
                </div>

                {/* Credential Stuffing Trigger */}
                <div className="bg-slate-850 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-orange-400 block">🤖 Credential Stuffing</span>
                      <span className="text-[9px] font-mono font-bold bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/30">HIGH</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      Attempts to authenticate 6 distinct usernames within seconds, simulating an automated password bot dictionary.
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => runSimulation('credential-stuffing')}
                    disabled={activeSimulation !== null}
                    className="mt-5 w-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold py-2.5 px-3 rounded-lg border border-orange-500/50 shadow-md shadow-orange-600/20 transition duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {activeSimulation === 'credential-stuffing' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : 'Run Credential Stuffing Test'}
                  </button>
                </div>

                {/* Rate Limit Trigger */}
                <div className="bg-slate-850 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-amber-400 block">⚡ Rate Limit Inundation</span>
                      <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">MEDIUM</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      Generates 185 simulated page requests instantly from a single IP, overwhelming standard API request gates.
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => runSimulation('rate-limit')}
                    disabled={activeSimulation !== null}
                    className="mt-5 w-full bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold py-2.5 px-3 rounded-lg border border-amber-400/50 shadow-md shadow-amber-600/20 transition duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {activeSimulation === 'rate-limit' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : 'Test Rate Limiting'}
                  </button>
                </div>

                {/* Blocked IP Attempt */}
                <div className="bg-slate-850 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-blue-400 block">🚫 Blocked IP Attempt</span>
                      <span className="text-[9px] font-mono font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">LOW</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      Simulates an unauthorized login attempt originating from an IP already placed on the system blocklist.
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => runSimulation('blocked-ip')}
                    disabled={activeSimulation !== null}
                    className="mt-5 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 px-3 rounded-lg border border-blue-500/50 shadow-md shadow-blue-600/20 transition duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {activeSimulation === 'blocked-ip' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : 'Simulate Blocked IP Access'}
                  </button>
                </div>
              </div>

              {/* Simulation output console */}
              {simulationResponse && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 shadow-xl"
                >
                  <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>MUFASA INTRUSION INTERFACES LOGGED SUCCESS:</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-line text-slate-300">{simulationResponse}</p>
                </motion.div>
              )}
            </div>
          )}


          {/* VIEW: ACTIVITY LOGS */}
          {activeTab === 'activity_logs' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              {/* Header with quick statistics and explanation */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-400" />
                    Authentication Activity Audit Logs
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Complete records of all inbound web and API login attempts. Use the advanced tools to filter parameters.
                  </p>
                </div>
                {/* Total logins indicator */}
                <div className="text-xs bg-slate-800 border border-slate-700 py-2 px-3 rounded-xl font-mono text-slate-300">
                  Total Captured Session Requests: <strong className="text-white">{loginLogsList.length}</strong>
                </div>
              </div>

              {/* Advanced Filter Box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                  <input 
                    type="text"
                    placeholder="Search by username, IP..."
                    value={logsSearch}
                    onChange={(e) => setLogsSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                  <select 
                    value={logsStatusFilter}
                    onChange={(e) => setLogsStatusFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 appearance-none"
                  >
                    <option value="">All Authenticate States</option>
                    <option value="Success">Success (Authorized)</option>
                    <option value="Failed">Failed (Rejected)</option>
                  </select>
                </div>

                {/* Reset filters button */}
                <button 
                  onClick={() => { setLogsSearch(''); setLogsStatusFilter(''); }}
                  className="bg-slate-800 hover:bg-slate-750 border border-slate-700 py-2 px-4 rounded-xl text-xs text-slate-300 transition duration-150 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Clear Search Filters
                </button>
              </div>

              {/* Login Log Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                      <th className="pb-2.5">User / Target Account</th>
                      <th className="pb-2.5">IP Address</th>
                      <th className="pb-2.5">Timestamp (UTC)</th>
                      <th className="pb-2.5">Device, Browser & OS</th>
                      <th className="pb-2.5">Authentication Code</th>
                      <th className="pb-2.5">Anomaly Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                    {filteredLoginLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500 font-mono">No matching login activity logs recorded.</td>
                      </tr>
                    ) : (
                      filteredLoginLogs.map(l => (
                        <tr key={l.id} className="hover:bg-slate-850/20 transition">
                          <td className="py-3.5 font-bold text-white">{l.username}</td>
                          <td className="py-3.5 font-mono">{l.ipAddress}</td>
                          <td className="py-3.5 font-mono text-slate-400">{new Date(l.timestamp).toLocaleString()}</td>
                          <td className="py-3.5 text-slate-400">
                            <span className="block font-medium text-slate-300 text-[11px]">{l.device}</span>
                            <span className="text-[10px] block text-slate-500 mt-0.5">{l.browser} — {l.os}</span>
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                              l.status === 'Success' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                            }`}>
                              {l.status === 'Success' ? (
                                <>
                                  <CheckCircle className="w-3 h-3" />
                                  Authorized
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3" />
                                  Rejection
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3.5 font-mono text-slate-400 max-w-[150px] truncate" title={l.failureReason || 'None'}>
                            {l.failureReason ? (
                              <span className="text-amber-400/90 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {l.failureReason}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* VIEW: ATTACK LOGS */}
          {activeTab === 'attack_logs' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    Flagged Intrusions & Attack Log Records
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    System-compiled audits on hostile brute force, credential stuffing, rate-limit infractions, and blacklisted access attempts.
                  </p>
                </div>
                <div className="text-xs bg-slate-800 border border-slate-700 py-2 px-3 rounded-xl font-mono text-slate-300">
                  Flagged Threat Signatures: <strong className="text-white">{attackLogsList.length}</strong>
                </div>
              </div>

              {/* Filter Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                  <input 
                    type="text"
                    placeholder="Search by IP, username..."
                    value={attacksSearch}
                    onChange={(e) => setAttacksSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                  <select 
                    value={attacksTypeFilter}
                    onChange={(e) => setAttacksTypeFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 appearance-none"
                  >
                    <option value="">All Intrusion Vectors</option>
                    <option value="Brute Force">Brute Force</option>
                    <option value="Credential Stuffing">Credential Stuffing</option>
                    <option value="Rate Limit Violation">Rate Limit Violation</option>
                    <option value="Blocked IP Attempt">Blocked IP Attempt</option>
                  </select>
                </div>

                <button 
                  onClick={() => { setAttacksSearch(''); setAttacksTypeFilter(''); }}
                  className="bg-slate-800 hover:bg-slate-750 border border-slate-700 py-2 px-4 rounded-xl text-xs text-slate-300 transition duration-150 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              </div>

              {/* Attack Log List */}
              <div className="mt-6 space-y-4">
                {filteredAttackLogs.length === 0 ? (
                  <p className="text-center py-12 text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">No intrusion records match the selected parameter parameters.</p>
                ) : (
                  filteredAttackLogs.map(a => (
                    <div 
                      key={a.id} 
                      className={`p-4 rounded-xl border bg-slate-850/40 relative overflow-hidden flex flex-col md:flex-row justify-between gap-4 ${
                        a.severity === 'High' ? 'border-red-500/25 border-l-4 border-l-red-500' : a.severity === 'Medium' ? 'border-yellow-500/25 border-l-4 border-l-yellow-500' : 'border-slate-850 border-l-4 border-l-slate-400'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-lg shrink-0 ${
                          a.severity === 'High' ? 'bg-red-500/10 text-red-400' : a.severity === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-slate-700/30 text-slate-400'
                        }`}>
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">{a.type}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                              a.severity === 'High' ? 'bg-red-500/15 text-red-400' : a.severity === 'Medium' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {a.severity} Severity
                            </span>
                          </div>
                          <p className="text-xs text-slate-200 mt-2 font-sans leading-relaxed">{a.details}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-[10px] text-slate-500 font-mono">
                            <span>Host IP: <strong className="text-slate-350">{a.ipAddress}</strong></span>
                            <span>•</span>
                            <span>Target ID: <strong className="text-slate-350">{a.username || 'System API Gate'}</strong></span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col justify-between items-end shrink-0 text-right mt-2 md:mt-0">
                        <span className="text-[10px] text-slate-500 font-mono">{new Date(a.timestamp).toLocaleString()}</span>
                        <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono mt-2">ID: {a.id}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}


          {/* VIEW: BLOCKED IPS */}
          {activeTab === 'blocked_ips' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left Column (1/3 size): Manual Block Form */}
              <div className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-4 border-b border-slate-800">
                  <Sliders className="w-4.5 h-4.5 text-emerald-400" />
                  Manually Impose IP Ban
                </h3>
                
                <form onSubmit={handleManualBlock} className="space-y-4 mt-5">
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1" htmlFor="manual-ip">IP Address</label>
                    <input 
                      id="manual-ip"
                      type="text"
                      placeholder="e.g. 192.168.1.1"
                      value={manualIpAddress}
                      onChange={(e) => setManualIpAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1" htmlFor="block-reason">Block Reason</label>
                    <input 
                      id="block-reason"
                      type="text"
                      placeholder="Security breach reason"
                      value={manualIpReason}
                      onChange={(e) => setManualIpReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1" htmlFor="block-duration">Ban Duration</label>
                    <select 
                      id="block-duration"
                      value={manualIpDuration}
                      onChange={(e) => setManualIpDuration(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="60">1 Minute (Test Mode)</option>
                      <option value="300">5 Minutes</option>
                      <option value="1800">30 Minutes</option>
                      <option value="86400">24 Hours</option>
                      <option value="31536000">Permanent Ban</option>
                    </select>
                  </div>

                  {ipFormError && <p className="text-[11px] text-red-400 font-medium">{ipFormError}</p>}
                  {ipFormSuccess && <p className="text-[11px] text-emerald-400 font-medium">{ipFormSuccess}</p>}

                  <button 
                    id="ban-btn"
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-2 rounded-xl text-xs shadow-md transition duration-150 flex items-center justify-center gap-1.5"
                  >
                    <Power className="w-3.5 h-3.5" />
                    Impose IP Ban
                  </button>
                </form>
              </div>

              {/* Right Column (2/3 size): Banned IPs List */}
              <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Globe className="w-5 h-5 text-red-400 animate-pulse" />
                      Active IP Firewall Blocklist
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Systems currently rejected access at the application layer automatically.
                    </p>
                  </div>
                  <div className="text-xs bg-slate-800 border border-slate-700 py-1.5 px-2.5 rounded-lg text-slate-300 font-mono">
                    Banned Systems Count: <strong className="text-white">{blockedIPsList.filter(b => isIPCurrentlyBanned(b.blockedUntil, b.status)).length}</strong>
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                        <th className="pb-2.5">Banned Host IP</th>
                        <th className="pb-2.5">Isolated On</th>
                        <th className="pb-2.5">Locked Out Until</th>
                        <th className="pb-2.5">Banishment Reason</th>
                        <th className="pb-2.5">Status Code</th>
                        <th className="pb-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                      {blockedIPsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-500 font-mono">No host IP has been ban-locked.</td>
                        </tr>
                      ) : (
                        blockedIPsList.map(b => {
                          const active = isIPCurrentlyBanned(b.blockedUntil, b.status);
                          return (
                            <tr key={b.id} className="hover:bg-slate-850/20 transition">
                              <td className="py-3.5 font-bold font-mono text-white">{b.ipAddress}</td>
                              <td className="py-3.5 font-mono text-slate-400">{new Date(b.blockedAt).toLocaleDateString()}</td>
                              <td className="py-3.5 font-mono text-slate-400 max-w-[120px] truncate" title={new Date(b.blockedUntil).toLocaleString()}>
                                {active ? new Date(b.blockedUntil).toLocaleTimeString() : 'Expired'}
                              </td>
                              <td className="py-3.5 font-mono text-slate-300 max-w-[150px] truncate" title={b.reason}>{b.reason}</td>
                              <td className="py-3.5">
                                <span className={`inline-flex px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                                  active ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-500'
                                }`}>
                                  {active ? 'Banned' : 'Released'}
                                </span>
                              </td>
                              <td className="py-3.5 text-right">
                                {active && (
                                  <button 
                                    onClick={() => handleUnblockIp(b.ipAddress)}
                                    className="py-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-semibold border border-emerald-500/20 transition duration-150"
                                  >
                                    Lift Ban
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}


          {/* VIEW: USER MANAGER */}
          {activeTab === 'user_manager' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Register Operator Form */}
              <div className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-4 border-b border-slate-800">
                  <UserCheck className="w-4.5 h-4.5 text-emerald-400" />
                  Register Security Operator
                </h3>

                <form onSubmit={handleAddUser} className="space-y-4 mt-5">
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1" htmlFor="reg-username">Username Handle</label>
                    <input 
                      id="reg-username"
                      type="text"
                      placeholder="e.g. analyst_sarah"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1" htmlFor="reg-email">Operator Email Address</label>
                    <input 
                      id="reg-email"
                      type="email"
                      placeholder="sarah@mufasa-suite.org"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1" htmlFor="reg-role">Access Authorization Level</label>
                    <select 
                      id="reg-role"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="User">User (Standard Access)</option>
                      <option value="Administrator">Administrator (Control Keys)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1" htmlFor="reg-password">System Passcode / Password</label>
                    <div className="relative">
                      <input 
                        id="reg-password"
                        type={showRegPassword ? "text" : "password"}
                        placeholder="Enter a custom password (or empty for 'user123')"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-3 pr-10 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                        title={showRegPassword ? "Hide passcode" : "Show passcode"}
                      >
                        {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {userFormError && <p className="text-[11px] text-red-400 font-medium">{userFormError}</p>}
                  {userFormSuccess && <p className="text-[11px] text-emerald-400 font-medium">{userFormSuccess}</p>}

                  <button 
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-xl text-xs shadow-md transition duration-150"
                  >
                    Authorize Security Operator
                  </button>
                </form>
              </div>

              {/* Operators list */}
              <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white pb-4 border-b border-slate-800">
                  Registered Systems Operators & Identities
                </h3>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                        <th className="pb-2.5">User Identity</th>
                        <th className="pb-2.5">Email Address</th>
                        <th className="pb-2.5">Role</th>
                        <th className="pb-2.5">Passcode</th>
                        <th className="pb-2.5">Last Login (UTC)</th>
                        <th className="pb-2.5">Identity Status</th>
                        <th className="pb-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                      {usersList.map(u => (
                        <tr key={u.id} className="hover:bg-slate-850/20 transition">
                          <td className="py-3.5 font-bold text-white">{u.username}</td>
                          <td className="py-3.5 text-slate-400">{u.email}</td>
                          <td className="py-3.5">
                            <span className={`inline-flex px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                              u.role === 'Administrator' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 font-mono text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <span className="min-w-[65px] inline-block font-medium">
                                {visiblePasswords[u.id] 
                                  ? (u.rawPassword || (u.password && !u.password.startsWith('$2') ? u.password : (u.username === 'admin' ? 'admin123' : u.username === 'analyst_sarah' ? 'sarah123' : u.username === 'john_developer' ? 'user123' : u.username === 'mary_accountant' ? 'user123' : 'user123'))) 
                                  : '••••••••'}
                              </span>
                              <button 
                                onClick={() => setVisiblePasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                                className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                                title={visiblePasswords[u.id] ? "Hide passcode" : "Reveal passcode"}
                              >
                                {visiblePasswords[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 font-mono text-slate-400">
                            {u.lastLogin ? new Date(u.lastLogin).toLocaleTimeString() : 'Never logged'}
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-flex px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                              u.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right space-x-1.5">
                            {u.username !== 'admin' && (
                              <button 
                                onClick={() => handleToggleUserStatus(u.id)}
                                className={`py-1 px-2 rounded text-[10px] font-semibold border transition ${
                                  u.status === 'Active' ? 'bg-red-500/5 hover:bg-red-500/15 border-red-500/20 text-red-400' : 'bg-emerald-500/5 hover:bg-emerald-500/15 border-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {u.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                              </button>
                            )}
                            <button 
                              onClick={() => handleResetPassword(u.id)}
                              className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold border border-slate-700 transition"
                            >
                              Change Password
                            </button>
                            {u.username !== 'admin' && (
                              <button 
                                onClick={() => setDeleteConfirmUserId(u.id)}
                                className="py-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-[10px] font-semibold border border-rose-500/20 transition inline-flex items-center gap-1"
                                title="Delete Operator Identity"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}


          {/* VIEW: REPORTS */}
          {activeTab === 'reports' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Compiler Config form */}
              <div className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-4 border-b border-slate-800">
                  <Calendar className="w-4.5 h-4.5 text-emerald-400" />
                  Security Reports Compiler
                </h3>

                <form onSubmit={handleGenerateReport} className="space-y-4 mt-5">
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1" htmlFor="rep-period">Report Auditing Interval</label>
                    <select 
                      id="rep-period"
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Daily">Daily Incident Summary (Last 24 Hours)</option>
                      <option value="Weekly">Weekly System Performance Certificate (Last 7 Days)</option>
                      <option value="Monthly">Monthly General Security Posture Audit (Last 30 Days)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1" htmlFor="rep-notes">Administrator Audit Notes</label>
                    <textarea 
                      id="rep-notes"
                      placeholder="Add specific observations..."
                      value={reportNotes}
                      onChange={(e) => setReportNotes(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-xl text-xs shadow-md transition duration-150 flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Compile Audit Report
                  </button>
                </form>
              </div>

              {/* List of compiled reports */}
              <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white pb-4 border-b border-slate-800">
                  Compiled Security Performance Audits
                </h3>

                <div className="mt-6 space-y-4">
                  {reportsList.length === 0 ? (
                    <p className="text-center py-12 text-slate-500 font-mono text-xs">No compiled security audits on system disk.</p>
                  ) : (
                    reportsList.map(rep => (
                      <div key={rep.id} className="p-4 rounded-xl border border-slate-800 bg-slate-850/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-lg shrink-0">
                            <FileSpreadsheet className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block uppercase tracking-wide">{rep.type} Security Management Report</span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Generated: {new Date(rep.generatedAt).toLocaleString()} • ID: {rep.id}</span>
                            <p className="text-[11px] text-slate-300 mt-2 italic font-sans">"{rep.notes}"</p>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 mt-3 text-[10px] text-slate-400 font-mono bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                              <span>Score: <strong className="text-white">{rep.data.securityScore}/100</strong></span>
                              <span>Threat: <strong className="text-white">{rep.data.threatLevel}</strong></span>
                              <span>Logins (Ok): <strong className="text-white">{rep.data.successfulLogins}</strong></span>
                              <span>Logins (Fail): <strong className="text-white">{rep.data.failedLogins}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-row md:flex-col gap-2 shrink-0 self-end md:self-center">
                          {/* Printable report certificate look on screen trigger */}
                          <button 
                            type="button"
                            onClick={() => setSelectedReport(rep)}
                            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold border border-slate-700 transition"
                          >
                            View Audit Certificate
                          </button>
                          
                          {/* Download as CSV */}
                          <a 
                            href={`/api/reports/${rep.id}/download-csv`}
                            className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download CSV
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* REPORT DIALOG DETAIL: Styled printable security certificate */}
              <AnimatePresence>
                {selectedReport && (
                  <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto shadow-2xl relative"
                    >
                      {/* Close cross */}
                      <button 
                        onClick={() => setSelectedReport(null)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white"
                      >
                        <XCircle className="w-6 h-6" />
                      </button>

                      {/* Certificate styled printable layout */}
                      <div className="border-4 border-double border-emerald-500/30 p-6 bg-slate-950 rounded-xl font-serif text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                        
                        {/* Title academic header */}
                        <div className="flex flex-col items-center">
                          <Shield className="w-12 h-12 text-emerald-400 mb-2 animate-pulse" />
                          <h2 className="text-xl font-display font-bold tracking-widest text-white uppercase">MUFASA API SECURITY SUITE</h2>
                          <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase block mt-1">Audit Verification & Performance Certificate</span>
                        </div>

                        <div className="border-b border-slate-800 my-6" />

                        <p className="text-xs text-slate-300 italic max-w-md mx-auto leading-relaxed">
                          This document certifies that the security auditing system analyzed telemetry activity over the period from <strong className="text-white">{new Date(selectedReport.rangeStart).toLocaleDateString()}</strong> to <strong className="text-white">{new Date(selectedReport.rangeEnd).toLocaleDateString()}</strong>.
                        </p>

                        {/* Certificate Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 my-8 font-sans">
                          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-mono">Dynamic Security Score</span>
                            <span className="text-3xl font-bold font-display text-emerald-400 block mt-1">{selectedReport.data.securityScore} <span className="text-xs text-slate-500">/ 100</span></span>
                          </div>
                          
                          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-mono">System Threat Level</span>
                            <span className={`text-xl font-bold font-display block mt-2 uppercase ${
                              selectedReport.data.threatLevel === 'High' ? 'text-red-400' : selectedReport.data.threatLevel === 'Medium' ? 'text-yellow-400' : 'text-emerald-400'
                            }`}>{selectedReport.data.threatLevel}</span>
                          </div>
                        </div>

                        {/* Detailed numbers */}
                        <div className="text-left font-sans text-xs space-y-2.5 max-w-sm mx-auto bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
                          <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-400">
                            <span>Successful Gate Authorizations</span>
                            <strong className="text-white">{selectedReport.data.successfulLogins}</strong>
                          </div>
                          <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-400">
                            <span>Banned malicious login attempts</span>
                            <strong className="text-white">{selectedReport.data.failedLogins}</strong>
                          </div>
                          <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-400">
                            <span>Banned threat IP nodes</span>
                            <strong className="text-white">{selectedReport.data.blockedIPs}</strong>
                          </div>
                          <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-400">
                            <span>Most targeted user coordinate</span>
                            <strong className="text-white">{selectedReport.data.mostTargetedUser}</strong>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Most active scanner IP</span>
                            <strong className="text-white font-mono">{selectedReport.data.mostActiveIP}</strong>
                          </div>
                        </div>

                        <div className="border-b border-slate-800 my-6" />

                        {/* Signature block */}
                        <div className="flex justify-between items-center px-4 font-sans text-[10px] text-slate-500">
                          <div className="text-left">
                            <span>Security Auditor Signature</span>
                            <span className="block mt-4 text-slate-300 font-mono">/s/ MUFASA_DAEMON</span>
                          </div>
                          <div className="text-right">
                            <span>Date Verified</span>
                            <span className="block mt-4 text-slate-300 font-mono">{new Date(selectedReport.generatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 text-center">
                        <button 
                          onClick={() => window.print()}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-6 rounded-xl text-xs shadow-md transition duration-150 inline-flex items-center gap-1.5"
                        >
                          <FileText className="w-4 h-4" />
                          Execute System Print (Ctrl+P)
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* CUSTOM PASSWORD RESET MODAL WAS MOVED OUT OF THE REPORTS VIEW TO THE GLOBAL SCOPE */}
            </div>
          )}





          {/* VIEW: CONFIGURATION SETTINGS */}
          {activeTab === 'settings' && settings && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="pb-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-400" />
                  Suite Defense Configurations
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust active thresholds for brute force recognition, IP ban periods, and rate-limiting rules.
                </p>
              </div>

              {/* Form parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                {/* Left Form */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-widest pb-1 border-b border-slate-850">Login Attack Mitigations</h4>
                  
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="set-bf-threshold">Failed Login Threshold</label>
                    <input 
                      id="set-bf-threshold"
                      type="number"
                      value={settings.failedLoginThreshold}
                      onChange={(e) => setSettings({ ...settings, failedLoginThreshold: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Maximum failed attempts permitted in 60s before automated IP lockout.</span>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="set-block-duration">Ban Period (Seconds)</label>
                    <input 
                      id="set-block-duration"
                      type="number"
                      value={settings.ipBlockingDuration}
                      onChange={(e) => setSettings({ ...settings, ipBlockingDuration: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Period a detected attacker IP address is blocklisted in seconds.</span>
                  </div>
                </div>

                {/* Right Form */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-widest pb-1 border-b border-slate-850">Rate Limiter & Administration</h4>

                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="set-rl-threshold">Rate Limiter Gate (Requests/Minute)</label>
                    <input 
                      id="set-rl-threshold"
                      type="number"
                      value={settings.rateLimitThreshold}
                      onChange={(e) => setSettings({ ...settings, rateLimitThreshold: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Maximum request counts permitted from a single connection per minute.</span>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="set-alert-email">Incident Administrator Email</label>
                    <input 
                      id="set-alert-email"
                      type="email"
                      value={settings.alertEmail}
                      onChange={(e) => setSettings({ ...settings, alertEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Email address to receive alert notifications.</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 mt-8 pt-5 flex justify-end">
                <button 
                  onClick={() => handleUpdateSettings(settings)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-6 rounded-xl text-xs shadow-md transition duration-150"
                >
                  Apply Settings
                </button>
              </div>
            </div>
          )}


          {/* VIEW: ABOUT (COMPARISON & GUIDE) */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              {/* Central Information Cards */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2 pb-4 border-b border-slate-800">
                  <HelpCircle className="w-5 h-5 text-emerald-400" />
                  Academic Background & Architectural Comparison
                </h3>
                
                <div className="mt-5 space-y-4 text-xs text-slate-300 leading-relaxed">
                  <p>
                    The academic project titled <strong>"Design and Implementation of a Web-Based Security Management System for Detecting and Monitoring Fraudulent Login Attempts"</strong> addresses a critical vulnerability space in web engineering: login gates. While most standard WAF systems look at bulk server bandwidth, <strong>MUFASA API Security Suite</strong> applies dedicated application-layer scrutiny specifically to credentials submission routes.
                  </p>
                  <p>
                    By coupling threat intelligence directly into the application gates, MUFASA reduces database latency and handles automatic lockout protocols in-memory before severe brute force loads crash system infrastructure.
                  </p>
                </div>

                {/* Grid Comparison Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-850">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-emerald-400 block font-mono text-xs uppercase tracking-wide">FAIL2BAN Comparison</span>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                      Instead of reading heavy log lines asynchronously via cron, MUFASA blocks malicious brute force requests immediately in the request pipeline.
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-emerald-400 block font-mono text-xs uppercase tracking-wide">FLASK-LIMITER Comparison</span>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                      Rather than using rigid hardcoded configuration code blocks, MUFASA exposes a live web administration suite to adjust request limits in real-time.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-emerald-400 block font-mono text-xs uppercase tracking-wide">MODSECURITY Comparison</span>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                      Eliminates complex, arcane regex configuration. Translates alerts into human-digestible visual dashboards, graphs, and exportable CSV reports.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-emerald-400 block font-mono text-xs uppercase tracking-wide">OWASP ZAP Comparison</span>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                      While scan-testers identify leaks, MUFASA is an active defense suit preventing dictionary attacks and enforcing automated credential limits.
                    </p>
                  </div>
                </div>
              </div>

              {/* Security features list */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white mb-4">Core Implemented Security Gateways</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/40 border border-slate-850">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <strong className="text-white block">Automated Brute Force Sentry</strong>
                      Blocks target host IPs automatically after five failed tries.
                    </div>
                  </li>
                  
                  <li className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/40 border border-slate-850">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <strong className="text-white block">Credential Stuffing Guard</strong>
                      Heuristically monitors multiple distinct username attempts from identical connections.
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/40 border border-slate-850">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <strong className="text-white block">Dynamic API Rate Limiter</strong>
                      Protects gates against high-frequency automated bots.
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/40 border border-slate-850">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <strong className="text-white block">Audit Report compiler</strong>
                      Generates authentic, printable verification certificates and Excel-ready CSV sheets.
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* GLOBAL CUSTOM PASSWORD RESET MODAL */}
        <AnimatePresence>
          {resetModalUserId !== null && (() => {
            const targetUser = usersList.find(u => u.id === resetModalUserId);
            if (!targetUser) return null;
            return (
              <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative"
                >
                  <button 
                    onClick={() => setResetModalUserId(null)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                    type="button"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>

                  <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                    <Key className="w-4 h-4 text-emerald-400" />
                    Set Operator Passcode
                  </h3>

                  <p className="text-xs text-slate-400 mt-3">
                    You are setting a custom passcode/password for operator <strong className="text-white">@{targetUser.username}</strong>.
                  </p>

                  <form onSubmit={handleSubmitResetPassword} className="space-y-4 mt-4">
                    <div>
                      <label className="block text-slate-400 text-[11px] font-medium mb-1" htmlFor="modal-new-password">New Passcode</label>
                      <div className="relative">
                        <input 
                          id="modal-new-password"
                          type={showModalPassword ? "text" : "password"}
                          placeholder="Enter new desired passcode"
                          value={resetModalPassword}
                          onChange={(e) => setResetModalPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-3 pr-10 text-xs text-white focus:outline-none focus:border-emerald-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowModalPassword(!showModalPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                          title={showModalPassword ? "Hide passcode" : "Show passcode"}
                        >
                          {showModalPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {resetModalError && <p className="text-[11px] text-red-400 font-medium">{resetModalError}</p>}
                    {resetModalSuccess && <p className="text-[11px] text-emerald-400 font-medium">{resetModalSuccess}</p>}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setResetModalUserId(null)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 rounded-xl text-xs transition"
                      >
                        Close
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-xl text-xs shadow-md transition"
                      >
                        Save Passcode
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>

        {/* GLOBAL CUSTOM DELETE CONFIRMATION MODAL */}
        <AnimatePresence>
          {deleteConfirmUserId !== null && (() => {
            const targetUser = usersList.find(u => u.id === deleteConfirmUserId);
            if (!targetUser) return null;
            return (
              <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-slate-900 border border-red-900/30 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative"
                >
                  <button 
                    onClick={() => setDeleteConfirmUserId(null)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                    type="button"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>

                  <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2 pb-3 border-b border-slate-800">
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    Delete Identity Permanent
                  </h3>

                  <p className="text-xs text-slate-300 mt-4 leading-relaxed">
                    Are you absolutely sure you want to permanently delete the systems operator identity <strong className="text-white">@{targetUser.username}</strong> (<span className="text-slate-400">{targetUser.email}</span>)?
                  </p>

                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 mt-4 text-[11px] text-red-400">
                    <strong>Critical Warning:</strong> This operation cannot be undone. All logs and session attributes linked to this identity will remain, but the active operator credentials will be destroyed.
                  </div>

                  <div className="flex gap-3 pt-5">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmUserId(null)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 rounded-xl text-xs transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(targetUser.id)}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-medium py-2 rounded-xl text-xs shadow-md transition"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>


      </main>
    </div>
  );
}
