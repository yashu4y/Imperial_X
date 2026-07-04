/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Image as ImageIcon, Sparkles, User, Bot, Loader2, Trash2, History, X, RefreshCw, Edit3, Mic, MicOff, Plus, Upload, HardDrive, Image as PhotoIcon, Menu, Folder, Gem, MessageSquare, CreditCard, Users, CheckCircle2, Gift, ExternalLink, Copy, Wallet, Bitcoin, ShieldCheck, ArrowLeft, QrCode, LogOut, ShieldAlert, Volume2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatWithGemini, generateImage } from './src/services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ImageEditor from './src/components/ImageEditor';
import SubscriptionModal from './src/components/SubscriptionModal';
import AuthScreen from './src/components/AuthScreen';
import AdminPanel from './src/components/AdminPanel';
import { Message, ImageHistoryItem, User as AppUser, PlanType, SystemConfig } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editingImage, setEditingImage] = useState<{ id: string; url: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [input, setInput] = useState('');
  const recognitionRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'chat' | 'image'>('chat');
  const [showAddFiles, setShowAddFiles] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('kairo_current_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  const [viewingAdminPanel, setViewingAdminPanel] = useState(false);

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

  const [userPlan, setUserPlan] = useState<'free' | 'weekly_pro' | 'monthly_pro' | 'yearly_pro'>(() => {
    const savedUser = localStorage.getItem('kairo_current_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        return u.userPlan || 'free';
      } catch (e) {}
    }
    return 'free';
  });

  const [messagesUsed, setMessagesUsed] = useState<number>(() => {
    const savedUser = localStorage.getItem('kairo_current_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        return u.messagesUsed || 0;
      } catch (e) {}
    }
    return 0;
  });

  const [imagesUsed, setImagesUsed] = useState<number>(() => {
    const savedUser = localStorage.getItem('kairo_current_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        return u.imagesUsed || 0;
      } catch (e) {}
    }
    return 0;
  });

  const [paymentStep, setPaymentStep] = useState<'plan' | 'method' | 'usdt' | 'processing'>('plan');
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly' | 'yearly'>('yearly');
  const [showAffiliate, setShowAffiliate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const apiKeyMissing = !process.env.GEMINI_API_KEY;

  // Update dynamic configs on component mount / updates
  useEffect(() => {
    const interval = setInterval(() => {
      const savedConfig = localStorage.getItem('kairo_system_config');
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          setSystemConfig(parsed);
        } catch (e) {}
      }
    }, 1500); // Poll config updates every 1.5s to keep tabs in sync immediately
    return () => clearInterval(interval);
  }, []);

  const updateRegisteredUserInDb = (updatedUser: AppUser) => {
    const saved = localStorage.getItem('kairo_registered_users');
    if (saved) {
      try {
        const users: AppUser[] = JSON.parse(saved);
        const updatedList = users.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u);
        localStorage.setItem('kairo_registered_users', JSON.stringify(updatedList));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleUpgradePlan = (newPlan: 'free' | 'weekly_pro' | 'monthly_pro' | 'yearly_pro') => {
    setUserPlan(newPlan);
    setMessagesUsed(0);
    setImagesUsed(0);
    if (currentUser) {
      const updated = { ...currentUser, userPlan: newPlan, messagesUsed: 0, imagesUsed: 0 };
      setCurrentUser(updated);
      localStorage.setItem('kairo_current_user', JSON.stringify(updated));
      updateRegisteredUserInDb(updated);
    }
  };

  const handleLoginSuccess = (user: AppUser) => {
    localStorage.setItem('kairo_current_user', JSON.stringify(user));
    setCurrentUser(user);
    setUserPlan(user.userPlan);
    setMessagesUsed(user.messagesUsed);
    setImagesUsed(user.imagesUsed || 0);
    setError(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('kairo_current_user');
    setCurrentUser(null);
    setViewingAdminPanel(false);
    clearChat();
  };

  // Sync userPlan and messagesUsed to localStorage
  useEffect(() => {
    localStorage.setItem('kairo_user_plan', userPlan);
  }, [userPlan]);

  useEffect(() => {
    localStorage.setItem('kairo_messages_used', messagesUsed.toString());
  }, [messagesUsed]);

  useEffect(() => {
    localStorage.setItem('kairo_images_used', imagesUsed.toString());
  }, [imagesUsed]);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gemini_image_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          const cleaned = parsed.map((item: any, idx: number) => {
            const cleanId = item.id && !seen.has(item.id) 
              ? item.id 
              : `hist-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`;
            seen.add(cleanId);
            return {
              ...item,
              id: cleanId
            };
          });
          setImageHistory(cleaned);
        }
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('gemini_image_history', JSON.stringify(imageHistory));
  }, [imageHistory]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const trackMessageSent = () => {
    if (userPlan === 'free') {
      const newVal = messagesUsed + 1;
      setMessagesUsed(newVal);
      if (currentUser) {
        const updated = { ...currentUser, messagesUsed: newVal };
        setCurrentUser(updated);
        localStorage.setItem('kairo_current_user', JSON.stringify(updated));
        updateRegisteredUserInDb(updated);
      }
    }
  };

  const trackImageSent = () => {
    if (userPlan === 'free') {
      const newVal = (imagesUsed || 0) + 1;
      setImagesUsed(newVal);
      if (currentUser) {
        const updated = { ...currentUser, imagesUsed: newVal };
        setCurrentUser(updated);
        localStorage.setItem('kairo_current_user', JSON.stringify(updated));
        updateRegisteredUserInDb(updated);
      }
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const promptToUse = overrideInput || input;
    if (!promptToUse.trim() || isLoading) return;
    setError(null);

    if (systemConfig.maintenanceMode && (!currentUser || !currentUser.isAdmin)) {
      setError("Kairo AI is currently undergoing scheduled system updates. Please check back shortly.");
      return;
    }

    if (mode === 'image' && userPlan === 'free' && imagesUsed >= 5) {
      setShowSubscription(true);
      setError(`Free photo generation limit reached (${imagesUsed}/5 photos). Please upgrade to Kairo AI Pro to continue.`);
      return;
    }

    if (userPlan === 'free' && messagesUsed >= systemConfig.freeLimit) {
      setShowSubscription(true);
      setError(`Free message limit reached (${messagesUsed}/${systemConfig.freeLimit}). Please upgrade to Kairo AI Pro to continue.`);
      return;
    }

    const userMessage: Message = {
      id: `msg-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: promptToUse,
      type: 'text',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!overrideInput) setInput('');
    setIsLoading(true);

    try {
      if (mode === 'chat') {
        const response = await chatWithGemini(promptToUse);
        const assistantMessage: Message = {
          id: `msg-asst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: response.text,
          type: 'text',
          timestamp: new Date(),
          sources: response.sources
        };
        setMessages(prev => [...prev, assistantMessage]);
        trackMessageSent();
      } else {
        const imageUrl = await generateImage(promptToUse);
        const assistantMessage: Message = {
          id: `msg-asst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: imageUrl,
          type: 'image',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Add to history
        const historyItem: ImageHistoryItem = {
          id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          prompt: promptToUse,
          url: imageUrl,
          timestamp: Date.now(),
        };
        setImageHistory(prev => [historyItem, ...prev].slice(0, 50)); // Keep last 50
        trackImageSent();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      const errorMessage: Message = {
        id: `msg-err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: msg,
        type: 'text',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setImageHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveEditedImage = (editedUrl: string) => {
    if (!editingImage) return;

    // Update message in chat
    setMessages(prev => prev.map(msg => 
      msg.id === editingImage.id ? { ...msg, content: editedUrl } : msg
    ));

    // Update in history if exists
    setImageHistory(prev => prev.map(item => 
      item.url === editingImage.url ? { ...item, url: editedUrl } : item
    ));

    setEditingImage(null);
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (viewingAdminPanel && currentUser.isAdmin) {
    return (
      <AdminPanel 
        currentUser={currentUser} 
        onExit={() => setViewingAdminPanel(false)} 
        onUpdateCurrentUser={(user) => setCurrentUser(user)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans selection:bg-indigo-100">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {/* Subscription Modal */}
        {showSubscription && (
          <SubscriptionModal
            key="subscription-modal"
            isOpen={showSubscription}
            onClose={() => setShowSubscription(false)}
            userPlan={userPlan}
            onUpgrade={(newPlan) => {
              handleUpgradePlan(newPlan);
            }}
            onCancelSubscription={() => {
              handleUpgradePlan('free');
            }}
            messagesUsed={messagesUsed}
            onResetLimit={() => {
              setMessagesUsed(0);
              if (currentUser) {
                const updated = { ...currentUser, messagesUsed: 0 };
                setCurrentUser(updated);
                localStorage.setItem('kairo_current_user', JSON.stringify(updated));
                updateRegisteredUserInDb(updated);
              }
              alert(`Your free usage limit has been reset to 0/${systemConfig.freeLimit}!`);
            }}
          />
        )}

        {/* Affiliate Modal */}
        {showAffiliate && (
          <div key="affiliate-modal-outer" className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
              key="affiliate-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAffiliate(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              key="affiliate-content"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-12 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
                    <Gift className="text-amber-600 w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Refer & Earn</h2>
                    <p className="text-gray-500">Get 20% commission for every friend you refer.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Total Referrals', value: currentUser ? currentUser.referralsCount.toString() : '0', icon: <Users className="text-indigo-600" /> },
                    { label: 'Active Subs', value: currentUser ? Math.floor(currentUser.referralsCount * 0.3).toString() : '0', icon: <CheckCircle2 className="text-emerald-600" /> },
                    { label: 'Total Earned', value: currentUser ? `$${currentUser.earnings.toFixed(2)}` : '$0.00', icon: <CreditCard className="text-amber-600" /> },
                  ].map((stat) => (
                    <div key={stat.label} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        {stat.icon}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-bold text-gray-900">Your Referral Link (Code: {currentUser?.referralCode || 'N/A'})</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-600 font-mono truncate">
                      https://kairo.ai/ref/{currentUser?.referralCode || 'GUEST'}
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`https://kairo.ai/ref/${currentUser?.referralCode || 'GUEST'}`);
                        alert('Link copied to clipboard!');
                      }}
                      className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                      <Copy size={18} />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <ExternalLink size={16} />
                    <span>View Affiliate Dashboard</span>
                  </div>
                  <button className="text-indigo-600 font-bold text-sm hover:underline">
                    Terms & Conditions
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setShowAffiliate(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </motion.div>
          </div>
        )}

        {showSidebar && (
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSidebar(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
        )}
        {showSidebar && (
          <motion.aside
            key="sidebar-aside"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-white shadow-2xl z-50 flex flex-col border-r border-gray-100"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="text-white w-5 h-5" />
                </div>
                <h1 className="text-lg font-semibold tracking-tight">Kairo AI</h1>
              </div>
              <button 
                onClick={() => setShowSidebar(false)}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* New Chat Button */}
              <button
                onClick={() => {
                  clearChat();
                  setShowSidebar(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all uppercase tracking-wider"
              >
                <Plus size={18} />
                New Chat
              </button>

              {/* Navigation Sections */}
              <div className="space-y-1">
                <h3 className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Main</h3>
                {[
                  { label: 'My Stuff', icon: <Folder size={18} /> },
                  { label: 'Gems', icon: <Gem size={18} /> },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                  >
                    <span className="text-gray-400 group-hover:text-indigo-600">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Account & Growth */}
              <div className="space-y-1">
                <h3 className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Account & Growth</h3>
                <button
                  onClick={() => {
                    setShowSubscription(true);
                    setShowSidebar(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                >
                  <CreditCard size={18} className="text-gray-400" />
                  Subscription
                </button>
                <button
                  onClick={() => {
                    setShowAffiliate(true);
                    setShowSidebar(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                >
                  <Users size={18} className="text-gray-400" />
                  Refer & Earn
                </button>
              </div>

              {/* Chat History Section */}
              <div className="space-y-1">
                <h3 className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Chat History</h3>
                {messages.length === 0 ? (
                  <div className="px-4 py-8 text-center space-y-2">
                    <MessageSquare size={24} className="text-gray-200 mx-auto" />
                    <p className="text-xs text-gray-400">No recent chats</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl transition-all text-left">
                      <MessageSquare size={18} className="shrink-0" />
                      <span className="truncate">Current Session</span>
                    </button>
                    {/* Mock history items */}
                    {['Project Ideas', 'Code Review', 'Travel Plan'].map((item) => (
                      <button
                        key={item}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-all text-left"
                      >
                        <History size={18} className="text-gray-400 shrink-0" />
                        <span className="truncate">{item}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 space-y-3">
              {currentUser?.isAdmin && (
                <button
                  onClick={() => {
                    setViewingAdminPanel(true);
                    setShowSidebar(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all border border-indigo-100"
                >
                  <ShieldAlert size={14} className="text-indigo-500 animate-pulse" />
                  Admin Panel (Separately)
                </button>
              )}

              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                  {userPlan !== 'free' ? <Sparkles size={16} className="text-amber-500 fill-amber-500 animate-pulse" /> : <User size={18} className="text-gray-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{currentUser?.name || 'User Account'}</p>
                  <p className="text-[10px] text-indigo-600 font-semibold truncate capitalize">
                    {userPlan === 'free' 
                      ? `Free: ${messagesUsed}/${systemConfig.freeLimit} Chats | ${imagesUsed}/5 Photos` 
                      : `${userPlan.replace('_', ' ')} Premium`
                    }
                  </p>
                </div>
                <button 
                  onClick={handleLogout}
                  title="Log Out"
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 z-30 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSidebar(true)}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center relative">
              <Sparkles className="text-white w-5 h-5" />
              {userPlan !== 'free' && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white animate-pulse" />
              )}
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Kairo AI</h1>
            {userPlan !== 'free' ? (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase rounded-md border border-amber-200 shadow-sm animate-pulse flex items-center gap-0.5 select-none">
                👑 PRO
              </span>
            ) : (
              <button 
                onClick={() => setShowSubscription(true)}
                className="px-2 py-0.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[10px] font-bold rounded-md border border-indigo-200 shadow-sm transition-all flex items-center gap-1 cursor-pointer"
              >
                ⚡ UPGRADE
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center bg-gray-100 p-1 rounded-full">
          <button
            onClick={() => setMode('chat')}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              mode === 'chat' ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Chat
          </button>
          <button
            onClick={() => setMode('image')}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              mode === 'image' ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Image
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showHistory ? "bg-indigo-50 text-indigo-600" : "text-gray-400 hover:text-indigo-600"
            )}
            title="Image History"
          >
            <History size={20} />
          </button>
          <button 
            onClick={clearChat}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Clear Chat"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            key="history-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHistory(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
        )}
        {showHistory && (
          <motion.aside
            key="history-aside"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <History size={18} className="text-indigo-600" />
                Image History
              </h2>
              <button 
                onClick={() => setShowHistory(false)}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {imageHistory.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <ImageIcon size={32} className="text-gray-200 mx-auto" />
                  <p className="text-sm text-gray-400">No history yet</p>
                </div>
              ) : (
                imageHistory.map((item) => (
                  <div 
                    key={item.id}
                    className="group relative bg-gray-50 rounded-xl overflow-hidden border border-gray-100 hover:border-indigo-200 transition-all cursor-pointer"
                    onClick={() => {
                      setMode('image');
                      handleSend(item.prompt);
                      setShowHistory(false);
                    }}
                  >
                    <img 
                      src={item.url} 
                      alt={item.prompt}
                      className="w-full aspect-square object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="p-3 space-y-1">
                      <p className="text-xs font-medium text-gray-900 line-clamp-2">{item.prompt}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="p-1.5 bg-white/90 backdrop-blur shadow-sm rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        className="p-1.5 bg-white/90 backdrop-blur shadow-sm rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-24 pb-32 max-w-3xl mx-auto px-4">
        {systemConfig.systemNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3 text-xs text-indigo-700 font-medium shadow-sm"
          >
            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
              <Volume2 size={14} className="animate-bounce text-indigo-600" />
            </div>
            <div className="flex-1">
              {systemConfig.systemNotification}
            </div>
          </motion.div>
        )}
        <div 
          ref={scrollRef}
          className="space-y-8 min-h-[calc(100vh-16rem)]"
        >
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 space-y-4"
            >
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles className="text-indigo-600 w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">How can I help you today?</h2>
              <p className="text-gray-500 max-w-sm mx-auto">
                {mode === 'chat' 
                  ? "Ask me anything, from writing code to summarizing complex topics."
                  : "Describe an image you'd like me to generate for you."}
              </p>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {apiKeyMissing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3"
              >
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="text-amber-600 w-6 h-6" />
                </div>
                <h3 className="font-bold text-amber-900">Brain Activation Required</h3>
                <p className="text-sm text-amber-700">
                  To enable the AI brain, please add your <strong>GEMINI_API_KEY</strong> in the <strong>Secrets</strong> panel of the AI Studio settings.
                </p>
              </motion.div>
            )}

            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex gap-4",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  msg.role === 'user' ? "bg-indigo-100" : "bg-gray-100"
                )}>
                  {msg.role === 'user' ? <User size={18} className="text-indigo-600" /> : <Bot size={18} className="text-gray-600" />}
                </div>
                
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                  msg.role === 'user' 
                    ? "bg-indigo-600 text-white rounded-tr-none" 
                    : "bg-white border border-gray-100 rounded-tl-none"
                )}>
                  {msg.type === 'image' ? (
                    <div className="space-y-2 group/img relative">
                      <img 
                        src={msg.content} 
                        alt="AI Generated" 
                        className="rounded-lg w-full h-auto shadow-md"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingImage({ id: msg.id, url: msg.content })}
                          className="p-2 bg-white/90 backdrop-blur shadow-md rounded-xl text-indigo-600 hover:bg-white transition-all flex items-center gap-2 text-xs font-bold"
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>
                      </div>
                      <p className="text-xs opacity-70">Generated at {msg.timestamp.toLocaleTimeString()}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className={cn(
                        "prose prose-sm max-w-none",
                        msg.role === 'user' ? "prose-invert" : "prose-indigo"
                      )}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="pt-3 mt-3 border-t border-gray-100 space-y-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sources</p>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((source, i) => (
                              <a 
                                key={i}
                                href={source.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] bg-gray-50 hover:bg-gray-100 text-indigo-600 px-2 py-1 rounded-md border border-gray-200 transition-colors inline-flex items-center gap-1"
                              >
                                {source.title || 'Source'}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 items-center text-gray-400"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Thinking...</span>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-linear-to-t from-[#f8f9fa] via-[#f8f9fa] to-transparent pt-10 pb-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="relative group flex items-end gap-3">
            <div className="relative">
              <button
                onClick={() => setShowAddFiles(!showAddFiles)}
                className={cn(
                  "h-16 w-16 bg-white border border-gray-200 rounded-2xl shadow-lg text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center shrink-0",
                  showAddFiles && "text-indigo-600 border-indigo-200 ring-4 ring-indigo-500/5"
                )}
                title="Add Files"
              >
                <Plus size={24} className={cn("transition-transform duration-300", showAddFiles && "rotate-45")} />
              </button>

              <AnimatePresence>
                {showAddFiles && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-4 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 overflow-hidden"
                  >
                    {[
                      { label: 'UPLOAD FILES', icon: <Upload size={16} />, onClick: () => alert('Upload Files clicked') },
                      { label: 'ADD FROM DRIVE', icon: <HardDrive size={16} />, onClick: () => alert('Add from Drive clicked') },
                      { label: 'PHOTO', icon: <PhotoIcon size={16} />, onClick: () => alert('Photo clicked') },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          item.onClick();
                          setShowAddFiles(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all uppercase tracking-wider"
                      >
                        <span className="text-gray-400 group-hover:text-indigo-600">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  userPlan === 'free' && messagesUsed >= 5
                    ? "Free limit reached (5/5). Please upgrade to Pro or reset usage to continue!"
                    : mode === 'chat'
                      ? userPlan !== 'free'
                        ? "PRO • Ask Kairo AI anything..."
                        : `Ask Kairo AI anything... (${5 - messagesUsed} free queries left)`
                      : userPlan !== 'free'
                        ? "PRO • Describe an image to generate..."
                        : `Describe an image to generate... (${5 - messagesUsed} free queries left)`
                }
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 pr-24 shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none h-16 max-h-32"
                rows={1}
              />
              <div className="absolute right-3 bottom-3 flex gap-2">
                <button
                  onClick={toggleRecording}
                  className={cn(
                    "p-2 rounded-xl transition-all relative overflow-hidden",
                    isRecording 
                      ? "bg-red-50 text-red-600 ring-2 ring-red-500/20" 
                      : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                  )}
                  title={isRecording ? "Stop Recording" : "Voice Input"}
                >
                  {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                  {isRecording && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 bg-red-500/20 rounded-full"
                    />
                  )}
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    input.trim() && !isLoading 
                      ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700" 
                      : "bg-gray-100 text-gray-400"
                  )}
                >
                  {mode === 'chat' ? <Send size={20} /> : <ImageIcon size={20} />}
                </button>
              </div>
            </div>
          </div>

          {/* Tool Buttons */}
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {[
              { label: 'DOC WRITER', prompt: 'Write a professional document about ' },
              { label: 'DATA COMPOSER', prompt: 'Compose a structured data set for ' },
              { label: 'XSCRIBER', prompt: 'Transcribe and summarize the following: ' },
              { label: 'X INFLUENCER', prompt: 'Create a viral social media thread about ' },
              { label: 'WEB3 RESEARCHER', prompt: 'Research and analyze the latest Web3 trends for ' },
            ].map((tool) => (
              <button
                key={tool.label}
                onClick={() => {
                  setMode('chat');
                  setInput(tool.prompt);
                }}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm uppercase tracking-wider"
              >
                {tool.label}
              </button>
            ))}
          </div>

          <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-widest font-medium">
            Powered by Gemini 3 Flash & Nano Banana
          </p>
        </div>
      </div>
      <AnimatePresence>
        {editingImage && (
          <ImageEditor
            imageUrl={editingImage.url}
            onSave={handleSaveEditedImage}
            onCancel={() => setEditingImage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
