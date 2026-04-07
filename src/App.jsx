import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  collection,
  increment
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
  DollarSign,
  Zap,
  Target,
  RefreshCw,
  History,
  Trash2,
  ArrowRight,
  Download
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

const GHL_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6ImNYM3hMemxIamk1NEtPbmxwY0tjIiwiY29tcGFueV9pZCI6ImUwWjFBeklOYXFZdFg5bUplMm04IiwidmVyc2lvbiI6MSwiaWF0IjoxNjc3NjQ1MjE5NzU3LCJzdWIiOiJ1c2VyX2lkIn0.8xeP3HX6A62yzENfLuMhYhOCRqK_fr3lLWM7zGIvy7k";
const REPS = ["BreAnna", "Christina"];
const DEFAULT_REP = "Christina";
const REP_STORAGE_KEY = `${appId}_preferred_rep`;

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
    { id: 'fu_booked', label: 'Follow-ups Booked', icon: Phone, color: 'text-indigo-500' },
    { id: 'fu_showed', label: 'Follow up (Showed)', icon: Users, color: 'text-sky-500' },
    { id: 'offers', label: 'Offers', icon: ThumbsUp, color: 'text-blue-600' },
    { id: 'closes', label: 'Sales', icon: DollarSign, color: 'text-emerald-600' },
    { id: 'fu_closes', label: 'Follow-up Sales', icon: CheckCircle, color: 'text-emerald-500' },
    { id: 'resched_req', label: 'Rescheduled Request', icon: RotateCcw, color: 'text-orange-500' },
    { id: 'no_show', label: 'No show Calls', icon: AlertCircle, color: 'text-red-500' },
    { id: 'cancelled', label: 'Cancelled Calls', icon: XCircle, color: 'text-slate-400' },
    { id: 'verbal_yes', label: 'Verbal Yes', icon: Zap, color: 'text-yellow-500' },
  ]
};

const getMetricLabel = (metricId) => KPI_GROUPS.FUNNEL.find(k => k.id === metricId)?.label || metricId;

const getProductNameFromMeta = (meta = {}) => {
  if (meta.productName) return meta.productName;
  if (meta.productId) return PRODUCTS.find(p => p.id === meta.productId)?.name || 'Sale';
  if (typeof meta.revenue === 'number') {
    return PRODUCTS.find(p => p.price === meta.revenue)?.name || 'Sale';
  }
  return 'Sale';
};

const formatActivityMessage = ({ type, rep, meta = {} }) => {
  if (type === 'kpi') {
    const metricLabel = getMetricLabel(meta.metricId);
    const sign = meta.delta > 0 ? '+1' : '-1';
    return `${rep} marked ${metricLabel} (${sign})`;
  }

  if (type === 'sale') {
    const productName = getProductNameFromMeta(meta);
    const collected = Number(meta.collected || 0).toLocaleString();
    const saleLabel = meta.saleMetric === 'fu_closes' ? 'follow-up sale' : 'sale';
    return `${rep} closed ${productName} (${saleLabel}, $${collected} collected)`;
  }

  return meta.message || `${rep} updated this log`;
};

const isValidNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const getInitialRep = () => {
  const fallbackRep = REPS.includes(DEFAULT_REP) ? DEFAULT_REP : REPS[0];

  if (typeof window === 'undefined') return fallbackRep;

  try {
    const savedRep = window.localStorage.getItem(REP_STORAGE_KEY);
    if (savedRep && REPS.includes(savedRep)) return savedRep;
  } catch (err) {
    console.error('Unable to read preferred rep from localStorage', err);
  }

  return fallbackRep;
};

const getCalculatedDashboard = (m = {}) => {
  const safeDiv = (n, d) => (d && d > 0 ? n / d : null);

  const totalShows = (m.showed || 0) + (m.fu_showed || 0);
  const totalCloses = (m.closes || 0) + (m.fu_closes || 0);
  const totalOffers = m.offers || 0;

  return {
    shows: [
      { label: "Show Rate", val: safeDiv(m.showed || 0, m.scheduled || 0) !== null ? safeDiv(m.showed || 0, m.scheduled || 0) * 100 : null, unit: '%' },
      { label: "FU Show Rate", val: safeDiv(m.fu_showed || 0, m.fu_booked || 0) !== null ? safeDiv(m.fu_showed || 0, m.fu_booked || 0) * 100 : null, unit: '%' },
      { label: "Total Show Rate", val: safeDiv(totalShows, (m.scheduled || 0) + (m.fu_booked || 0)) !== null ? safeDiv(totalShows, (m.scheduled || 0) + (m.fu_booked || 0)) * 100 : null, unit: '%' },
      { label: "Show to FU %", val: safeDiv(m.fu_booked || 0, m.showed || 0) !== null ? safeDiv(m.fu_booked || 0, m.showed || 0) * 100 : null, unit: '%' },
    ],
    finance: [
      { label: "Total Revenue", val: m.total_revenue || 0, unit: '$' },
      { label: "Total Collected", val: m.total_collected || 0, unit: '$' },
      { label: "Collection %", val: safeDiv(m.total_collected || 0, m.total_revenue || 0) !== null ? safeDiv(m.total_collected || 0, m.total_revenue || 0) * 100 : null, unit: '%' },
    ],
    efficiency: [
      { label: "Revenue / Call", val: safeDiv(m.total_revenue || 0, totalShows), unit: '$' },
      { label: "Collected / Call", val: safeDiv(m.total_collected || 0, totalShows), unit: '$' },
      { label: "Revenue / Offer", val: safeDiv(m.total_revenue || 0, totalOffers), unit: '$' },
      { label: "Collected / Offer", val: safeDiv(m.total_collected || 0, totalOffers), unit: '$' },
      { label: "Cash / Sched Call", val: safeDiv(m.total_collected || 0, m.scheduled || 0), unit: '$' },
    ],
    closing: [
      { label: "Call Close %", val: safeDiv(totalCloses, totalShows) !== null ? safeDiv(totalCloses, totalShows) * 100 : null, unit: '%' },
      { label: "Offer Close %", val: safeDiv(totalCloses, totalOffers) !== null ? safeDiv(totalCloses, totalOffers) * 100 : null, unit: '%' },
      { label: "Offer Rate %", val: safeDiv(totalOffers, totalShows) !== null ? safeDiv(totalOffers, totalShows) * 100 : null, unit: '%' },
      { label: "FU Close Rate", val: safeDiv(m.fu_closes || 0, m.fu_showed || 0) !== null ? safeDiv(m.fu_closes || 0, m.fu_showed || 0) * 100 : null, unit: '%' },
    ]
  };
};

const getLocalDateKey = (date = new Date()) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getDaysInRange = (startStr, endStr) => {
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  const dates = [];
  let current = new Date(start);
  while (current <= end) {
    dates.push(getLocalDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('logger');
  const [currentRep, setCurrentRep] = useState(() => getInitialRep());
  const [dailyStats, setDailyStats] = useState({});
  const [contactStats, setContactStats] = useState({});
  const [activityLogs, setActivityLogs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [queryText, setQueryText] = useState('');
  const [transaction, setTransaction] = useState({
    product: '',
    cash: '',
    saleType: 'closes'
  });
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => getLocalDateKey());

  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date();
    return getLocalDateKey(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [rangeEnd, setRangeEnd] = useState(() => {
    const d = new Date();
    return getLocalDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  });

  const selectedLead = useMemo(() => leads.find(l => l.id === selectedLeadId), [leads, selectedLeadId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(REP_STORAGE_KEY, currentRep);
    } catch (err) {
      console.error('Unable to persist preferred rep to localStorage', err);
    }
  }, [currentRep]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth error", e);
      }
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
      snapshot.docs.forEach(docItem => {
        stats[docItem.id] = docItem.data();
      });
      setDailyStats(stats);
    }, (err) => console.error("Daily Sync Error:", err));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const contactRef = collection(db, 'artifacts', appId, 'public', 'data', 'contact_stats');
    const unsub = onSnapshot(contactRef, (snapshot) => {
      const stats = {};
      snapshot.docs.forEach(docItem => {
        stats[docItem.id] = docItem.data();
      });
      setContactStats(stats);
    }, (err) => console.error("Contact Sync Error:", err));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'activity_logs');
    const unsub = onSnapshot(logsRef, (snapshot) => {
      const logs = [];
      snapshot.docs.forEach(docItem => {
        logs.push({ id: docItem.id, ...docItem.data() });
      });
      logs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      setActivityLogs(logs);
    }, (err) => console.error("Logs Sync Error:", err));
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
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error("GHL API Failure");

      const data = await response.json();
      setLeads((data.contacts || []).map(c => ({
        id: c.id,
        name: c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed Contact',
        email: c.email || 'No email'
      })));
    } catch (err) {
      console.error("GHL error:", err);
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

  const updateMetric = async (metricId, delta) => {
    if (!user || !selectedLeadId) return;
    setIsSaving(true);

    const dailyId = `${selectedDate}_${currentRep}`;

    try {
      const dailyRef = doc(db, 'artifacts', appId, 'public', 'data', 'daily_stats', dailyId);
      const contactRef = doc(db, 'artifacts', appId, 'public', 'data', 'contact_stats', selectedLeadId);
      const metricLabel = getMetricLabel(metricId);

      await Promise.all([
        setDoc(dailyRef, {
          date: selectedDate,
          rep: currentRep,
          metrics: { [metricId]: increment(delta) }
        }, { merge: true }),
        setDoc(contactRef, {
          metrics: { [metricId]: increment(delta) }
        }, { merge: true }),
        addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activity_logs'), {
          contactId: selectedLeadId,
          contactName: selectedLead?.name || 'Unknown',
          rep: currentRep,
          date: selectedDate,
          message: `${currentRep} marked ${metricLabel} (${delta > 0 ? '+1' : '-1'})`,
          type: 'kpi',
          meta: { metricId, delta, date: selectedDate, rep: currentRep },
          timestamp: new Date().toISOString()
        })
      ]);
    } catch (err) {
      console.error("Metric Error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = async () => {
    if (!transaction.product || !transaction.cash || !selectedLeadId || !user) return;

    setIsSaving(true);

    try {
      const prod = PRODUCTS.find(p => p.id === transaction.product);
      const saleMetric = transaction.saleType || 'closes';
      const dailyId = `${selectedDate}_${currentRep}`;
      const dailyRef = doc(db, 'artifacts', appId, 'public', 'data', 'daily_stats', dailyId);
      const contactRef = doc(db, 'artifacts', appId, 'public', 'data', 'contact_stats', selectedLeadId);

      const payload = {
        metrics: {
          [saleMetric]: increment(1),
          total_revenue: increment(prod?.price || 0),
          total_collected: increment(Number(transaction.cash))
        }
      };

      const meta = {
        productId: prod?.id || '',
        productName: prod?.name || 'Sale',
        revenue: prod?.price || 0,
        collected: Number(transaction.cash),
        saleMetric,
        date: selectedDate,
        rep: currentRep
      };

      await Promise.all([
        setDoc(dailyRef, {
          ...payload,
          date: selectedDate,
          rep: currentRep
        }, { merge: true }),
        setDoc(contactRef, payload, { merge: true }),
        addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activity_logs'), {
          contactId: selectedLeadId,
          contactName: selectedLead?.name || 'Unknown',
          rep: currentRep,
          date: selectedDate,
          message: formatActivityMessage({ type: 'sale', rep: currentRep, meta }),
          type: 'sale',
          meta,
          timestamp: new Date().toISOString()
        })
      ]);

      setTransaction({ product: '', cash: '', saleType: 'closes' });
    } catch (err) {
      console.error("Transaction Error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReassignLog = async (log, nextRep) => {
    if (!user || !log?.id || !log?.meta || !nextRep || nextRep === log.rep) return;

    const fromRep = log.rep;
    const logDate = log.meta.date || log.date;

    if (!fromRep || !logDate) return;

    const confirmed = window.confirm(`Move this entry from ${fromRep} to ${nextRep}? This will update the dashboard totals retroactively.`);
    if (!confirmed) return;

    setIsSaving(true);

    try {
      const oldDailyRef = doc(db, 'artifacts', appId, 'public', 'data', 'daily_stats', `${logDate}_${fromRep}`);
      const newDailyRef = doc(db, 'artifacts', appId, 'public', 'data', 'daily_stats', `${logDate}_${nextRep}`);
      const logRef = doc(db, 'artifacts', appId, 'public', 'data', 'activity_logs', log.id);

      if (log.type === 'kpi') {
        const metricId = log.meta.metricId;
        const delta = Number(log.meta.delta || 0);

        await Promise.all([
          setDoc(oldDailyRef, {
            date: logDate,
            rep: fromRep,
            metrics: { [metricId]: increment(-delta) }
          }, { merge: true }),
          setDoc(newDailyRef, {
            date: logDate,
            rep: nextRep,
            metrics: { [metricId]: increment(delta) }
          }, { merge: true }),
          setDoc(logRef, {
            rep: nextRep,
            message: formatActivityMessage({ type: log.type, rep: nextRep, meta: { ...log.meta, rep: nextRep } }),
            meta: { ...log.meta, rep: nextRep }
          }, { merge: true })
        ]);
      }

      if (log.type === 'sale') {
        const revenue = Number(log.meta.revenue || 0);
        const collected = Number(log.meta.collected || 0);
        const saleMetric = log.meta.saleMetric || 'closes';

        await Promise.all([
          setDoc(oldDailyRef, {
            date: logDate,
            rep: fromRep,
            metrics: {
              [saleMetric]: increment(-1),
              total_revenue: increment(-revenue),
              total_collected: increment(-collected)
            }
          }, { merge: true }),
          setDoc(newDailyRef, {
            date: logDate,
            rep: nextRep,
            metrics: {
              [saleMetric]: increment(1),
              total_revenue: increment(revenue),
              total_collected: increment(collected)
            }
          }, { merge: true }),
          setDoc(logRef, {
            rep: nextRep,
            message: formatActivityMessage({
              type: log.type,
              rep: nextRep,
              meta: { ...log.meta, rep: nextRep }
            }),
            meta: { ...log.meta, rep: nextRep }
          }, { merge: true })
        ]);
      }
    } catch (err) {
      console.error('Reassign Error', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLog = async (log) => {
    if (!log.meta || !user) return;
    if (!window.confirm("Are you sure? This will revert the statistics associated with this log.")) return;

    setIsSaving(true);

    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'activity_logs', log.id));

      const { type, meta, contactId } = log;

      if (type === 'kpi') {
        const { metricId, delta, date, rep } = meta;
        const reverseDelta = delta * -1;
        const dailyId = `${date}_${rep}`;
        const dailyRef = doc(db, 'artifacts', appId, 'public', 'data', 'daily_stats', dailyId);
        const contactRef = doc(db, 'artifacts', appId, 'public', 'data', 'contact_stats', contactId);

        await Promise.all([
          setDoc(dailyRef, { metrics: { [metricId]: increment(reverseDelta) } }, { merge: true }),
          setDoc(contactRef, { metrics: { [metricId]: increment(reverseDelta) } }, { merge: true })
        ]);
      } else if (type === 'sale') {
        const { revenue, collected, date, rep, saleMetric = 'closes' } = meta;
        const dailyId = `${date}_${rep}`;
        const dailyRef = doc(db, 'artifacts', appId, 'public', 'data', 'daily_stats', dailyId);
        const contactRef = doc(db, 'artifacts', appId, 'public', 'data', 'contact_stats', contactId);

        const revertPayload = {
          metrics: {
            [saleMetric]: increment(-1),
            total_revenue: increment(-1 * revenue),
            total_collected: increment(-1 * collected)
          }
        };

        await Promise.all([
          setDoc(dailyRef, revertPayload, { merge: true }),
          setDoc(contactRef, revertPayload, { merge: true })
        ]);
      }
    } catch (e) {
      console.error("Delete Error", e);
    } finally {
      setIsSaving(false);
    }
  };

  const currentRangeDates = useMemo(() => getDaysInRange(rangeStart, rangeEnd), [rangeStart, rangeEnd]);

  const rangeAggregated = useMemo(() => {
    const agg = {};
    currentRangeDates.forEach(date => {
      const dayMetrics = dailyStats[`${date}_${currentRep}`]?.metrics || {};
      Object.entries(dayMetrics).forEach(([k, v]) => {
        agg[k] = (agg[k] || 0) + v;
      });
    });
    return agg;
  }, [dailyStats, currentRep, currentRangeDates]);

  const dashboardCalculations = useMemo(() => getCalculatedDashboard(rangeAggregated), [rangeAggregated]);

  const totalShows = (rangeAggregated.showed || 0) + (rangeAggregated.fu_showed || 0);
  const totalSales = (rangeAggregated.closes || 0) + (rangeAggregated.fu_closes || 0);
  const closeRatio = totalShows > 0 ? (totalSales / totalShows) * 100 : null;

  const downloadCSV = () => {
    const tableRows = [
      ...KPI_GROUPS.FUNNEL,
      { id: 'total_revenue', label: 'Revenue' },
      { id: 'total_collected', label: 'Collected' }
    ];

    let csvContent = "Metric,Total," + currentRangeDates.map(d => d).join(",") + "\n";

    tableRows.forEach(row => {
      let line = `${row.label},`;
      const totalVal = rangeAggregated[row.id] || 0;
      line += `${totalVal},`;
      const dayValues = currentRangeDates.map(d => {
        const dayData = dailyStats[`${d}_${currentRep}`];
        return dayData?.metrics?.[row.id] || 0;
      });
      line += dayValues.join(",");
      csvContent += line + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${currentRep}_Sales_Data_${rangeStart}_to_${rangeEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const MetricBox = ({ label, val, unit }) => {
    let displayValue = '-';

    if (isValidNumber(val)) {
      if (unit === '$') {
        displayValue = `$${Math.round(val).toLocaleString()}`;
      } else if (unit === '%') {
        displayValue = `${val.toFixed(1)}%`;
      } else {
        displayValue = Math.round(val).toLocaleString();
      }
    }

    return (
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</span>
        <span className="text-sm font-black text-slate-900 truncate">{displayValue}</span>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans text-[10px] pt-[40px]">
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-50 shadow-sm shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Activity className="text-blue-600" size={20} />
            <span className="font-black text-slate-900 uppercase tracking-tighter text-base italic hidden sm:inline">Manic Sales</span>
          </div>
          <nav className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('logger')}
              className={`px-5 py-1.5 rounded-lg font-black uppercase text-[9px] transition-all ${activeTab === 'logger' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
            >
              Logger
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-5 py-1.5 rounded-lg font-black uppercase text-[9px] transition-all ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
            >
              Dashboard
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-1">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {REPS.map(rep => (
                <button
                  key={rep}
                  onClick={() => setCurrentRep(rep)}
                  className={`px-4 py-1.5 rounded-lg font-black uppercase text-[9px] ${currentRep === rep ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}
                >
                  {rep}
                </button>
              ))}
            </div>
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Saved as default on this device</span>
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
                  <div
                    key={l.id}
                    onClick={() => setSelectedLeadId(l.id)}
                    className={`px-4 py-3 cursor-pointer border-b border-slate-50 ${selectedLeadId === l.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <p className={`font-black uppercase truncate text-[11px] ${selectedLeadId === l.id ? 'text-blue-700' : 'text-slate-700'}`}>{l.name}</p>
                    <p className="text-[8px] text-slate-400 font-bold truncate italic uppercase">{l.email}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
              {!selectedLead ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <Target size={60} />
                  <p className="mt-4 font-black uppercase tracking-[0.5em]">Select Client</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6 pb-20">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl">
                        {selectedLead.name[0]}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">{selectedLead.name}</h2>
                        <p className="text-slate-400 font-bold uppercase text-[9px]">{selectedLead.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg p-1 pr-3">
                      <div className="bg-white border border-slate-200 rounded-md p-1">
                        <Calendar size={12} className="text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[7px] font-black text-slate-400 uppercase leading-none">Log Date</label>
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="bg-transparent text-[10px] font-black text-slate-700 outline-none p-0 w-24 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-6">
                      <Zap size={12} className="text-blue-600" /> Interaction Points
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {KPI_GROUPS.FUNNEL
                        .filter(kpi => !['closes', 'fu_closes'].includes(kpi.id))
                        .map(kpi => (
                          <div
                            key={kpi.id}
                            className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 group hover:border-blue-200 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${kpi.color.replace('text-', 'bg-')}`}></span>
                              <span className="font-black uppercase text-[8px] text-slate-600 truncate">{kpi.label}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-black text-blue-600">
                                {(contactStats[selectedLeadId]?.metrics?.[kpi.id] || 0)}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => updateMetric(kpi.id, -1)}
                                  className="w-7 h-7 bg-white rounded-lg border border-slate-200 font-bold hover:text-red-500 hover:bg-red-50"
                                  disabled={isSaving}
                                >
                                  -
                                </button>
                                <button
                                  onClick={() => updateMetric(kpi.id, 1)}
                                  className="w-7 h-7 bg-white rounded-lg border border-slate-200 font-bold hover:text-blue-600 hover:bg-blue-50"
                                  disabled={isSaving}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-[32px] p-8 text-white">
                    <h2 className="text-[9px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                      <DollarSign size={14} className="text-emerald-400" /> Closing Action
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-2">
                        <label className="text-[7px] font-black uppercase text-slate-500">Package</label>
                        <select
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-[10px] font-black outline-none"
                          value={transaction.product}
                          onChange={e => setTransaction({ ...transaction, product: e.target.value })}
                        >
                          <option value="">Select...</option>
                          {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[7px] font-black uppercase text-slate-500">Collected</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-[10px] font-black"
                          value={transaction.cash}
                          onChange={e => setTransaction({ ...transaction, cash: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[7px] font-black uppercase text-slate-500">Sale Type</label>
                        <select
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-[10px] font-black outline-none"
                          value={transaction.saleType}
                          onChange={e => setTransaction({ ...transaction, saleType: e.target.value })}
                        >
                          <option value="closes">Sale</option>
                          <option value="fu_closes">Follow-up Sale</option>
                        </select>
                      </div>

                      <button
                        onClick={handleClose}
                        className="bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-900/20"
                        disabled={isSaving}
                      >
                        Record Sale
                      </button>
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <History size={12} className="text-slate-400" /> Recent Log
                      </h3>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">
                        Use the rep dropdown to fix mistakes retroactively
                      </span>
                    </div>

                    <div className="space-y-3">
                      {activityLogs.filter(log => log.contactId === selectedLeadId).map(log => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between gap-4 bg-white border border-slate-100 p-3 rounded-xl group hover:border-slate-200 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-700 break-words">
                              {log.message} <span className="text-slate-400 italic font-normal">({log.date})</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <p className="text-[8px] text-slate-300 uppercase tracking-widest">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </p>
                              <span className="text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                                {log.rep || 'No rep'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={log.rep || REPS[0]}
                              onChange={(e) => handleReassignLog(log, e.target.value)}
                              disabled={isSaving}
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-[9px] font-black uppercase text-slate-600 outline-none"
                              title="Move this entry to another rep"
                            >
                              {REPS.map(rep => (
                                <option key={rep} value={rep}>{rep}</option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleDeleteLog(log)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
            <div className="max-w-6xl mx-auto space-y-8">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h1 className="text-4xl font-black italic tracking-tighter uppercase">Dashboard</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">
                    Custom Range Performance • {currentRep}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={rangeStart}
                        onChange={e => setRangeStart(e.target.value)}
                        className="text-[10px] font-black bg-slate-50 p-1.5 rounded-lg border border-slate-100"
                      />
                      <ArrowRight size={10} className="text-slate-300" />
                      <input
                        type="date"
                        value={rangeEnd}
                        onChange={e => setRangeEnd(e.target.value)}
                        className="text-[10px] font-black bg-slate-50 p-1.5 rounded-lg border border-slate-100"
                      />
                    </div>
                  </div>

                  <button
                    onClick={downloadCSV}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-2xl font-black uppercase text-[9px] hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                  >
                    <Download size={14} />
                    Export CSV
                  </button>
                </div>
              </header>

              <div className="flex gap-4 p-4 bg-blue-600 rounded-3xl text-white shadow-xl">
                <div className="flex-1">
                  <p className="text-[8px] font-black text-blue-200 uppercase">Range Revenue</p>
                  <p className="text-3xl font-black">${(rangeAggregated.total_revenue || 0).toLocaleString()}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black text-blue-200 uppercase">Range Collected</p>
                  <p className="text-3xl font-black">${(rangeAggregated.total_collected || 0).toLocaleString()}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black text-blue-200 uppercase">Close Ratio</p>
                  <p className="text-3xl font-black">
                    {isValidNumber(closeRatio) ? `${Math.round(closeRatio)}%` : '-'}
                  </p>
                </div>
              </div>

              <div className="space-y-10">
                <section>
                  <h3 className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-4">Shows & Attendance</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {dashboardCalculations.shows.map(m => <MetricBox key={m.label} {...m} />)}
                  </div>
                </section>

                <section>
                  <h3 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-4">Closing Performance</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {dashboardCalculations.closing.map(m => <MetricBox key={m.label} {...m} />)}
                  </div>
                </section>

                <section>
                  <h3 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-4">Financials</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {dashboardCalculations.finance.map(m => <MetricBox key={m.label} {...m} />)}
                  </div>
                </section>

                <section>
                  <h3 className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-4">Efficiency</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {dashboardCalculations.efficiency.map(m => <MetricBox key={m.label} {...m} />)}
                  </div>
                </section>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[9px] uppercase tracking-wider">
                        <th className="p-4 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">Metric</th>
                        <th className="p-4 text-center bg-blue-900">Total</th>
                        {currentRangeDates.map(d => (
                          <th key={d} className="p-4 text-center min-w-[70px] border-l border-slate-800">
                            {d.split('-').slice(1).join('/')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...KPI_GROUPS.FUNNEL, { id: 'total_revenue', label: 'Revenue' }, { id: 'total_collected', label: 'Collected' }].map(item => (
                        <tr key={item.id} className="border-b hover:bg-slate-50 transition-colors">
                          <td className="p-4 sticky left-0 bg-white font-black text-slate-700 border-r border-slate-100 uppercase text-[9px]">
                            {item.label}
                          </td>
                          <td className="p-4 text-center font-black text-blue-600 bg-blue-50/50">
                            {item.id.includes('total')
                              ? `$${Math.round(rangeAggregated[item.id] || 0).toLocaleString()}`
                              : (rangeAggregated[item.id] || 0)}
                          </td>
                          {currentRangeDates.map(date => {
                            const dayData = dailyStats[`${date}_${currentRep}`];
                            const val = dayData?.metrics?.[item.id] || 0;
                            return (
                              <td key={date} className="p-4 text-center text-slate-400 font-bold border-l border-slate-50">
                                {item.id.includes('total') ? `$${Math.round(val).toLocaleString()}` : val}
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
          </div>
        )}
      </main>
    </div>
  );
}