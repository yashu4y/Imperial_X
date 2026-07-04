import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Mail, Lock, User as UserIcon, ShieldAlert, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { User, PlanType } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load existing users or initialize with default admin and user
  const getUsers = (): User[] => {
    const saved = localStorage.getItem('kairo_registered_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse users', e);
      }
    }

    // Default users
    const defaults: User[] = [
      {
        id: 'user-admin',
        email: 'admin@kairo.ai',
        name: 'Kairo Admin',
        isAdmin: true,
        userPlan: 'yearly_pro',
        messagesUsed: 0,
        createdAt: new Date().toISOString(),
        referralCode: 'KAIROADMIN',
        referralsCount: 12,
        earnings: 140.0,
        password: 'admin'
      },
      {
        id: 'user-ykthakur',
        email: 'ykthakur18@gmail.com',
        name: 'Yash Thakur',
        isAdmin: true, // Let's also make user email admin as requested by guidelines
        userPlan: 'yearly_pro',
        messagesUsed: 2,
        createdAt: new Date().toISOString(),
        referralCode: 'YASH18',
        referralsCount: 3,
        earnings: 35.0,
        password: 'admin'
      },
      {
        id: 'user-demo',
        email: 'user@kairo.ai',
        name: 'Demo Explorer',
        isAdmin: false,
        userPlan: 'free',
        messagesUsed: 1,
        createdAt: new Date().toISOString(),
        referralCode: 'EXPLORE5',
        referralsCount: 0,
        earnings: 0.0,
        password: 'user'
      }
    ];
    localStorage.setItem('kairo_registered_users', JSON.stringify(defaults));
    return defaults;
  };

  const saveUsers = (users: User[]) => {
    localStorage.setItem('kairo_registered_users', JSON.stringify(users));
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    const currentUsers = getUsers();

    if (isLogin) {
      // Find user
      const foundUser = currentUsers.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (foundUser) {
        // Strip password for safety on active session
        const { password: _, ...safeUser } = foundUser;
        onLoginSuccess(safeUser as User);
      } else {
        setError('Invalid email or password. Try admin@kairo.ai / admin.');
      }
    } else {
      // Register
      const userExists = currentUsers.some((u) => u.email.toLowerCase() === email.toLowerCase());
      if (userExists) {
        setError('An account with this email already exists.');
        return;
      }

      // Generate random referral code
      const generatedRefCode = name.replace(/\s+/g, '').toUpperCase().slice(0, 5) + Math.floor(100 + Math.random() * 900);

      const newUser: User = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        email: email.toLowerCase(),
        name,
        isAdmin: email.toLowerCase() === 'ykthakur18@gmail.com' || email.toLowerCase() === 'admin@kairo.ai', // Yash and admin are default admins
        userPlan: 'free',
        messagesUsed: 0,
        createdAt: new Date().toISOString(),
        referralCode: generatedRefCode,
        referralsCount: 0,
        earnings: 0.0,
        password: password
      };

      // Handle referral code if entered
      if (referralCode.trim()) {
        const referrer = currentUsers.find(u => u.referralCode.toUpperCase() === referralCode.trim().toUpperCase());
        if (referrer) {
          newUser.referredBy = referrer.email;
          referrer.referralsCount += 1;
          // Give some reward to referrer (e.g. increase their earnings by $10 or upgrade plan, let's add $10)
          referrer.earnings += 10.0;
        } else {
          setError('Invalid referral code, but registering without it.');
        }
      }

      currentUsers.push(newUser);
      saveUsers(currentUsers);

      setSuccess('Account registered successfully! Logging you in...');
      setTimeout(() => {
        const { password: _, ...safeUser } = newUser;
        onLoginSuccess(safeUser as User);
      }, 1200);
    }
  };

  // Helper to quickly fill login info
  const fillCredentials = (type: 'admin' | 'user') => {
    if (type === 'admin') {
      setEmail('admin@kairo.ai');
      setPassword('admin');
      setIsLogin(true);
    } else {
      setEmail('user@kairo.ai');
      setPassword('user');
      setIsLogin(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-0 left-1/4 'w-125' 'h-125' bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 'w-125' 'h-125' bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-linear-to-tr from-indigo-500 to-purple-600 rounded-2xl shadow-xl shadow-indigo-500/30">
          <Sparkles className="text-white w-7 h-7" />
        </div>
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Kairo AI
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {isLogin ? 'Welcome back! Log in to access your digital brain' : 'Create your secure profile & start creating'}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <motion.div 
          layout
          className="bg-slate-900 border border-slate-800/80 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6"
        >
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-2xl text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-2xl text-sm">
              <Sparkles size={18} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                    <UserIcon size={18} />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-indigo-500 rounded-2xl text-white text-sm transition-colors outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-indigo-500 rounded-2xl text-white text-sm transition-colors outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-slate-950/50 border border-slate-800 focus:border-indigo-500 rounded-2xl text-white text-sm transition-colors outline-none placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Referral Code</label>
                  <span className="text-[10px] text-slate-500 font-medium">Optional</span>
                </div>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="e.g. KAIRO100"
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-indigo-500 rounded-2xl text-white text-sm uppercase tracking-wider transition-colors outline-none placeholder:text-slate-600"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-500/15 hover:shadow-indigo-500/25 hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              {isLogin ? 'Log In' : 'Create Account'}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="grow border-t border-slate-800/80"></div>
            <span className="shrink mx-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Demo Access</span>
            <div className="grow border-t border-slate-800/80"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fillCredentials('admin')}
              className="px-4 py-3 bg-slate-950/40 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-950/80 rounded-xl text-xs font-semibold text-slate-300 transition-all flex flex-col items-center gap-1 cursor-pointer"
            >
              <span className="text-indigo-400 flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider">
                <ShieldAlert size={12} />
                Admin Demo
              </span>
              <span>Quick Login</span>
            </button>
            <button
              onClick={() => fillCredentials('user')}
              className="px-4 py-3 bg-slate-950/40 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-950/80 rounded-xl text-xs font-semibold text-slate-300 transition-all flex flex-col items-center gap-1 cursor-pointer"
            >
              <span className="text-purple-400 flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider">
                Explorer Demo
              </span>
              <span>Quick Login</span>
            </button>
          </div>

          <div className="text-center text-sm pt-2">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccess(null);
              }}
              className="text-slate-400 hover:text-white font-medium transition-colors cursor-pointer"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
