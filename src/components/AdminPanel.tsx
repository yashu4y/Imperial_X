import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users as UsersIcon, ShieldAlert, CreditCard, RefreshCw, Trash2, 
  Search, ArrowLeft, Shield, Sparkles, UserPlus, Coins, MessageSquare, 
  Settings, CheckCircle2, AlertCircle, Volume2, Save, FileSpreadsheet
} from 'lucide-react';
import { User, PlanType, SystemConfig } from '../../types';

interface AdminPanelProps {
  currentUser: User;
  onExit: () => void;
  onUpdateCurrentUser: (user: User) => void;
}

export default function AdminPanel({ currentUser, onExit, onUpdateCurrentUser }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(() => {
    const saved = localStorage.getItem('kairo_system_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      freeLimit: 15,
      maintenanceMode: false,
      allowNewRegistrations: true,
      systemNotification: 'Welcome to Kairo AI! Enjoy high-speed image generation & unlimited chats.'
    };
  });

  const [notificationInput, setNotificationInput] = useState(systemConfig.systemNotification);
  const [freeLimitInput, setFreeLimitInput] = useState(systemConfig.freeLimit);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Sync config to localStorage
  useEffect(() => {
    localStorage.setItem('kairo_system_config', JSON.stringify(systemConfig));
  }, [systemConfig]);

  // Load registered users
  const loadUsers = () => {
    const saved = localStorage.getItem('kairo_registered_users');
    if (saved) {
      try {
        setUsers(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const saveUsersToStorage = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    localStorage.setItem('kairo_registered_users', JSON.stringify(updatedUsers));
    
    // If the admin user has changed, sync current user's state back
    const matchedSelf = updatedUsers.find(u => u.id === currentUser.id);
    if (matchedSelf) {
      onUpdateCurrentUser(matchedSelf);
    }
  };

  // Actions
  const handleUpdatePlan = (userId: string, newPlan: PlanType) => {
    const updated = users.map(user => {
      if (user.id === userId) {
        return { ...user, userPlan: newPlan, messagesUsed: newPlan !== 'free' ? 0 : user.messagesUsed };
      }
      return user;
    });
    saveUsersToStorage(updated);
  };

  const handleResetLimit = (userId: string) => {
    const updated = users.map(user => {
      if (user.id === userId) {
        return { ...user, messagesUsed: 0, imagesUsed: 0 };
      }
      return user;
    });
    saveUsersToStorage(updated);
  };

  const handleToggleAdmin = (userId: string) => {
    // Prevent self demotion
    if (userId === currentUser.id) {
      alert('You cannot revoke admin privileges from yourself!');
      return;
    }

    const updated = users.map(user => {
      if (user.id === userId) {
        return { ...user, isAdmin: !user.isAdmin };
      }
      return user;
    });
    saveUsersToStorage(updated);
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser.id) {
      alert('You cannot delete your own account!');
      return;
    }

    if (confirm('Are you sure you want to permanently delete this user account?')) {
      const updated = users.filter(user => user.id !== userId);
      saveUsersToStorage(updated);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSystemConfig({
      ...systemConfig,
      freeLimit: Number(freeLimitInput),
      systemNotification: notificationInput
    });
    setConfigSuccess(true);
    setTimeout(() => setConfigSuccess(false), 2000);
  };

  // Stats derivation
  const totalUsers = users.length;
  const proUsers = users.filter(u => u.userPlan !== 'free').length;
  const totalEarnings = users.reduce((sum, u) => sum + (u.earnings || 0), 0);
  const totalReferrals = users.reduce((sum, u) => sum + (u.referralsCount || 0), 0);
  const totalMessagesUsedByAll = users.reduce((sum, u) => sum + (u.messagesUsed || 0), 0);

  // Filter users
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.userPlan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.referredBy && user.referredBy.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Banner */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button 
            onClick={onExit}
            className="p-2 hover:bg-slate-800 rounded-xl transition-all flex items-center gap-2 text-slate-400 hover:text-white"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium hidden sm:inline">User Mode</span>
          </button>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-1.5">
                Admin Command Center
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  SYSTEM
                </span>
              </h1>
              <p className="text-[10px] text-slate-400">Logged in as {currentUser.name}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all text-slate-300 flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw size={14} />
            Refresh Data
          </button>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Users', val: totalUsers, desc: 'Registered IDs', icon: <UsersIcon className="text-blue-400" /> },
            { label: 'Premium Users', val: proUsers, desc: 'Active Upgrade Plans', icon: <CreditCard className="text-amber-400" /> },
            { label: 'Messages Sent', val: totalMessagesUsedByAll, desc: 'AI Engine Requests', icon: <MessageSquare className="text-indigo-400" /> },
            { label: 'Total Affiliates', val: totalReferrals, desc: 'Successful invites', icon: <UserPlus className="text-purple-400" /> },
            { label: 'Affiliate Payouts', val: `$${totalEarnings.toFixed(2)}`, desc: 'Referral commissions', icon: <Coins className="text-emerald-400" /> },
          ].map((stat, idx) => (
            <div key={idx} className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{stat.label}</span>
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
                  {stat.icon}
                </div>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white tracking-tight">{stat.val}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{stat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main User List - 2cols */}
          <div className="lg:col-span-2 bg-slate-950/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <UsersIcon size={18} className="text-indigo-400" />
                  User Account Matrix
                </h2>
                <p className="text-xs text-slate-400">View and manage registered user properties, subscription tiers and usage rates</p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Search user, email or plan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500 text-xs text-white rounded-xl outline-none w-full sm:w-60 transition-colors"
                />
              </div>
            </div>

            {/* Table wrapper */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">User Details</th>
                    <th className="px-4 py-3 text-center">Subscription Plan</th>
                    <th className="px-4 py-3 text-center">Usage Limit</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-500 text-xs">
                        No user match found. Try searching another string.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-900/30 transition-all">
                        {/* Name & Email */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              user.isAdmin 
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {user.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-white flex items-center gap-1">
                                {user.name}
                                {user.isAdmin && (
                                  <Shield size={12} className="text-indigo-400" />
                                )}
                              </p>
                              <p className="text-[10px] text-slate-400">{user.email}</p>
                              {user.referredBy && (
                                <p className="text-[9px] text-slate-500">Referred by: {user.referredBy}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Plan selection */}
                        <td className="px-4 py-3.5 text-center">
                          <select
                            value={user.userPlan}
                            onChange={(e) => handleUpdatePlan(user.id, e.target.value as PlanType)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border outline-none bg-slate-950 transition-colors ${
                              user.userPlan === 'free'
                                ? 'border-slate-800 text-slate-400'
                                : 'border-amber-500/30 text-amber-400 bg-amber-500/5'
                            }`}
                          >
                            <option value="free">Free Trial</option>
                            <option value="weekly_pro">Weekly Pro</option>
                            <option value="monthly_pro">Monthly Pro</option>
                            <option value="yearly_pro">Yearly Pro</option>
                          </select>
                        </td>

                        {/* Usage Limit */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="space-y-1.5">
                            <div>
                              <p className="text-[10px] text-slate-400 font-semibold uppercase">Chats</p>
                              <span className="font-mono text-[11px] text-slate-200">
                                {user.messagesUsed} / {user.userPlan === 'free' ? systemConfig.freeLimit : '∞'}
                              </span>
                              {user.userPlan === 'free' && (
                                <div className="w-16 h-1 bg-slate-800 rounded-full mx-auto overflow-hidden mt-0.5">
                                  <div 
                                    className={`h-full ${user.messagesUsed >= systemConfig.freeLimit ? 'bg-red-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${Math.min(100, (user.messagesUsed / systemConfig.freeLimit) * 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                            {user.userPlan === 'free' && (
                              <div>
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">Photos</p>
                                <span className="font-mono text-[11px] text-slate-200">
                                  {user.imagesUsed || 0} / 5
                                </span>
                                <div className="w-16 h-1 bg-slate-800 rounded-full mx-auto overflow-hidden mt-0.5">
                                  <div 
                                    className={`h-full ${(user.imagesUsed || 0) >= 5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min(100, ((user.imagesUsed || 0) / 5) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {user.userPlan === 'free' && (
                              <button
                                onClick={() => handleResetLimit(user.id)}
                                title="Reset Usage Limit"
                                className="p-1.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-indigo-400 rounded-lg transition-all cursor-pointer"
                              >
                                <RefreshCw size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleAdmin(user.id)}
                              title={user.isAdmin ? "Revoke Admin Role" : "Grant Admin Role"}
                              className={`p-1.5 border rounded-lg transition-all cursor-pointer ${
                                user.isAdmin
                                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20'
                                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                              }`}
                            >
                              <ShieldAlert size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              title="Delete Account"
                              className="p-1.5 bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:bg-red-500/10 text-red-400 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Configuration & Announcement Panel - 1col */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col space-y-5 justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Settings size={18} className="text-indigo-400" />
                  System Controller
                </h2>
                <p className="text-xs text-slate-400 font-medium">Broadcast announcements, tweak free limits, and toggle global configuration rules</p>
              </div>

              {configSuccess && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>Rules saved & system state updated successfully!</span>
                </div>
              )}

              <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
                {/* Free quota limit */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Free Quota Message Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={freeLimitInput}
                    onChange={(e) => setFreeLimitInput(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-white outline-none"
                  />
                  <p className="text-[10px] text-slate-500">Number of prompt inputs free tier users can process before subscription is mandatory.</p>
                </div>

                {/* System notification banner */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Dashboard System Notice</label>
                  <textarea
                    rows={4}
                    value={notificationInput}
                    onChange={(e) => setNotificationInput(e.target.value)}
                    placeholder="Enter message for the users banner..."
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-white outline-none resize-none"
                  />
                  <p className="text-[10px] text-slate-500">This banner will render dynamically across standard user chat headers.</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-850">
                  <div className="space-y-0.5">
                    <p className="font-bold text-white">Maintenance Flag</p>
                    <p className="text-[10px] text-slate-500">Place chat AI in offline/read-only mode</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemConfig.maintenanceMode}
                    onChange={(e) => setSystemConfig({ ...systemConfig, maintenanceMode: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-slate-800 focus:ring-indigo-500 focus:ring-2 bg-slate-900 rounded"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/10"
                >
                  <Save size={14} />
                  Save Changes
                </button>
              </form>
            </div>

            {/* Referral / Affiliate Quick summary */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800/80 space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Volume2 size={12} className="text-purple-400" />
                Affiliate Growth Rate
              </h4>
              <p className="text-xs text-slate-300">
                Out of <strong className="text-white">{totalUsers}</strong> total registered accounts, <strong className="text-purple-400">{totalReferrals}</strong> registrations were completed via partner referral codes.
              </p>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden mt-2 border border-slate-850">
                <div 
                  className="bg-purple-500 h-1.5" 
                  style={{ width: `${totalUsers > 0 ? (totalReferrals / totalUsers) * 100 : 0}%` }}
                />
              </div>
            </div>

          </div>

        </div>

        {/* Affiliate Lead List */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Coins size={18} className="text-emerald-400" />
              Affiliate Referrals Ledger
            </h2>
            <p className="text-xs text-slate-400">Track promoter codes, invite metrics and referral commissions earned through active registration drives</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Referrer User</th>
                  <th className="px-4 py-3 text-center">Referral Code</th>
                  <th className="px-4 py-3 text-center">Successful Invites</th>
                  <th className="px-4 py-3 text-right">Commissions Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {users.filter(u => u.referralsCount > 0 || u.earnings > 0).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-xs">
                      No active referrals logged yet in the system.
                    </td>
                  </tr>
                ) : (
                  users.filter(u => u.referralsCount > 0 || u.earnings > 0).map((user) => (
                    <tr key={user.id} className="hover:bg-slate-900/20 transition-all">
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{user.name}</div>
                        <div className="text-[10px] text-slate-400">{user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-purple-400">
                        {user.referralCode}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-white">
                        {user.referralsCount}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-bold font-mono">
                        ${user.earnings.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
