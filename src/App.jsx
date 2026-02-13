import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection,
  increment,
  getDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Users, 
  Phone, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  RotateCcw,
  Activity,
  ThumbsUp,
  ChevronDown,
  DollarSign,
  Zap,
  Target,
  Loader2,
  RefreshCw,
  TrendingUp,
  Save,
  UserPlus,
  BarChart4
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyAYoeMs_bYyADz7rgK6l4ziTzUSYlAgSMU",
      authDomain: "repo-79346.firebaseapp.com",
      projectId: "repo-79346",
      storageBucket: "repo-79346.firebasestorage.app",
      messagingSenderId: "287229137677",
      appId: "1:287229137677:web:4dd736d5c0055001231644",
    };


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'manic-sales-tracker-v2';

// --- GHL Configuration ---
const GHL_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6ImNYM3hMemxIamk1NEtPbmxwY0tjIiwiY29tcGFueV9pZCI6ImUwWjFBeklOYXFZdFg5bUplMm04IiwidmVyc2lvbiI6MSwiaWF0IjoxNjc3NjQ1MjE5NzU3LCJzdWIiOiJ1c2VyX2lkIn0.8xeP3HX6A62yzENfLuMhYhOCRqK_fr3lLWM7zGIvy7k";

const REPS = ["BreAnna", "Christina"];

const PRODUCTS = [
  { id: 'pif_90', name: "PIF 90 Days", price: 2500 },
  { id: 'm597', name: "Monthly $597", price: 597 },
  { id: 'm397', name: "Monthly $397", price: 397 },
  { id: 'm297', name: "Monthly $297", price: 297 },
  { id: 'm97', name: "Monthly $97", price: 97 }
];

const KPI_GROUPS = {
  FUNNEL: [
    { id: 'scheduled', label: 'Scheduled Calls', icon: Calendar, color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
    { id: 'showed', label: 'Showed', icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-100' },
    { id: 'fu_showed', label: 'Follow up (Showed)', icon: Users, color: 'text-sky-500', bgColor: 'bg-sky-50', borderColor: 'border-sky-100' },
    { id: 'resched_req', label: 'Rescheduled Request', icon: RotateCcw, color: 'text-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-100' },
    { id: 'cancelled', label: 'Cancelled Calls', icon: XCircle, color: 'text-slate-400', bgColor: 'bg-slate-50', borderColor: 'border-slate-100' },
    { id: 'no_show', label: 'No show Calls', icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-100' },
    { id: 'fu_booked', label: 'Follow-ups Booked', icon: Phone, color: 'text-indigo-500', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-100' },
    { id: 'offers', label: 'Offers', icon: ThumbsUp, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
    { id: 'verbal_yes', label: 'Verbal Yes', icon: Zap, color: 'text-yellow-500', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-100' },
    { id: 'closes', label: 'Closes', icon: DollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
    { id: 'closed_lost', label: 'Closed Lost', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-100' },
    { id: 'fu_lost', label: 'Follow-up Lost', icon: XCircle, color: 'text-rose-400', bgColor: 'bg-rose-50', borderColor: 'border-rose-100' },
    { id: 'fu_closes', label: 'Follow-up Closes', icon: CheckCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
  ]
};

const calculateCalculatedMetrics = (metrics) => {
  const m = metrics || {};
  const safeDiv = (n, d) => (d && d > 0) ? (n / d) : 0;
  const toPerc = (val) => `${(val * 100).toFixed(1)}%`;
  const toCur = (val) => `$${Math.round(val).toLocaleString()}`;

  const totalShows = (m.showed || 0) + (m.fu_showed || 0);

  return [
    { label: "Show (%)", val: toPerc(safeDiv(m.showed, m.scheduled)) },
    { label: "Follow Up Show (%)", val: toPerc(safeDiv(m.fu_showed, m.fu_booked)) },
    { label: "Show Total (%)", val: toPerc(safeDiv(totalShows, (m.scheduled || 0) + (m.fu_booked || 0))) },
    { label: "Total Revenue ($)", val: toCur(m.total_revenue || 0) },
    { label: "Total Collected ($)", val: toCur(m.total_collected || 0) },
    { label: "Total Collected (%)", val: toPerc(safeDiv(m.total_collected, m.total_revenue)) },
    { label: "Revenue / Call ($)", val: toCur(safeDiv(m.total_revenue, totalShows)) },
    { label: "Collected / Call ($)", val: toCur(safeDiv(m.total_collected, totalShows)) },
    { label: "Revenue / Offer ($)", val: toCur(safeDiv(m.total_revenue, m.offers)) },
    { label: "Collected / Offer ($)", val: toCur(safeDiv(m.total_collected, m.offers)) },
    { label: "Call Close (%)", val: toPerc(safeDiv((m.closes || 0) + (m.fu_closes || 0), totalShows)) },
    { label: "Cash per scheduled call ($)", val: toCur(safeDiv(m.total_collected, m.scheduled)) },
    { label: "Offer (%)", val: toPerc(safeDiv(m.offers, totalShows)) },
    { label: "Show to Follow Up %", val: toPerc(safeDiv(m.fu_booked, m.showed)) },
    { label: "Follow-up Closes %", val: toPerc(safeDiv(m.fu_closes, m.fu_showed)) }
  ];
};

const getDaysInCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('logger'); 
  const [currentRep, setCurrentRep] = useState(REPS[0]);
  const [dailyStats, setDailyStats] = useState({});
  const [contactStats, setContactStats] = useState({});
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [queryText, setQueryText] = useState('');
  const [transaction, setTransaction] = useState({ product: '', cash: '' });
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const monthDates = useMemo(() => getDaysInCurrentMonth(), []);
  const selectedLead = useMemo(() => leads.find(l => l.id === selectedLeadId), [leads, selectedLeadId]);

  // Auth Initialization (Rule 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error("Auth error", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Sync Daily Stats from Firestore (Global level for the dashboard)
  useEffect(() => {
    if (!user) return;
    const dailyRef = collection(db, 'artifacts', appId, 'public', 'data', 'daily_stats');
    const unsub = onSnapshot(dailyRef, (snapshot) => {
      const stats = {};
      snapshot.docs.forEach(doc => { stats[doc.id] = doc.data(); });
      setDailyStats(stats);
    }, (err) => console.error("Daily Sync Error:", err));
    return () => unsub();
  }, [user]);

  // Sync Contact Stats (Lifetime values for all contacts)
  useEffect(() => {
    if (!user) return;
    const contactRef = collection(db, 'artifacts', appId, 'public', 'data', 'contact_stats');
    const unsub = onSnapshot(contactRef, (snapshot) => {
      const stats = {};
      snapshot.docs.forEach(doc => { stats[doc.id] = doc.data(); });
      setContactStats(stats);
    }, (err) => console.error("Contact Sync Error:", err));
    return () => unsub();
  }, [user]);

  // GHL Contact Fetching
  const fetchGHLContacts = useCallback(async (searchQuery = '') => {
    setLoadingContacts(true);
    try {
      const parts = GHL_API_KEY.split('.');
      let locationId = "";
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        locationId = payload.location_id;
      }

      const url = searchQuery 
        ? `https://rest.gohighlevel.com/v1/contacts/?locationId=${locationId}&query=${encodeURIComponent(searchQuery)}&limit=100`
        : `https://rest.gohighlevel.com/v1/contacts/?locationId=${locationId}&limit=100`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error("GHL API Failure");

      const data = await response.json();
      const mapped = (data.contacts || []).map(c => ({
        id: c.id,
        name: c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed Contact',
        email: c.email || 'No email'
      }));

      setLeads(mapped);
    } catch (err) {
      console.error("Error fetching GHL contacts:", err);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchGHLContacts();
  }, [user, fetchGHLContacts]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      fetchGHLContacts(queryText);
    }, 500);
    return () => clearTimeout(timer);
  }, [queryText, user, fetchGHLContacts]);

  // Update Metric for both Rep Daily and Contact Lifetime
  const updateMetric = async (metricId, delta) => {
    if (!user || !selectedLeadId) return;

    const today = new Date().toISOString().split('T')[0];
    const dailyId = `${today}_${currentRep}`;

    try {
      const dailyRef = doc(db, 'artifacts', appId, 'public', 'data', 'daily_stats', dailyId);
      const contactRef = doc(db, 'artifacts', appId, 'public', 'data', 'contact_stats', selectedLeadId);
      
      // Specifically for client-level view, we also track "Client x Rep x Date" activity
      // This allows us to see how many times a specific rep interacted with a specific client on a date
      const clientDailyId = `${selectedLeadId}_${today}_${currentRep}`;
      const clientDailyRef = doc(db, 'artifacts', appId, 'public', 'data', 'client_daily_activity', clientDailyId);

      await Promise.all([
        setDoc(dailyRef, {
          date: today,
          rep: currentRep,
          metrics: { [metricId]: increment(delta) }
        }, { merge: true }),
        setDoc(contactRef, {
          metrics: { [metricId]: increment(delta) }
        }, { merge: true }),
        setDoc(clientDailyRef, {
          clientId: selectedLeadId,
          date: today,
          rep: currentRep,
          metrics: { [metricId]: increment(delta) }
        }, { merge: true })
      ]);
    } catch (err) {
      console.error("Failed to update metric:", err);
    }
  };

  const handleClose = async () => {
    if (!transaction.product || !transaction.cash || !selectedLeadId || !user) return;
    setIsSaving(true);
    try {
      const prod = PRODUCTS.find(p => p.id === transaction.product);
      const today = new Date().toISOString().split('T')[0];
      const dailyId = `${today}_${currentRep}`;
      
      const dailyRef = doc(db, 'artifacts', appId, 'public', 'data', 'daily_stats', dailyId);
      const contactRef = doc(db, 'artifacts', appId, 'public', 'data', 'contact_stats', selectedLeadId);

      const payload = {
        metrics: {
          closes: increment(1),
          total_revenue: increment(prod?.price || 0),
          total_collected: increment(Number(transaction.cash))
        }
      };

      await Promise.all([
        setDoc(dailyRef, { ...payload, date: today, rep: currentRep }, { merge: true }),
        setDoc(contactRef, payload, { merge: true })
      ]);

      setTransaction({ product: '', cash: '' });
    } catch (err) {
      console.error("Failed to process transaction:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const todayDateStr = new Date().toISOString().split('T')[0];
  const currentDayRepStats = dailyStats[`${todayDateStr}_${currentRep}`]?.metrics || {};
  
  // Specific stats for the SELECTED CLIENT (lifetime)
  const selectedClientMetrics = contactStats[selectedLeadId]?.metrics || {};

  const mtdAggregated = useMemo(() => {
    const agg = {};
    monthDates.forEach(date => {
      const dayMetrics = dailyStats[`${date}_${currentRep}`]?.metrics || {};
      Object.entries(dayMetrics).forEach(([k, v]) => {
        agg[k] = (agg[k] || 0) + v;
      });
    });
    return agg;
  }, [dailyStats, currentRep, monthDates]);

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans text-[10px] pt-[40px]">
      {/* Global Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-50 shadow-sm shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Activity className="text-blue-600" size={20} />
            <span className="font-black text-slate-900 uppercase tracking-tighter text-base italic hidden sm:inline">Manic Sales</span>
          </div>
          <nav className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('logger')} className={`px-5 py-1.5 rounded-lg font-black uppercase text-[9px] transition-all ${activeTab === 'logger' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Client Activity</button>
            <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-1.5 rounded-lg font-black uppercase text-[9px] transition-all ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Rep Dashboard</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isSaving && (
            <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-[8px] animate-pulse">
              <Save size={10} /> Saving...
            </div>
          )}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {REPS.map(rep => (
              <button key={rep} onClick={() => setCurrentRep(rep)} className={`px-4 py-1.5 rounded-lg font-black uppercase text-[9px] ${currentRep === rep ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>{rep}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex relative">
        {activeTab === 'logger' ? (
          <>
            {/* Sidebar Contact Search */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col z-10 shadow-lg sm:shadow-none absolute inset-y-0 left-0 sm:relative transform -translate-x-full sm:translate-x-0 transition-transform duration-200">
              <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black uppercase text-[9px] text-slate-400 tracking-wider">Prospect Directory</span>
                  <button onClick={() => fetchGHLContacts(queryText)} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                    <RefreshCw size={10} className={`${loadingContacts ? 'animate-spin' : ''} text-blue-600`} />
                  </button>
                </div>
                <div className="relative">
                  {loadingContacts ? (
                     <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 animate-spin" size={12} />
                  ) : (
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  )}
                  <input 
                    type="text" 
                    placeholder="Find in CRM..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 text-[10px] font-bold outline-none focus:border-blue-500 transition-colors" 
                    value={queryText} 
                    onChange={e => setQueryText(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {leads.length === 0 && !loadingContacts ? (
                  <div className="p-10 text-center opacity-30 flex flex-col items-center">
                    <UserPlus size={24} className="mb-2" />
                    <p className="font-black uppercase text-[8px] tracking-widest leading-relaxed">Search to access client KPIs</p>
                  </div>
                ) : (
                  leads.map(l => (
                    <div key={l.id} onClick={() => setSelectedLeadId(l.id)} className={`px-4 py-3 cursor-pointer border-b border-slate-50 transition-colors ${selectedLeadId === l.id ? 'bg-blue-50 border-blue-100' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className={`font-black uppercase truncate text-[11px] ${selectedLeadId === l.id ? 'text-blue-700' : 'text-slate-700'}`}>{l.name}</p>
                          <p className="text-[8px] text-slate-400 font-bold mt-0.5 uppercase truncate italic">{l.email}</p>
                        </div>
                        {contactStats[l.id]?.metrics?.total_collected > 0 && (
                          <div className="ml-2 w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div>
                        )}
                      </div>
                      
                      {/* Compact KPI list in sidebar for the contact */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {KPI_GROUPS.FUNNEL.slice(0, 4).map(kpi => {
                          const val = contactStats[l.id]?.metrics?.[kpi.id] || 0;
                          if (val <= 0) return null;
                          return (
                            <div key={kpi.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[7px] font-black uppercase ${kpi.bgColor} ${kpi.borderColor} ${kpi.color}`}>
                              <span>{kpi.label.split(' ')[0][0]}</span>
                              <span className="opacity-60">{val}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Dynamic Client Dashboard View */}
            <div className="flex-1 bg-slate-50 p-4 sm:p-8 overflow-y-auto w-full">
              {!selectedLead ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <Target size={60} className="text-slate-300" />
                  <p className="mt-4 font-black uppercase tracking-[0.5em] text-slate-400 text-center">Select a client<br/>to load performance data</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Client Identity Header */}
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className="w-20 h-20 bg-blue-600 rounded-[24px] flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-blue-100">{selectedLead.name[0]}</div>
                        <div>
                          <div className="flex items-center gap-2">
                             <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">{selectedLead.name}</h2>
                             {selectedClientMetrics.closes > 0 && <CheckCircle className="text-emerald-500" size={18} />}
                          </div>
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1">{selectedLead.email}</p>
                          <div className="mt-3 flex items-center gap-3">
                            <span className="px-3 py-1 bg-slate-100 rounded-full text-[8px] font-black uppercase text-slate-500">GHL ID: {selectedLead.id.slice(0,8)}...</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Lifetime Value / Client Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 text-center min-w-[120px]">
                           <p className="text-[7px] font-black text-emerald-600 uppercase mb-1">Lifetime Revenue</p>
                           <p className="text-lg font-black text-emerald-700">${(selectedClientMetrics.total_collected || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100 text-center min-w-[120px]">
                           <p className="text-[7px] font-black text-blue-600 uppercase mb-1">Funnel Touches</p>
                           <p className="text-lg font-black text-blue-700">
                             {(selectedClientMetrics.scheduled || 0) + (selectedClientMetrics.fu_showed || 0)}
                           </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CLIENT-SPECIFIC KPI INPUTS */}
                  <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
                      <div>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                          <BarChart4 size={14} className="text-blue-600" /> Lead Performance Indicators
                        </h2>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Tracking historic activity for this specific prospect</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full italic">Logging as {currentRep}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {KPI_GROUPS.FUNNEL.map(kpi => (
                        <div key={kpi.id} className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-200 transition-all group shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl bg-white shadow-sm group-hover:scale-110 transition-transform`}>
                              <kpi.icon size={16} className={kpi.color} />
                            </div>
                            <div>
                              <span className="font-black uppercase text-[10px] text-slate-600 block">{kpi.label}</span>
                              <span className="text-[8px] text-slate-400 uppercase font-bold italic">Total: {selectedClientMetrics[kpi.id] || 0}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                            <button 
                              disabled={isSaving} 
                              onClick={() => updateMetric(kpi.id, -1)} 
                              className="w-8 h-8 flex items-center justify-center rounded-xl font-bold hover:bg-red-50 transition-all text-slate-300 hover:text-red-500"
                            >-</button>
                            <span className="w-6 text-center font-black text-blue-600 text-base">
                              {/* Show "Lifetime" value here for this specific client or just the current rep interaction? 
                                  Let's show the lifetime total but allow the rep to increment it. */}
                              {selectedClientMetrics[kpi.id] || 0}
                            </span>
                            <button 
                              disabled={isSaving} 
                              onClick={() => updateMetric(kpi.id, 1)} 
                              className="w-8 h-8 flex items-center justify-center rounded-xl font-bold hover:bg-blue-50 transition-all text-blue-600"
                            >+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transaction Box for this Lead */}
                  <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <DollarSign size={100} />
                      </div>
                      <h2 className="text-xs font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                        <DollarSign size={14} className="text-emerald-400" /> Close New Sale
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end relative z-10">
                        <div className="space-y-3">
                           <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Select Package</label>
                           <div className="relative">
                             <select 
                               className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-[11px] font-black outline-none appearance-none cursor-pointer focus:border-blue-500 transition-colors"
                               value={transaction.product}
                               onChange={e => setTransaction({...transaction, product: e.target.value})}
                             >
                               <option value="">Choose...</option>
                               {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>)}
                             </select>
                             <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={14} />
                           </div>
                        </div>
                        <div className="space-y-3">
                           <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Cash Collected ($)</label>
                           <input 
                             type="number" 
                             className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 font-black text-base outline-none focus:border-emerald-500 transition-colors" 
                             placeholder="0.00" 
                             value={transaction.cash}
                             onChange={e => setTransaction({...transaction, cash: e.target.value})}
                           />
                        </div>
                        <button 
                          onClick={handleClose}
                          disabled={!transaction.product || !transaction.cash || isSaving}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] h-[56px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                        >
                          {isSaving && <Loader2 size={14} className="animate-spin" />}
                          Record Sale
                        </button>
                      </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* REPS MTD DASHBOARD */
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
            <div className="max-w-full space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                  <h1 className="text-3xl font-black italic uppercase tracking-tighter">Performance Matrix</h1>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">MTD Rep Analysis • {currentRep}</p>
                </div>
                <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 flex gap-8 shadow-sm">
                  <div className="text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">MTD Revenue</p>
                    <p className="text-base font-black text-slate-900">${(mtdAggregated.total_revenue || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">MTD Collected</p>
                    <p className="text-base font-black text-emerald-600">${(mtdAggregated.total_collected || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Table with all historical data points */}
              <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase text-[9px]">
                      <th className="p-5 text-left sticky left-0 bg-slate-900 z-10 border-r border-slate-800">Metric Category</th>
                      <th className="p-5 text-center bg-blue-900 border-r border-slate-800">MTD Total</th>
                      {monthDates.map(date => (
                        <th key={date} className={`p-4 text-center min-w-[65px] ${date === todayDateStr ? 'bg-blue-600' : ''}`}>
                          <div className="flex flex-col">
                            <span className="text-[7px] opacity-60 font-medium uppercase">{new Date(date).toLocaleString('default', { month: 'short' })}</span>
                            <span>{new Date(date).getDate()}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-slate-50">
                      <td colSpan={monthDates.length + 2} className="px-5 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 italic">Volume Tracking</td>
                    </tr>
                    {KPI_GROUPS.FUNNEL.map(kpi => (
                      <tr key={kpi.id} className="border-b border-slate-100 font-bold text-[9px] hover:bg-slate-50">
                        <td className="p-4 px-8 sticky left-0 bg-white z-10 border-r border-slate-100 uppercase text-slate-600 flex items-center gap-2">
                          <kpi.icon size={10} className={kpi.color} /> {kpi.label}
                        </td>
                        <td className="p-4 text-center font-black bg-blue-50 border-r border-slate-100 text-blue-800">{(mtdAggregated[kpi.id] || 0).toLocaleString()}</td>
                        {monthDates.map(date => (
                          <td key={date} className={`p-4 text-center border-r border-slate-50 ${date === todayDateStr ? 'bg-blue-50 text-blue-700' : 'text-slate-400'}`}>
                            {dailyStats[`${date}_${currentRep}`]?.metrics?.[kpi.id] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}

                    <tr className="bg-blue-50/30">
                      <td colSpan={monthDates.length + 2} className="px-5 py-2 text-[8px] font-black uppercase tracking-widest text-blue-400 border-b border-blue-100 flex items-center gap-2 italic">
                        <TrendingUp size={10} /> Calculated Conversions
                      </td>
                    </tr>
                    {calculateCalculatedMetrics(mtdAggregated).map((calc, idx) => (
                      <tr key={idx} className="border-b border-slate-100 font-bold text-[9px] hover:bg-slate-50">
                        <td className="p-4 px-8 sticky left-0 bg-white z-10 border-r border-slate-100 uppercase text-slate-900 italic">{calc.label}</td>
                        <td className="p-4 text-center font-black bg-blue-100/50 border-r border-slate-100 text-blue-900">{calc.val}</td>
                        {monthDates.map(date => {
                          const dayM = dailyStats[`${date}_${currentRep}`]?.metrics;
                          const dayCalc = calculateCalculatedMetrics(dayM).find(c => c.label === calc.label);
                          const isZero = dayCalc?.val === "0.0%" || dayCalc?.val === "$0";
                          return (
                            <td key={date} className={`p-4 text-center border-r border-slate-50 ${date === todayDateStr ? 'bg-blue-50 text-blue-700 font-black' : 'text-slate-400 font-medium'}`}>
                              {isZero ? '-' : dayCalc?.val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}