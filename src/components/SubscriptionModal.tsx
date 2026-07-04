import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ArrowLeft, CreditCard, ShieldCheck, QrCode, Copy, RefreshCw, 
  Loader2, CheckCircle2, Lock, AlertTriangle, Sparkles, Flame, Check, Coins 
} from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPlan: 'free' | 'weekly_pro' | 'monthly_pro' | 'yearly_pro';
  onUpgrade: (newPlan: 'weekly_pro' | 'monthly_pro' | 'yearly_pro') => void;
  onCancelSubscription: () => void;
  messagesUsed: number;
  onResetLimit: () => void;
}

type PaymentStep = 'plan' | 'method' | 'stripe_form' | 'razorpay_form' | 'usdt_form' | 'processing' | 'success' | 'manage';

export default function SubscriptionModal({
  isOpen,
  onClose,
  userPlan,
  onUpgrade,
  onCancelSubscription,
  messagesUsed,
  onResetLimit
}: SubscriptionModalProps) {
  // Navigation & Plan State
  const [step, setStep] = useState<PaymentStep>('plan');
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly' | 'yearly'>('yearly');
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'INR' | 'USDT'>('USD');
  
  // Stripe form fields
  const [stripeCard, setStripeCard] = useState('');
  const [stripeExpiry, setStripeExpiry] = useState('');
  const [stripeCvc, setStripeCvc] = useState('');
  const [stripeName, setStripeName] = useState('');
  const [stripeZip, setStripeZip] = useState('');
  const [stripeError, setStripeError] = useState('');

  // Razorpay form fields
  const [razorpayMethod, setRazorpayMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [razorpayUpiId, setRazorpayUpiId] = useState('');
  const [razorpayBank, setRazorpayBank] = useState('hdfc');
  const [razorpayCard, setRazorpayCard] = useState('');
  const [razorpayExpiry, setRazorpayExpiry] = useState('');
  const [razorpayCvv, setRazorpayCvv] = useState('');
  const [razorpayName, setRazorpayName] = useState('');
  const [showRazorpayQr, setShowRazorpayQr] = useState(false);
  const [razorpayError, setRazorpayError] = useState('');
  const [qrTimer, setQrTimer] = useState(180); // 3-minute countdown

  // USDT fields
  const [usdtNetwork, setUsdtNetwork] = useState<'trc20' | 'erc20'>('trc20');
  const [usdtTxHash, setUsdtTxHash] = useState('');
  const [usdtError, setUsdtError] = useState('');

  // Simulation State
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState<string[]>([]);
  const [currentMethod, setCurrentMethod] = useState<'stripe' | 'razorpay' | 'usdt'>('stripe');
  const [receiptDetails, setReceiptDetails] = useState<{
    orderId: string;
    amount: string;
    planLabel: string;
    methodLabel: string;
    date: string;
  } | null>(null);

  // Address Copy State
  const [copied, setCopied] = useState(false);

  // Set default view on open
  useEffect(() => {
    if (isOpen) {
      if (userPlan !== 'free') {
        setStep('manage');
      } else {
        setStep('plan');
      }
    }
  }, [isOpen, userPlan]);

  // QR Timer countdown
  useEffect(() => {
    let timer: any;
    if (showRazorpayQr && qrTimer > 0 && step === 'razorpay_form') {
      timer = setInterval(() => {
        setQrTimer(prev => prev - 1);
      }, 1000);
    } else if (qrTimer === 0) {
      setShowRazorpayQr(false);
      setQrTimer(180);
    }
    return () => clearInterval(timer);
  }, [showRazorpayQr, qrTimer, step]);

  if (!isOpen) return null;

  // Format Helper: Expire Date MM/YY
  const handleExpiryChange = (value: string, setter: (val: string) => void) => {
    const clean = value.replace(/\D/g, '').slice(0, 4);
    if (clean.length > 2) {
      setter(`${clean.slice(0, 2)}/${clean.slice(2, 4)}`);
    } else {
      setter(clean);
    }
  };

  // Format Helper: Card Number (spaces every 4 digits)
  const handleCardChange = (value: string, setter: (val: string) => void) => {
    const clean = value.replace(/\D/g, '').slice(0, 16);
    const parts = [];
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.slice(i, i + 4));
    }
    setter(parts.join(' '));
  };

  // Card brand detector
  const getCardBrand = (num: string) => {
    const clean = num.replace(/\D/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(clean)) return 'Mastercard';
    if (/^3[47]/.test(clean)) return 'Amex';
    if (/^6/.test(clean)) return 'Discover';
    return 'Credit Card';
  };

  // Copy USDT Address
  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pricing helper
  const getPlanPrice = (plan: 'weekly' | 'monthly' | 'yearly') => {
    switch (plan) {
      case 'weekly': return { 
        amount: '$5', 
        raw: 5, 
        amountInr: '₹415', 
        rawInr: 415,
        amountUsdt: '5 USDT', 
        rawUsdt: 5,
        period: 'week', 
        label: 'Weekly Pro Plan' 
      };
      case 'monthly': return { 
        amount: '$19', 
        raw: 19, 
        amountInr: '₹1,580', 
        rawInr: 1580,
        amountUsdt: '19 USDT', 
        rawUsdt: 19,
        period: 'month', 
        label: 'Monthly Pro Plan' 
      };
      case 'yearly': return { 
        amount: '$180', 
        raw: 180, 
        amountInr: '₹14,990', 
        rawInr: 14990,
        amountUsdt: '180 USDT', 
        rawUsdt: 180,
        period: 'year', 
        label: 'Yearly Pro Plan ($15/mo)' 
      };
    }
  };

  const renderCardPrice = (plan: 'weekly' | 'monthly' | 'yearly') => {
    const info = getPlanPrice(plan);
    if (displayCurrency === 'USD') {
      return (
        <div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold">{info.amount}</span>
            <span className="text-xs opacity-60">/{plan === 'yearly' ? 'month' : info.period}</span>
          </div>
          <p className="text-[10px] opacity-60 mt-0.5">
            ≈ {info.amountInr} | {info.amountUsdt}
          </p>
        </div>
      );
    } else if (displayCurrency === 'INR') {
      const displayAmount = plan === 'yearly' ? '₹1,250' : info.amountInr;
      return (
        <div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold">{displayAmount}</span>
            <span className="text-xs opacity-60">/{plan === 'yearly' ? 'month' : info.period}</span>
          </div>
          <p className="text-[10px] opacity-60 mt-0.5">
            ≈ {info.amount} | {info.amountUsdt}
          </p>
        </div>
      );
    } else {
      const displayAmount = plan === 'yearly' ? '15 USDT' : info.amountUsdt;
      return (
        <div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold">{displayAmount}</span>
            <span className="text-xs opacity-60">/{plan === 'yearly' ? 'month' : info.period}</span>
          </div>
          <p className="text-[10px] opacity-60 mt-0.5">
            ≈ {info.amount} | {info.amountInr}
          </p>
        </div>
      );
    }
  };

  const getBilledAnnuallyText = () => {
    const info = getPlanPrice('yearly');
    if (displayCurrency === 'USD') return `Billed as ${info.amount} annually`;
    if (displayCurrency === 'INR') return `Billed as ${info.amountInr} annually`;
    return `Billed as ${info.amountUsdt} annually`;
  };

  const planInfo = getPlanPrice(selectedPlan);

  // Trigger loading simulation
  const startSimulation = (method: 'stripe' | 'razorpay' | 'usdt', txIdSeed: string) => {
    setCurrentMethod(method);
    setStep('processing');
    setLoadingStep(0);
    
    let logs: string[] = [];
    if (method === 'stripe') {
      logs = [
        'Secure connection established with Stripe servers...',
        'Authorizing card transaction amount of ' + planInfo.amount + '...',
        'Confirming 3D-Secure credentials and banking handshake...',
        'Provisioning premium Kairo AI database entry...'
      ];
    } else if (method === 'razorpay') {
      logs = [
        'Connecting to Razorpay Indian gateway nodes...',
        'Awaiting authorization from banking network for ' + planInfo.amountInr + '...',
        'Verifying instant fund settlement status...',
        'Provisioning premium Kairo AI database entry...'
      ];
    } else {
      logs = [
        'Querying Tron/Ethereum decentralized block indexes for ' + planInfo.amountUsdt + '...',
        'Validating transaction hash ' + txIdSeed.slice(0, 8) + '... on blockchain...',
        'Confirmations block 1/3 (Validated)...',
        'Confirmations block 3/3 (Fully mature block mined)...',
        'Provisioning premium Kairo AI database entry...'
      ];
    }

    setLoadingLogs([]);
    
    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setLoadingLogs(prev => [...prev, logs[currentLogIndex]]);
        setLoadingStep(currentLogIndex + 1);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        // Completed
        const orderId = 'KAIRO_' + Math.floor(100000 + Math.random() * 900000);
        let chargedAmount = planInfo.amount;
        if (method === 'razorpay') {
          chargedAmount = planInfo.amountInr;
        } else if (method === 'usdt') {
          chargedAmount = planInfo.amountUsdt;
        }

        setReceiptDetails({
          orderId,
          amount: chargedAmount,
          planLabel: planInfo.label,
          methodLabel: method === 'stripe' ? 'Stripe (' + getCardBrand(stripeCard) + ')' : method === 'razorpay' ? 'Razorpay (' + (razorpayMethod === 'upi' ? 'UPI' : 'Card/Netbanking') + ')' : 'USDT (' + usdtNetwork.toUpperCase() + ' Network)',
          date: new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })
        });
        
        // Actually upgrade user state!
        onUpgrade(selectedPlan + '_pro' as any);
        setStep('success');
      }
    }, 1100);
  };

  const submitStripe = (e: React.FormEvent) => {
    e.preventDefault();
    setStripeError('');
    if (stripeCard.replace(/\s/g, '').length < 16) {
      setStripeError('Card number must be 16 digits.');
      return;
    }
    if (stripeExpiry.length < 5) {
      setStripeError('Enter expiration date (MM/YY).');
      return;
    }
    if (stripeCvc.length < 3) {
      setStripeError('CVC must be at least 3 digits.');
      return;
    }
    if (!stripeName.trim()) {
      setStripeError('Please enter the cardholder name.');
      return;
    }
    startSimulation('stripe', 'stripe_txn');
  };

  const submitRazorpay = (e: React.FormEvent) => {
    e.preventDefault();
    setRazorpayError('');
    
    if (razorpayMethod === 'upi') {
      if (!showRazorpayQr && (!razorpayUpiId.includes('@') || razorpayUpiId.length < 5)) {
        setRazorpayError('Please enter a valid UPI ID (e.g., user@upi).');
        return;
      }
    } else if (razorpayMethod === 'card') {
      if (razorpayCard.replace(/\s/g, '').length < 16) {
        setRazorpayError('Card number must be 16 digits.');
        return;
      }
      if (razorpayExpiry.length < 5) {
        setRazorpayError('Enter expiration date (MM/YY).');
        return;
      }
      if (razorpayCvv.length < 3) {
        setRazorpayError('CVV must be 3 digits.');
        return;
      }
      if (!razorpayName.trim()) {
        setRazorpayError('Cardholder name required.');
        return;
      }
    }
    
    startSimulation('razorpay', 'razorpay_txn');
  };

  const submitUsdt = (e: React.FormEvent) => {
    e.preventDefault();
    setUsdtError('');
    const cleanHash = usdtTxHash.trim();
    if (cleanHash.length < 16) {
      setUsdtError('Please paste a valid TxID / Transaction Hash (at least 16 hex chars).');
      return;
    }
    startSimulation('usdt', cleanHash);
  };

  const usdtAddress = usdtNetwork === 'trc20' 
    ? 'TX7a9bC2dE3fG4hI5jK6lM7nO8pQ9rS0tU' 
    : '0x9AbCdEf123456789aBcDeF123456789aBcDeF123';

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 overflow-y-auto">
      {/* Dark Overlay Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-110 max-h-[90vh] md:max-h-none overflow-y-auto md:overflow-visible"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-120"
        >
          <X size={20} />
        </button>

        {/* STEP 1: PLAN SELECTOR */}
        {step === 'plan' && (
          <>
            {/* Features Info column */}
            <div className="flex-1 p-6 md:p-10 space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">
                  <Sparkles size={13} className="animate-pulse" />
                  <span>Kairo AI Premium</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Upgrade to Pro</h2>
                <p className="text-sm text-gray-500">Unleash the supreme powers of Kairo AI with unrestricted query capabilities, grounding, and high fidelity image generators.</p>
              </div>

              {/* Feature Matrix side-by-side or simple rows */}
              <div className="space-y-4 border-t border-b border-gray-100 py-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">What's Included in Pro:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    'Priority Access to Gemini Pro 3',
                    'Grounding with Google Search',
                    'Unlimited Chats & Image Gens',
                    'Stripe & Razorpay Gateway Access',
                    'Dedicated Web3 Research Tools',
                    '24/7 Priority Live Support'
                  ].map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <div className="p-0.5 bg-indigo-50 text-indigo-600 rounded-full mt-0.5">
                        <Check size={12} className="stroke-3" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Developer Testing Section */}
              <div className="p-4 bg-amber-50/75 border border-amber-200/50 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-amber-600 animate-bounce" />
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Developer Sandbox</span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Your free limit is currently <strong>{messagesUsed}/5</strong>. After a simulated checkout, your plan upgrades instantly. You can always downgrade back to test again!
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button 
                    onClick={onResetLimit}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 text-[10px] font-bold text-amber-800 border border-amber-200 rounded-lg transition-all"
                  >
                    Reset Limit to 0/5
                  </button>
                </div>
              </div>
            </div>

            {/* Plans List Column */}
            <div className="w-full md:w-80 bg-slate-50 p-6 md:p-10 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100">
              {/* Currency Switcher */}
              <div className="mb-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 text-center md:text-left">
                  Billing Currency
                </label>
                <div className="flex bg-gray-200/60 p-1 rounded-xl w-full">
                  {(['USD', 'INR', 'USDT'] as const).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setDisplayCurrency(curr)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        displayCurrency === curr 
                          ? 'bg-white text-indigo-700 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {curr === 'USD' ? 'USD' : curr === 'INR' ? 'INR' : 'USDT'}
                    </button>
                  ))}
                </div>
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 text-center md:text-left">Select Your Plan</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setSelectedPlan('weekly')}
                  className={`w-full p-4 bg-white rounded-2xl border text-left transition-all relative ${
                    selectedPlan === 'weekly' 
                      ? 'border-indigo-600 ring-2 ring-indigo-500/10 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 shadow-sm'
                  }`}
                >
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Weekly Access</p>
                  {renderCardPrice('weekly')}
                </button>

                <button 
                  onClick={() => setSelectedPlan('monthly')}
                  className={`w-full p-4 bg-white rounded-2xl border text-left transition-all relative ${
                    selectedPlan === 'monthly' 
                      ? 'border-indigo-600 ring-2 ring-indigo-500/10 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 shadow-sm'
                  }`}
                >
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Monthly Membership</p>
                  {renderCardPrice('monthly')}
                </button>

                <button 
                  onClick={() => setSelectedPlan('yearly')}
                  className={`w-full p-4 rounded-2xl text-left transition-all relative overflow-hidden ${
                    selectedPlan === 'yearly' 
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-600' 
                      : 'bg-white border border-gray-200 hover:border-gray-300 text-gray-900 shadow-sm'
                  }`}
                >
                  <div className="absolute top-0 right-0 p-1.5">
                    <div className="bg-emerald-500 text-emerald-950 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Save 20%</div>
                  </div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedPlan === 'yearly' ? 'text-indigo-200' : 'text-indigo-600'}`}>Yearly Value</p>
                  {renderCardPrice('yearly')}
                  <p className={`text-[9px] mt-1 ${selectedPlan === 'yearly' ? 'text-indigo-100' : 'text-gray-400'}`}>{getBilledAnnuallyText()}</p>
                </button>
              </div>

              <div className="mt-6">
                <button 
                  onClick={() => setStep('method')}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Select Payment Method</span>
                  <ArrowLeft size={16} className="rotate-180" />
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-3">Cancel anytime. Instant plan activation.</p>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: PAYMENT METHOD SELECTION */}
        {step === 'method' && (
          <div className="flex-1 p-6 md:p-10 space-y-6">
            <div className="flex items-center gap-3.5 border-b border-gray-100 pb-4">
              <button 
                onClick={() => setStep('plan')}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-all"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Select Payment Method</h2>
                <p className="text-xs text-gray-500">Choose your preferred transaction medium for plan: <span className="font-semibold text-indigo-600">{planInfo.label}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
              {/* Stripe option */}
              <button
                onClick={() => setStep('stripe_form')}
                className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 hover:border-indigo-500 rounded-2xl shadow-sm hover:shadow-md transition-all text-center gap-3 cursor-pointer group"
              >
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Stripe Checkout</h4>
                  <p className="text-[10px] text-gray-400 mt-1">Cards (Visa, Mastercard, Amex)</p>
                </div>
              </button>

              {/* Razorpay option */}
              <button
                onClick={() => setStep('razorpay_form')}
                className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 hover:border-emerald-500 rounded-2xl shadow-sm hover:shadow-md transition-all text-center gap-3 cursor-pointer group"
              >
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Coins size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Razorpay Checkout</h4>
                  <p className="text-[10px] text-gray-400 mt-1">UPI, Indian Cards & Netbanking</p>
                </div>
              </button>

              {/* USDT option */}
              <button
                onClick={() => setStep('usdt_form')}
                className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 hover:border-amber-500 rounded-2xl shadow-sm hover:shadow-md transition-all text-center gap-3 cursor-pointer group"
              >
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <QrCode size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Crypto USDT</h4>
                  <p className="text-[10px] text-gray-400 mt-1">Decentralised TRC20 / ERC20</p>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-2.5 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <ShieldCheck className="text-emerald-500 w-5 h-5 shrink-0" />
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Your payment data is fully encrypted. Stripe and Razorpay integrations operate through secure sandbox protocols in this AI environment.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3A: STRIPE PAYMENT FORM */}
        {step === 'stripe_form' && (
          <div className="flex-1 p-6 md:p-10 space-y-6">
            <div className="flex items-center gap-3.5 border-b border-gray-100 pb-4">
              <button 
                onClick={() => setStep('method')}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-all"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Pay with Stripe</h2>
                <p className="text-xs text-gray-500">Pay safely using your debit or credit card. Total: <span className="font-bold text-indigo-600">{planInfo.amount}</span></p>
              </div>
            </div>

            {/* Credit Card Mockup Display */}
            <div className="relative w-full max-w-sm mx-auto h-44 rounded-2xl bg-linear-to-br from-indigo-700 via-indigo-800 to-purple-900 text-white p-5 shadow-xl flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[8px] font-bold tracking-widest uppercase opacity-70">Secured with Stripe</p>
                  <p className="text-sm font-semibold tracking-wider mt-1">Kairo AI Premium</p>
                </div>
                {/* Dynamically display Card Brand Badge */}
                <span className="px-2 py-1 bg-white/10 rounded text-[10px] font-extrabold font-mono tracking-widest">
                  {stripeCard ? getCardBrand(stripeCard).toUpperCase() : 'STRIPE'}
                </span>
              </div>
              
              <div className="space-y-4">
                <p className="text-lg font-mono tracking-widest text-center">
                  {stripeCard || '•••• •••• •••• ••••'}
                </p>
                <div className="flex justify-between items-end text-xs font-mono">
                  <div>
                    <p className="text-[8px] uppercase opacity-50">Cardholder</p>
                    <p className="truncate max-w-45">{stripeName.toUpperCase() || 'YOUR NAME'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase opacity-50 text-right">Expires</p>
                    <p className="text-right">{stripeExpiry || 'MM/YY'}</p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={submitStripe} className="space-y-4 max-w-md mx-auto pt-2">
              {stripeError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{stripeError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Card Number</label>
                <div className="relative">
                  <input 
                    type="text"
                    required
                    placeholder="4111 1111 1111 1111"
                    value={stripeCard}
                    onChange={(e) => handleCardChange(e.target.value, setStripeCard)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                  />
                  <CreditCard size={18} className="absolute right-3.5 top-3 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Expiry Date</label>
                  <input 
                    type="text"
                    required
                    placeholder="MM/YY"
                    value={stripeExpiry}
                    onChange={(e) => handleExpiryChange(e.target.value, setStripeExpiry)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">CVC</label>
                  <input 
                    type="password"
                    required
                    maxLength={4}
                    placeholder="123"
                    value={stripeCvc}
                    onChange={(e) => setStripeCvc(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cardholder Name</label>
                <input 
                  type="text"
                  required
                  placeholder="Steve Rogers"
                  value={stripeName}
                  onChange={(e) => setStripeName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Billing ZIP / Postal Code</label>
                <input 
                  type="text"
                  required
                  placeholder="10001"
                  value={stripeZip}
                  onChange={(e) => setStripeZip(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-4"
              >
                <Lock size={14} />
                <span>Pay {planInfo.amount} secure with stripe</span>
              </button>
            </form>
          </div>
        )}

        {/* STEP 3B: RAZORPAY PAYMENT FORM */}
        {step === 'razorpay_form' && (
          <div className="flex-1 p-6 md:p-10 space-y-6">
            <div className="flex items-center gap-3.5 border-b border-gray-100 pb-4">
              <button 
                onClick={() => setStep('method')}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-all"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-emerald-700 flex items-center gap-1.5">
                  <Coins className="text-emerald-500" size={20} />
                  <span>Razorpay Checkout</span>
                </h2>
                <p className="text-xs text-gray-500">Pay using UPI, Indian Card or Netbanking. Total: <span className="font-bold text-indigo-600">{planInfo.amountInr}</span></p>
              </div>
            </div>

            {/* API Key Status Info Banner */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${(((import.meta as any).env?.VITE_RAZORPAY_KEY_ID as string) || '') ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="font-medium">
                  {(((import.meta as any).env?.VITE_RAZORPAY_KEY_ID as string) || '') ? 'Razorpay Live Key Connected' : 'Running in Sandbox Gateway'}
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-500 bg-slate-200/50 px-2.5 py-0.5 rounded-lg border border-slate-200/50">
                {(((import.meta as any).env?.VITE_RAZORPAY_KEY_ID as string) || '') ? `Key: ${(((import.meta as any).env?.VITE_RAZORPAY_KEY_ID as string) || '').slice(0, 12)}...` : 'Using Sandbox (rzp_test_...)'}
              </span>
            </div>

            {/* Inner Toggles for UPI / Card / Netbanking */}
            <div className="flex bg-gray-100 p-1 rounded-xl max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => { setRazorpayMethod('upi'); setShowRazorpayQr(false); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  razorpayMethod === 'upi' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                UPI (GPay / PayTM)
              </button>
              <button
                type="button"
                onClick={() => { setRazorpayMethod('card'); setShowRazorpayQr(false); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  razorpayMethod === 'card' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Indian Cards
              </button>
              <button
                type="button"
                onClick={() => { setRazorpayMethod('netbanking'); setShowRazorpayQr(false); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  razorpayMethod === 'netbanking' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Netbanking
              </button>
            </div>

            <form onSubmit={submitRazorpay} className="space-y-4 max-w-md mx-auto pt-2">
              {razorpayError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{razorpayError}</span>
                </div>
              )}

              {/* UPI FORM */}
              {razorpayMethod === 'upi' && (
                <div className="space-y-4">
                  {!showRazorpayQr ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">UPI ID (VPA)</label>
                        <input 
                          type="text"
                          placeholder="yourname@okhdfcbank"
                          value={razorpayUpiId}
                          onChange={(e) => setRazorpayUpiId(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all font-mono"
                        />
                      </div>

                      <div className="flex gap-2 justify-center">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold uppercase tracking-wider">Google Pay</span>
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded text-[9px] font-bold uppercase tracking-wider">PhonePe</span>
                        <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded text-[9px] font-bold uppercase tracking-wider">Paytm</span>
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold uppercase tracking-wider">BHIM</span>
                      </div>

                      <div className="text-center py-2">
                        <span className="text-gray-400 text-[11px] font-semibold block mb-2">OR</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRazorpayQr(true);
                            setQrTimer(180);
                          }}
                          className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all border border-indigo-100 inline-flex items-center gap-2 cursor-pointer"
                        >
                          <QrCode size={15} />
                          Generate UPI Payment QR Code
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 bg-gray-50 rounded-2xl border border-gray-200/50 p-4 space-y-3.5 text-center">
                      <div className="p-3 bg-white rounded-2xl shadow-md border border-gray-100">
                        <QrCode size={130} className="text-emerald-950" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-800">Scan with GPay, PhonePe, Paytm, BHIM</p>
                        <p className="text-[10px] text-gray-500">Scan the QR to initiate Indian UPI Payment</p>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full text-xs font-bold">
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Expires in {Math.floor(qrTimer / 60)}:{String(qrTimer % 60).padStart(2, '0')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowRazorpayQr(false)}
                        className="text-xs text-indigo-600 font-bold hover:underline"
                      >
                        Cancel QR and enter UPI ID
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <Lock size={14} />
                    <span>Pay {planInfo.amountInr} with Razorpay</span>
                  </button>
                </div>
              )}

              {/* CARD FORM */}
              {razorpayMethod === 'card' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Card Number</label>
                    <input 
                      type="text"
                      required
                      placeholder="4111 1111 1111 1111"
                      value={razorpayCard}
                      onChange={(e) => handleCardChange(e.target.value, setRazorpayCard)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Expiry Date</label>
                      <input 
                        type="text"
                        required
                        placeholder="MM/YY"
                        value={razorpayExpiry}
                        onChange={(e) => handleExpiryChange(e.target.value, setRazorpayExpiry)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">CVV / CVN</label>
                      <input 
                        type="password"
                        required
                        maxLength={3}
                        placeholder="123"
                        value={razorpayCvv}
                        onChange={(e) => setRazorpayCvv(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cardholder Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="Siddharth Sharma"
                      value={razorpayName}
                      onChange={(e) => setRazorpayName(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                  >
                    <Lock size={14} />
                    <span>Pay {planInfo.amountInr} with Razorpay</span>
                  </button>
                </div>
              )}

              {/* NETBANKING FORM */}
              {razorpayMethod === 'netbanking' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Popular Banks</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'sbi', name: 'State Bank of India' },
                        { id: 'hdfc', name: 'HDFC Bank' },
                        { id: 'icici', name: 'ICICI Bank' },
                        { id: 'axis', name: 'Axis Bank' },
                        { id: 'kotak', name: 'Kotak Mahindra Bank' },
                        { id: 'pnb', name: 'Punjab National Bank' },
                      ].map((bank) => (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => setRazorpayBank(bank.id)}
                          className={`p-3 border rounded-xl text-left text-xs font-semibold transition-all flex items-center justify-between ${
                            razorpayBank === bank.id 
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800' 
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <span>{bank.name}</span>
                          {razorpayBank === bank.id && (
                            <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[8px]">
                              ✓
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                  >
                    <Lock size={14} />
                    <span>Pay {planInfo.amountInr} via Netbanking</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* STEP 3C: USDT WALLET TRANSFER FORM */}
        {step === 'usdt_form' && (
          <div className="flex-1 p-6 md:p-10 space-y-6">
            <div className="flex items-center gap-3.5 border-b border-gray-100 pb-4">
              <button 
                onClick={() => setStep('method')}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-all"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Pay with USDT (Crypto)</h2>
                <p className="text-xs text-gray-500">Deploy decentralized payment. Total required: <span className="font-extrabold text-amber-600">{planInfo.amountUsdt}</span></p>
              </div>
            </div>

            {/* Network tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl max-w-xs mx-auto">
              <button
                type="button"
                onClick={() => setUsdtNetwork('trc20')}
                className={`flex-1 py-1 text-xs font-bold transition-all ${
                  usdtNetwork === 'trc20' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                TRC20 (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setUsdtNetwork('erc20')}
                className={`flex-1 py-1 text-xs font-bold transition-all ${
                  usdtNetwork === 'erc20' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                ERC20 (Ethereum)
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center justify-center py-2">
              <div className="p-3 bg-white rounded-2xl shadow-md border border-gray-100">
                <QrCode size={120} className="text-amber-950" />
              </div>
              <div className="space-y-3 flex-1 w-full max-w-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Transfer Address ({usdtNetwork.toUpperCase()})</span>
                  <div className="flex gap-1.5">
                    <div className="flex-1 bg-gray-100 rounded-xl px-3.5 py-2.5 text-xs font-mono break-all font-semibold select-all">
                      {usdtAddress}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyAddress(usdtAddress)}
                      className={`p-2.5 rounded-xl transition-all border flex items-center justify-center cursor-pointer ${
                        copied ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-200'
                      }`}
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 text-amber-700 rounded-xl text-[10px] leading-relaxed border border-amber-100">
                  ⚠️ <strong>Notice:</strong> Please make absolutely sure you send <strong>USDT</strong> via the <strong>{usdtNetwork.toUpperCase()} network</strong> only. Any other token/network transfers will result in loss of funds.
                </div>
              </div>
            </div>

            {/* Verification Form */}
            <form onSubmit={submitUsdt} className="space-y-4 max-w-md mx-auto border-t border-gray-100 pt-4">
              {usdtError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{usdtError}</span>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Transaction Hash / TxID</label>
                  <button
                    type="button"
                    onClick={() => setUsdtTxHash('tx_' + Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18))}
                    className="text-[10px] text-indigo-600 font-bold hover:underline"
                  >
                    Demo Auto-Fill
                  </button>
                </div>
                <input 
                  type="text"
                  required
                  placeholder="Paste transaction TXID hash key here..."
                  value={usdtTxHash}
                  onChange={(e) => setUsdtTxHash(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-600 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Verify Payment Receipt</span>
              </button>
            </form>
          </div>
        )}

        {/* STEP 4: PROCESSING SCREEN */}
        {step === 'processing' && (
          <div className="flex-1 p-8 md:p-14 flex flex-col items-center justify-center space-y-8 min-h-75">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <div className="absolute">
                <Sparkles size={26} className="text-indigo-600 animate-pulse" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-gray-900">Processing Transaction...</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">Please do not refresh the page or exit the browser window. Our payment gateways are verifying details.</p>
            </div>

            {/* High-fidelity checklist / milestone log */}
            <div className="w-full max-w-sm bg-gray-50 border border-gray-200/50 rounded-2xl p-4.5 space-y-3 font-mono text-xs">
              {loadingLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 text-gray-600">
                  {loadingStep > index + 1 ? (
                    <div className="text-emerald-500 font-bold">✓</div>
                  ) : (
                    <div className="text-indigo-500 animate-pulse">●</div>
                  )}
                  <span className={loadingStep > index + 1 ? 'line-through text-gray-400' : 'text-gray-700'}>
                    {log}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: SUCCESS RECEIPT */}
        {step === 'success' && receiptDetails && (
          <div className="flex-1 p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
              <CheckCircle2 size={38} className="stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">Welcome to Kairo AI Pro!</h2>
              <p className="text-sm text-gray-500">Your transaction was validated and Kairo AI Pro status is activated.</p>
            </div>

            {/* Receipt container */}
            <div className="w-full max-w-md bg-slate-50 border border-slate-200/60 rounded-2xl p-5 text-left space-y-3.5">
              <div className="flex justify-between items-center border-b border-slate-200/50 pb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Premium Invoice</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-extrabold uppercase">Paid</span>
              </div>

              <div className="grid grid-cols-2 gap-y-3 text-xs">
                <div>
                  <p className="text-gray-400">Order Reference</p>
                  <p className="font-mono font-bold text-gray-800">{receiptDetails.orderId}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400">Date Paid</p>
                  <p className="font-bold text-gray-800">{receiptDetails.date}</p>
                </div>
                <div>
                  <p className="text-gray-400">Active Membership</p>
                  <p className="font-bold text-indigo-600">{receiptDetails.planLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400">Payment Channel</p>
                  <p className="font-bold text-gray-800">{receiptDetails.methodLabel}</p>
                </div>
              </div>

              <div className="border-t border-slate-200/50 pt-3 flex justify-between items-baseline">
                <span className="text-xs font-bold text-gray-700">Total Billed</span>
                <span className="text-xl font-extrabold text-gray-900">{receiptDetails.amount}</span>
              </div>
            </div>

            <div className="w-full max-w-md">
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-gray-950 hover:bg-black text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
              >
                Unlock Kairo AI Pro Features
              </button>
            </div>
          </div>
        )}

        {/* MANAGE PLAN VIEW */}
        {step === 'manage' && (
          <div className="flex-1 p-6 md:p-10 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900">Manage Your Subscription</h2>
              <p className="text-xs text-gray-500">View your subscription status, next billing cycle, or cancel payments.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left card: Current status */}
              <div className="p-5 bg-linear-to-tr from-indigo-50 to-indigo-100/50 rounded-2xl border border-indigo-100 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest block">Active Membership</span>
                    <h3 className="text-lg font-bold text-indigo-900 capitalize">{userPlan.replace('_', ' ')}</h3>
                  </div>
                  <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-bold">PRO STATUS</span>
                </div>

                <div className="space-y-1 text-xs text-indigo-950/80">
                  <p>● Unlimited chat interactions with groundings</p>
                  <p>● Full speed high fidelity image engines</p>
                  <p>● Access code & data generation models</p>
                </div>

                <div className="pt-2 border-t border-indigo-200/40 text-xs">
                  <span className="text-gray-400">Next Renewal Date:</span>
                  <p className="font-bold text-indigo-900 mt-0.5">
                    {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { dateStyle: 'long' })}
                  </p>
                </div>
              </div>

              {/* Right card: Subscription settings / Cancel */}
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200/60 flex flex-col justify-between">
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-800 text-sm">Need to cancel or downgrade?</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    By cancelling, you will retain your Premium features until the current cycle ends. Afterwards, your account downgrades to our Free Plan, restricted to 5 messages per session.
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      if (confirm('Are you absolutely sure you want to cancel your Kairo AI Pro subscription?')) {
                        onCancelSubscription();
                        alert('Subscription cancelled successfully.');
                        onClose();
                      }
                    }}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all border border-red-200 cursor-pointer"
                  >
                    Cancel Subscription
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-all cursor-pointer"
                  >
                    Keep Pro Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
