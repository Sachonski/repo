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
  BarChart4,
  Percent,
  Coins
} from 'lucide-react';

// --- Firebase Configuration ---
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
    { id: 'fu_booked', label: 'Follow-ups Booked', icon: Phone, color: 'text-indigo-500', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-100' },
    { id: 'fu_showed', label: 'Follow up (Showed)', icon: Users, color: 'text-sky-500', bgColor: 'bg-sky-50', borderColor: 'border-sky-100' },
    { id: 'offers', label: 'Offers', icon: ThumbsUp, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
    { id: 'closes', label: 'Closes', icon: DollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
    { id: 'fu_closes', label: 'Follow-up Closes', icon: CheckCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
    { id: 'resched_req', label: 'Rescheduled Request', icon: RotateCcw, color: 'text-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-100' },
    { id: 'no_show', label: 'No show Calls', icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-100' },
    { id: 'cancelled', label: 'Cancelled Calls', icon: XCircle, color: 'text-slate-400', bgColor: 'bg-slate-50', borderColor: 'border-slate-100' },
    { id: 'verbal_yes', label: 'Verbal Yes', icon: Zap, color: 'text-yellow-500', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-100' },
  ]
};

const getCalculatedDashboard = (m = {}) => {
  const safeDiv = (n, d) => (d && d > 0) ? (n / d) : 0;
  const totalShows = (m.showed || 0) + (m.fu_showed || 0);
  const totalCloses = (m.closes || 0) + (m.fu_closes || 0);

  return {
    shows: [
      { label: "Show Rate", val: safeDiv(m.showed, m.scheduled) * 100, unit: '%' },
      { label: "FU Show Rate", val: safeDiv(m.fu_showed, m.fu_booked) * 100, unit: '%' },
      { label: "Total Show Rate", val: safeDiv(totalShows, (m.scheduled || 0) + (m.fu_booked || 0)) * 100, unit: '%' },
      { label: "Show to FU %", val: safeDiv(m.fu_booked, m.showed) * 100, unit: '%' },
    ],
    finance: [
      { label: "Total Revenue", val: m.total_revenue || 0, unit: '$' },
      { label: "Total Collected", val: m.total_collected || 0, unit: '$' },
      { label: "Collection %", val: safeDiv(m.total_collected, m.total_revenue) * 100, unit: '%' },
    ],
    efficiency: [
      { label: "Revenue / Call", val: safeDiv(m.total_revenue, totalShows), unit: '$' },
      { label: "Collected / Call", val: safeDiv(m.total_collected, totalShows), unit: '$' },
      { label: "Revenue / Offer", val: safeDiv(m.total_revenue, m.offers), unit: '$' },
      { label: "Collected / Offer", val: safeDiv(m.total_collected, m.offers), unit: '$' },
      { label: "Cash / Sched Call", val: safeDiv(m.total_collected, m.scheduled), unit: '$' },
    ],
    closing: [
      { label: "Call Close Rate", val: safeDiv(totalCloses, totalShows) * 100, unit: '%' },
      { label: "Offer Rate", val: safeDiv(m.offers, totalShows) * 100, unit: '%' },
      { label: "FU Close Rate", val: safeDiv(m.fu_closes, m.fu_showed) * 100, unit: '%' },
    ]
  };
};

const getDaysInCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dates = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    dates.push(`${year}-${mm}-${dd}`); // local-stable YYYY-MM-DD
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
        headers: { 'Authorization': `Bearer ${GHL_API_KEY}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error("GHL API Failure");
      const data = await response.json();
      setLeads((data.contacts || []).map(c => ({
        id: c.id,
        name: c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed Contact',
        email: c.email || 'No email'
      })));
    } catch (err) { console.error("GHL error:", err); } 
    finally { setLoadingContacts(false); }
  }, []);

  useEffect(() => { if (user) fetchGHLContacts(); }, [user, fetchGHLContacts]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => { fetchGHLContacts(queryText); }, 500);
    return () => clearTimeout(timer);
  }, [queryText, user, fetchGHLContacts]);

  const updateMetric = async (metricId, delta) => {
    const getLocalDateKey = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
    if (!user || !selectedLeadId) return;
    setIsSaving(true);
    const today = getLocalDateKey();
    const dailyId = `${today}_${currentRep}`;
    try {
      const dailyRef = doc(db, 'artifacts', appId, 'public', 'data', 'daily_stats', dailyId);
      const contactRef = doc(db, 'artifacts', appId, 'public', 'data', 'contact_stats', selectedLeadId);
      await Promise.all([
        setDoc(dailyRef, { date: today, rep: currentRep, metrics: { [metricId]: increment(delta) } }, { merge: true }),
        setDoc(contactRef, { metrics: { [metricId]: increment(delta) } }, { merge: true })
      ]);
    } catch (err) { console.error("Metric Error:", err); }
    finally { setIsSaving(false); }
  };

  const handleClose = async () => {
    const getLocalDateKey = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
    if (!transaction.product || !transaction.cash || !selectedLeadId || !user) return;
    setIsSaving(true);
    try {
      const prod = PRODUCTS.find(p => p.id === transaction.product);
      const today = getLocalDateKey();
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
    } catch (err) { console.error("Transaction Error:", err); } 
    finally { setIsSaving(false); }
  };

  const mtdAggregated = useMemo(() => {
    const agg = {};
    monthDates.forEach(date => {
      const dayMetrics = dailyStats[`${date}_${currentRep}`]?.metrics || {};
      Object.entries(dayMetrics).forEach(([k, v]) => { agg[k] = (agg[k] || 0) + v; });
    });
    return agg;
  }, [dailyStats, currentRep, monthDates]);

  const dashboardCalculations = useMemo(() => getCalculatedDashboard(mtdAggregated), [mtdAggregated]);

  const MetricBox = ({ label, val, unit }) => (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</span>
      <span className="text-sm font-black text-slate-900 truncate">
        {unit === '$' ? `$${Math.round(val).toLocaleString()}` : 
         unit === '%' ? `${val.toFixed(1)}%` : Math.round(val).toLocaleString()}
      </span>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans text-[10px] pt-[40px]">
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-50 shadow-sm shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Activity className="text-blue-600" size={20} />
            <span className="font-black text-slate-900 uppercase tracking-tighter text-base italic hidden sm:inline">Manic Sales</span>
          </div>
          <nav className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('logger')} className={`px-5 py-1.5 rounded-lg font-black uppercase text-[9px] transition-all ${activeTab === 'logger' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Logger</button>
            <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-1.5 rounded-lg font-black uppercase text-[9px] transition-all ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Dashboard</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
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
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col z-10">
              <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black uppercase text-[9px] text-slate-400 tracking-wider">Prospect Directory</span>
                  <button onClick={() => fetchGHLContacts(queryText)} className="p-1 hover:bg-slate-100 rounded-md">
                    <RefreshCw size={10} className={`${loadingContacts ? 'animate-spin' : ''} text-blue-600`} />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  <input 
                    type="text" 
                    placeholder="Find in CRM..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 text-[10px] font-bold outline-none" 
                    value={queryText} 
                    onChange={e => setQueryText(e.target.value)} 
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {leads.map(l => (
                  <div key={l.id} onClick={() => setSelectedLeadId(l.id)} className={`px-4 py-3 cursor-pointer border-b border-slate-50 ${selectedLeadId === l.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <p className={`font-black uppercase truncate text-[11px] ${selectedLeadId === l.id ? 'text-blue-700' : 'text-slate-700'}`}>{l.name}</p>
                    <p className="text-[8px] text-slate-400 font-bold truncate italic uppercase">{l.email}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
              {!selectedLead ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30"><Target size={60} /><p className="mt-4 font-black uppercase tracking-[0.5em]">Select Client</p></div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl">{selectedLead.name[0]}</div>
                      <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">{selectedLead.name}</h2>
                        <p className="text-slate-400 font-bold uppercase text-[9px]">{selectedLead.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                      <Zap size={12} className="text-blue-600" /> Log Interaction Points
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {KPI_GROUPS.FUNNEL.map(kpi => (
                        <div key={kpi.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 group hover:border-blue-200 transition-all">
                          <div className="flex items-center gap-2">
                            <kpi.icon size={12} className={kpi.color} />
                            <span className="font-black uppercase text-[8px] text-slate-600 truncate">{kpi.label}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-black text-blue-600">{(contactStats[selectedLeadId]?.metrics?.[kpi.id] || 0)}</span>
                            <div className="flex gap-1">
                              <button onClick={() => updateMetric(kpi.id, -1)} className="w-7 h-7 bg-white rounded-lg border border-slate-200 font-bold hover:text-red-500 hover:bg-red-50">-</button>
                              <button onClick={() => updateMetric(kpi.id, 1)} className="w-7 h-7 bg-white rounded-lg border border-slate-200 font-bold hover:text-blue-600 hover:bg-blue-50">+</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-[32px] p-8 text-white">
                    <h2 className="text-[9px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                      <DollarSign size={14} className="text-emerald-400" /> Record Closing Action
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="space-y-2">
                        <label className="text-[7px] font-black uppercase text-slate-500">Package</label>
                        <select 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-[10px] font-black outline-none"
                          value={transaction.product}
                          onChange={e => setTransaction({...transaction, product: e.target.value})}
                        >
                          <option value="">Select...</option>
                          {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[7px] font-black uppercase text-slate-500">Collected</label>
                        <input 
                          type="number" placeholder="0.00" 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-[10px] font-black"
                          value={transaction.cash}
                          onChange={e => setTransaction({...transaction, cash: e.target.value})}
                        />
                      </div>
                      <button onClick={handleClose} className="bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-900/20">Record Sale</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
            <div className="max-w-6xl mx-auto space-y-12">
              <header className="flex justify-between items-end">
                <div>
                  <h1 className="text-4xl font-black italic tracking-tighter uppercase">Dashboard</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">MTD Performance Analytics • {currentRep}</p>
                </div>
                <div className="flex gap-4">
                   <div className="text-right">
                     <p className="text-[8px] font-black text-slate-400 uppercase">MTD Revenue</p>
                     <p className="text-2xl font-black text-slate-900">${(mtdAggregated.total_revenue || 0).toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[8px] font-black text-slate-400 uppercase">MTD Collected</p>
                     <p className="text-2xl font-black text-emerald-600">${(mtdAggregated.total_collected || 0).toLocaleString()}</p>
                   </div>
                </div>
              </header>

              <div className="space-y-10">
                {/* Shows & Attendance */}
                <section>
                  <h3 className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users size={12} /> Show & Attendance Metrics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {dashboardCalculations.shows.map(m => <MetricBox key={m.label} {...m} />)}
                  </div>
                </section>

                {/* Financial Group */}
                <section>
                  <h3 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Coins size={12} /> Financial Health
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {dashboardCalculations.finance.map(m => <MetricBox key={m.label} {...m} />)}
                  </div>
                </section>

                {/* Efficiency Stats */}
                <section>
                  <h3 className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <TrendingUp size={12} /> Efficiency Ratios
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {dashboardCalculations.efficiency.map(m => <MetricBox key={m.label} {...m} />)}
                  </div>
                </section>

                {/* Closing Stats */}
                <section>
                  <h3 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CheckCircle size={12} /> Closing & Offers
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {dashboardCalculations.closing.map(m => <MetricBox key={m.label} {...m} />)}
                  </div>
                </section>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900 text-white text-xs uppercase">
              <th className="p-4 sticky left-0 bg-slate-900">Metric</th>
              <th className="p-4 text-center bg-blue-900">Total</th>

              {/* 🔥 FULL MONTH — NO SLICE */}
             {monthDates.map(d => (
  <th key={d} className="p-4 text-center min-w-[50px]">
    {Number(d.split('-')[2])}
  </th>
))}
            </tr>
          </thead>

          <tbody>
            {KPI_GROUPS.FUNNEL.map(kpi => (
              <tr key={kpi.id} className="border-b hover:bg-slate-50">
                <td className="p-4 sticky left-0 bg-white font-bold">
                  {kpi.label}
                </td>

                <td className="p-4 text-center font-bold text-blue-600">
                  {mtdAggregated[kpi.id] || 0}
                </td>

                {/* 🔥 FULL MONTH — NO SLICE */}
                {monthDates.map(d => (
                  <td key={d} className="p-4 text-center text-slate-500">
                    {dailyStats[`${d}_${currentRep}`]?.metrics?.[kpi.id] || 0}
                  </td>
                ))}
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