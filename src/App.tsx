import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './lib/supabase';
import type { DailyStats } from './lib/supabase';
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
  BarChart3
} from 'lucide-react';

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
    { id: 'scheduled', label: 'Scheduled Calls', icon: Calendar, color: 'text-blue-500' },
    { id: 'showed', label: 'Showed', icon: CheckCircle, color: 'text-green-500' },
    { id: 'fu_showed', label: 'Follow up (Showed)', icon: Users, color: 'text-sky-500' },
    { id: 'resched_req', label: 'Rescheduled Request', icon: RotateCcw, color: 'text-orange-500' },
    { id: 'cancelled', label: 'Cancelled Calls', icon: XCircle, color: 'text-slate-400' },
    { id: 'no_show', label: 'No show Calls', icon: AlertCircle, color: 'text-red-500' },
    { id: 'fu_booked', label: 'Follow-ups Booked', icon: Phone, color: 'text-indigo-500' },
    { id: 'offers', label: 'Offers', icon: ThumbsUp, color: 'text-blue-600' },
    { id: 'verbal_yes', label: 'Verbal Yes', icon: Zap, color: 'text-yellow-500' },
    { id: 'closes', label: 'Closes', icon: DollarSign, color: 'text-emerald-600' },
    { id: 'closed_lost', label: 'Closed Lost', icon: XCircle, color: 'text-red-600' },
    { id: 'fu_lost', label: 'Follow-up Lost', icon: XCircle, color: 'text-rose-400' },
    { id: 'fu_closes', label: 'Follow-up Closes', icon: CheckCircle, color: 'text-emerald-500' },
  ],
  EFFICIENCY: [
    { id: 'show_pct', label: 'Show (%)', suffix: '%' },
    { id: 'fu_show_pct', label: 'Follow Up Show (%)', suffix: '%' },
    { id: 'rev_call', label: 'Revenue / Call ($)', prefix: '$' },
    { id: 'coll_call', label: 'Collected / Call ($)', prefix: '$' },
    { id: 'rev_offer', label: 'Revenue / Offer ($)', prefix: '$' },
    { id: 'coll_offer', label: 'Collected / Offer ($)', prefix: '$' },
    { id: 'close_pct', label: 'Call Close (%)', suffix: '%' },
    { id: 'cash_per_sched', label: 'Cash per scheduled call ($)', prefix: '$' },
    { id: 'show_to_fu_pct', label: 'Show to Follow Up %', suffix: '%' },
  ]
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

interface Lead {
  id: string;
  name: string;
  email: string;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('logger');
  const [currentRep, setCurrentRep] = useState(REPS[0]);
  const [dailyStats, setDailyStats] = useState<Record<string, DailyStats>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [transaction, setTransaction] = useState({ product: '', cash: '' });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLTableCellElement>(null);

  const monthDates = useMemo(() => getDaysInCurrentMonth(), []);
  const selectedLead = useMemo(() => leads.find(l => l.id === selectedLeadId), [leads, selectedLeadId]);

  useEffect(() => {
    if (activeTab === 'dashboard' && scrollContainerRef.current && todayRef.current) {
      const container = scrollContainerRef.current;
      const target = todayRef.current;

      const targetOffset = target.offsetLeft;
      const targetWidth = target.offsetWidth;
      const containerWidth = container.offsetWidth;

      const scrollTo = targetOffset - (containerWidth / 2) + (targetWidth / 2);

      container.scrollTo({
        left: scrollTo,
        behavior: 'smooth'
      });
    }
  }, [activeTab]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error('Auth error:', error);
          return;
        }
        setUser(data.user);
      } else {
        setUser(session.user);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('daily_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_stats'
        },
        async () => {
          const { data } = await supabase
            .from('daily_stats')
            .select('*');

          if (data) {
            const statsMap: Record<string, DailyStats> = {};
            data.forEach(stat => {
              const key = `${stat.date}_${stat.rep}`;
              statsMap[key] = stat;
            });
            setDailyStats(statsMap);
          }
        }
      )
      .subscribe();

    const fetchInitialStats = async () => {
      const { data } = await supabase
        .from('daily_stats')
        .select('*');

      if (data) {
        const statsMap: Record<string, DailyStats> = {};
        data.forEach(stat => {
          const key = `${stat.date}_${stat.rep}`;
          statsMap[key] = stat;
        });
        setDailyStats(statsMap);
      }
    };

    fetchInitialStats();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const fetchGHLContacts = async () => {
      if (!user) return;
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const response = await fetch(`${supabaseUrl}/functions/v1/fetch-ghl-contacts`, {
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        setLeads((data.contacts || []).map((c: any) => ({
          id: c.id,
          name: c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
          email: c.email || 'No email'
        })));
      } catch (err) {
        console.error("GHL API Error:", err);
      }
    };
    fetchGHLContacts();
  }, [user]);

  const updateMetric = async (metricId: string, delta: number) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const key = `${today}_${currentRep}`;

    const existing = dailyStats[key];
    const currentMetrics = existing?.metrics || {};
    const newValue = Math.max(0, (currentMetrics[metricId] || 0) + delta);

    const updatedMetrics = { ...currentMetrics, [metricId]: newValue };

    await supabase
      .from('daily_stats')
      .upsert({
        date: today,
        rep: currentRep,
        metrics: updatedMetrics
      }, {
        onConflict: 'date,rep'
      });
  };

  const handleClose = async () => {
    if (!transaction.product || !transaction.cash) return;
    const prod = PRODUCTS.find(p => p.id === transaction.product);
    const today = new Date().toISOString().split('T')[0];
    const key = `${today}_${currentRep}`;

    const existing = dailyStats[key];
    const currentMetrics = existing?.metrics || {};

    const updatedMetrics = {
      ...currentMetrics,
      closes: (currentMetrics.closes || 0) + 1,
      total_revenue: (currentMetrics.total_revenue || 0) + (prod?.price || 0),
      total_collected: (currentMetrics.total_collected || 0) + Number(transaction.cash),
      [`${prod?.id}_sold`]: (currentMetrics[`${prod?.id}_sold`] || 0) + 1
    };

    await supabase
      .from('daily_stats')
      .upsert({
        date: today,
        rep: currentRep,
        metrics: updatedMetrics
      }, {
        onConflict: 'date,rep'
      });

    setTransaction({ product: '', cash: '' });
  };

  const calculateMetric = (date: string, rep: string, type: string) => {
    const key = `${date}_${rep}`;
    const m = dailyStats[key]?.metrics || {};
    const safeDiv = (n: number, d: number) => d > 0 ? (n / d) : 0;

    switch(type) {
      case 'show_pct': return `${Math.round(safeDiv(m.showed || 0, m.scheduled || 0) * 100)}%`;
      case 'fu_show_pct': return `${Math.round(safeDiv(m.fu_showed || 0, m.fu_booked || 0) * 100)}%`;
      case 'rev_call': return `$${Math.round(safeDiv(m.total_revenue || 0, m.scheduled || 0))}`;
      case 'coll_call': return `$${Math.round(safeDiv(m.total_collected || 0, m.scheduled || 0))}`;
      case 'rev_offer': return `$${Math.round(safeDiv(m.total_revenue || 0, m.offers || 0))}`;
      case 'coll_offer': return `$${Math.round(safeDiv(m.total_collected || 0, m.offers || 0))}`;
      case 'close_pct': return `${Math.round(safeDiv(m.closes || 0, m.offers || 0) * 100)}%`;
      case 'cash_per_sched': return `$${Math.round(safeDiv(m.total_collected || 0, m.scheduled || 0))}`;
      case 'show_to_fu_pct': return `${Math.round(safeDiv(m.fu_booked || 0, m.showed || 0) * 100)}%`;
      default: return m[type] || 0;
    }
  };

  const filteredLeads = leads.filter(l => l.name.toLowerCase().includes(filterText.toLowerCase()));

  const todayDateStr = new Date().toISOString().split('T')[0];
  const currentDayStats = dailyStats[`${todayDateStr}_${currentRep}`]?.metrics || {};

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans text-[10px]">
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Activity className="text-blue-600" size={20} />
            <span className="font-black text-slate-900 uppercase tracking-tighter text-base italic">Manic Systems</span>
          </div>
          <nav className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('logger')} className={`px-5 py-1.5 rounded-lg font-black uppercase text-[9px] transition-all ${activeTab === 'logger' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Activity Logger</button>
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

      <main className="flex-1 overflow-hidden flex">
        {activeTab === 'logger' ? (
          <>
            <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
              <div className="p-4 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  <input
                    type="text"
                    placeholder="Search GHL contacts..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 text-[10px] font-bold outline-none"
                    value={filterText}
                    onChange={e => setFilterText(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredLeads.map(l => (
                  <div key={l.id} onClick={() => setSelectedLeadId(l.id)} className={`px-5 py-3 cursor-pointer border-b border-slate-50 transition-colors ${selectedLeadId === l.id ? 'bg-blue-50 border-blue-100' : 'hover:bg-slate-50'}`}>
                    <p className={`font-black uppercase truncate text-[11px] ${selectedLeadId === l.id ? 'text-blue-700' : 'text-slate-700'}`}>{l.name}</p>
                    <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase truncate">{l.email}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
              {!selectedLead ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <Target size={60} className="text-slate-300" />
                  <p className="mt-4 font-black uppercase tracking-[0.5em] text-slate-400">Select a Prospect</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg">{selectedLead.name[0]}</div>
                      <div>
                        <h2 className="text-lg font-black uppercase italic tracking-tighter text-slate-900">{selectedLead.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[7px] font-black uppercase text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">GHL Contact</span>
                          <div className="h-3 w-px bg-slate-200 mx-1"></div>
                          <div className="flex items-center gap-2">
                             <span className="flex items-center gap-1 text-[7px] font-black uppercase bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100">
                               <Calendar size={10} className="text-blue-500" /> Scheduled: {currentDayStats.scheduled || 0}
                             </span>
                             <span className="flex items-center gap-1 text-[7px] font-black uppercase bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-100">
                               <CheckCircle size={10} className="text-green-500" /> Showed: {currentDayStats.showed || 0}
                             </span>
                             <span className="flex items-center gap-1 text-[7px] font-black uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                               <DollarSign size={10} className="text-emerald-600" /> Closes: {currentDayStats.closes || 0}
                             </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                        <Target size={14} className="text-blue-600" /> Daily Funnel Logging
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {KPI_GROUPS.FUNNEL.map(kpi => (
                          <div key={kpi.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <kpi.icon size={14} className={kpi.color} />
                              <span className="font-black uppercase text-[9px] text-slate-600">{kpi.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button onClick={() => updateMetric(kpi.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-xl font-bold shadow-sm">-</button>
                              <span className="w-6 text-center font-black text-blue-600 text-sm">
                                {currentDayStats[kpi.id] || 0}
                              </span>
                              <button onClick={() => updateMetric(kpi.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-xl font-bold shadow-sm">+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
                       <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                         <DollarSign size={14} className="text-emerald-400" /> Transaction Quick-Entry
                       </h2>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                          <div className="space-y-2">
                             <label className="text-[8px] font-black uppercase text-slate-500">Select Product</label>
                             <div className="relative">
                               <select
                                 className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-[10px] font-black outline-none appearance-none cursor-pointer"
                                 value={transaction.product}
                                 onChange={e => setTransaction({...transaction, product: e.target.value})}
                               >
                                 <option value="">Choose Package</option>
                                 {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>)}
                               </select>
                               <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={14} />
                             </div>
                          </div>

                          <div className="space-y-2">
                             <label className="text-[8px] font-black uppercase text-slate-500">Cash Collected</label>
                             <div className="flex items-center bg-slate-800 rounded-2xl px-4 py-4 border border-slate-700">
                               <DollarSign size={16} className="text-emerald-400" />
                               <input
                                 type="number"
                                 className="bg-transparent outline-none w-full font-black text-sm text-white px-2 placeholder:text-slate-700"
                                 placeholder="0.00"
                                 value={transaction.cash}
                                 onChange={e => setTransaction({...transaction, cash: e.target.value})}
                               />
                             </div>
                          </div>

                          <button
                            onClick={handleClose}
                            disabled={!transaction.product || !transaction.cash}
                            className="w-full bg-blue-600 disabled:bg-slate-800 disabled:text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-all h-[54px]"
                          >
                            Submit Close
                          </button>
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
            <div className="max-w-full space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Dashboard</h1>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-2">Core Performance Matrix — Current Month</p>
                </div>
                <div className="flex bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm items-center gap-6">
                  <div className="text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Monthly Rev</p>
                    <p className="text-sm font-black text-slate-900">${monthDates.reduce((acc, d) => acc + (dailyStats[`${d}_${currentRep}`]?.metrics?.total_revenue || 0), 0).toLocaleString()}</p>
                  </div>
                  <div className="h-8 w-px bg-slate-100"></div>
                  <div className="text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Monthly Cash</p>
                    <p className="text-sm font-black text-emerald-600">${monthDates.reduce((acc, d) => acc + (dailyStats[`${d}_${currentRep}`]?.metrics?.total_collected || 0), 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div ref={scrollContainerRef} className="overflow-x-auto custom-scrollbar">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-900">
                        <th className="p-5 min-w-[240px] sticky left-0 z-30 bg-slate-900 border-b border-white/5 font-black uppercase text-white text-[10px] text-left">Metric Breakdown</th>
                        {monthDates.map(date => {
                          const isToday = date === todayDateStr;
                          return (
                            <th
                              key={date}
                              ref={isToday ? todayRef : null}
                              className={`p-4 min-w-[85px] border-b border-white/5 text-center font-black text-[9px] ${isToday ? 'bg-blue-600 text-white shadow-xl relative z-10' : 'text-slate-500'}`}
                            >
                              {new Date(date).getDate()}
                              {isToday && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-[6px] font-black uppercase text-blue-300">Today</div>}
                            </th>
                          );
                        })}
                        <th className="p-4 min-w-[120px] bg-slate-800 text-white text-[10px] font-black uppercase text-center border-b border-white/5">MTD Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-slate-50/50"><td className="p-3 px-5 font-black uppercase text-[8px] text-slate-400 tracking-widest sticky left-0 bg-slate-50 z-20" colSpan={monthDates.length + 2}>Sales Funnel Activity</td></tr>
                      {KPI_GROUPS.FUNNEL.map(kpi => (
                        <tr key={kpi.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                          <td className="p-4 px-6 sticky left-0 bg-white z-20 border-r border-slate-100 flex items-center gap-3">
                             <kpi.icon size={12} className={kpi.color} />
                             <span className="font-black uppercase text-[9px] text-slate-700 group-hover:text-blue-600">{kpi.label}</span>
                          </td>
                          {monthDates.map(date => {
                            const val = dailyStats[`${date}_${currentRep}`]?.metrics?.[kpi.id] || 0;
                            const isToday = date === todayDateStr;
                            return (
                              <td
                                key={date}
                                className={`p-4 text-center font-bold border-r border-slate-50 ${isToday ? 'bg-blue-50/30 text-blue-700' : 'text-slate-500'}`}
                              >
                                {val || '-'}
                              </td>
                            );
                          })}
                          <td className="p-4 text-center font-black bg-slate-50 text-slate-900">{monthDates.reduce((acc, d) => acc + (dailyStats[`${d}_${currentRep}`]?.metrics?.[kpi.id] || 0), 0)}</td>
                        </tr>
                      ))}

                      <tr className="bg-blue-900/90"><td className="p-3 px-5 font-black uppercase text-[8px] text-white/50 tracking-widest sticky left-0 bg-blue-900 z-20" colSpan={monthDates.length + 2}>Efficiency Ratios</td></tr>
                      {KPI_GROUPS.EFFICIENCY.map(ratio => (
                        <tr key={ratio.id} className="border-b border-slate-100 bg-blue-50/20 group">
                          <td className="p-4 px-6 sticky left-0 bg-blue-50/30 z-20 border-r border-blue-100 flex items-center gap-3">
                             <BarChart3 size={12} className="text-blue-500" />
                             <span className="font-black uppercase text-[9px] text-blue-900">{ratio.label}</span>
                          </td>
                          {monthDates.map(date => {
                            const val = calculateMetric(date, currentRep, ratio.id);
                            const isToday = date === todayDateStr;
                            return (
                              <td
                                key={date}
                                className={`p-4 text-center font-black border-r border-blue-50 italic text-[9px] ${isToday ? 'bg-blue-600 text-white' : 'text-blue-600'}`}
                              >
                                {val}
                              </td>
                            );
                          })}
                          <td className="p-4 text-center font-black bg-blue-100 text-blue-900 italic">AVG</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}
