"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DEMO_ALERTS, DEMO_ANOMALIES } from "@/lib/data";
import { isDemoMode } from "@/lib/data/data-provider";
import { ALERT_TYPE_CONFIG, filterAlerts, type AlertFilter } from "@/lib/demo-alerts";
import { ANOMALY_TYPE_CONFIG, SEVERITY_CONFIG, type AnomalyResult } from "@/lib/anomaly-detection";
import { useDashboardData } from "@/hooks/useDashboardData";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Clock, AlertTriangle, TrendingUp, FileQuestion, Sparkles,
  Eye, X, ExternalLink, Bell, Settings2, Search, ChevronDown, ChevronUp,
  Lightbulb, Calendar, Check, CheckCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

const ALERT_ICONS: Record<string, typeof Clock> = {
  due_soon: Clock,
  overdue: AlertTriangle,
  unusual_amount: TrendingUp,
  missing_bill: FileQuestion,
  new_parsed: Sparkles,
};

const ALERT_LEFT_BORDERS: Record<string, string> = {
  due_soon: "border-l-amber-400",
  overdue: "border-l-rose-500",
  unusual_amount: "border-l-orange-400",
  missing_bill: "border-l-blue-400",
  new_parsed: "border-l-teal-400",
};

type ExtendedFilter = AlertFilter | 'anomalies';

const FILTER_TABS: { key: ExtendedFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'anomalies', label: 'Anomalies' },
  { key: 'insights', label: 'Insights' },
  { key: 'activity', label: 'Activity' },
];

export default function AlertsPage() {
  return (
    <Suspense>
      <AlertsPageContent />
    </Suspense>
  );
}

function AlertsPageContent() {
  const searchParams = useSearchParams();
  const { anomalies: dashboardAnomalies, isDemo, refresh } = useDashboardData();
  const [alerts, setAlerts] = useState(isDemo ? DEMO_ALERTS : []);
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  const initialFilter = (searchParams.get('filter') as ExtendedFilter) || 'all';
  const [filter, setFilter] = useState<ExtendedFilter>(
    FILTER_TABS.some(t => t.key === initialFilter) ? initialFilter : 'all'
  );
  const [showSettings, setShowSettings] = useState(false);
  const [expandedAnomaly, setExpandedAnomaly] = useState<string | null>(null);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    due_soon: true, overdue: true, unusual_amount: true,
    missing_bill: true, new_parsed: true, dueSoonDays: 3, unusualThreshold: 30,
  });

  // Sync anomalies from dashboard data
  useEffect(() => {
    if (isDemo) {
      setAnomalies(DEMO_ANOMALIES);
    } else {
      setAnomalies(dashboardAnomalies);
    }
  }, [dashboardAnomalies, isDemo]);

  const filtered = filter === 'anomalies' ? [] : filterAlerts(alerts, filter === 'all' ? 'all' : filter as AlertFilter);
  const filteredAnomalies = filter === 'anomalies' || filter === 'all' ? anomalies : [];
  const unreadCount = alerts.filter(a => !a.read).length + anomalies.filter(a => a.status === 'new').length;
  const urgentUnread = alerts.filter(a => !a.read && (a.type === 'overdue' || a.type === 'due_soon')).length;

  function getFilterCount(tab: ExtendedFilter): number {
    if (tab === 'anomalies') return anomalies.length;
    if (tab === 'all') return filterAlerts(alerts, 'all').length + anomalies.length;
    return filterAlerts(alerts, tab as AlertFilter).length;
  }

  function markRead(id: string) { setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a)); }
  function dismiss(id: string) { setAlerts(prev => prev.filter(a => a.id !== id)); }
  
  async function updateAnomalyStatus(id: string, status: AnomalyResult['status']) {
    // Update local state immediately
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    
    // Persist to database if not in demo mode
    if (!isDemo) {
      try {
        const supabase = createClient();
        if (supabase) {
          await supabase
            .from('anomaly_logs')
            .update({ 
              status, 
              resolved_at: status === 'resolved' ? new Date().toISOString() : null 
            })
            .eq('id', id);
        }
      } catch (err) {
        console.error('Failed to update anomaly status:', err);
      }
    }
  }
  
  async function dismissAnomaly(id: string) {
    // Update local state immediately
    setAnomalies(prev => prev.filter(a => a.id !== id));
    
    // Persist to database if not in demo mode
    if (!isDemo) {
      try {
        const supabase = createClient();
        if (supabase) {
          await supabase
            .from('anomaly_logs')
            .update({ status: 'dismissed' })
            .eq('id', id);
        }
      } catch (err) {
        console.error('Failed to dismiss anomaly:', err);
      }
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  const router = useRouter();

  function markAllRead() {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    setAnomalies(prev => prev.map(a => ({ ...a, status: 'acknowledged' as const })));
  }

  function viewBill(billId: string) {
    router.push(`/dashboard/expenses`);
  }

  const selectClass = "bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200";

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Alerts</h1>
            {unreadCount > 0 && (
              <span className={cn(
                "px-2.5 py-0.5 text-xs font-bold rounded-full",
                urgentUnread > 0 
                  ? "bg-rose-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.3)]" 
                  : "bg-gray-100 text-muted-foreground"
              )}>
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-2 leading-relaxed">Stay on top of your bills and expenses</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 min-h-[40px]"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Mark All Read</span>
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[40px]",
              showSettings
                ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200/60"
                : "bg-white text-foreground border border-gray-200 hover:bg-gray-100"
            )}
            style={{
              boxShadow: showSettings ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.03)',
            }}
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div 
          className="bg-white rounded-2xl p-7 space-y-6 border border-gray-200"
          style={{
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)',
          }}
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Alert Preferences</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(['due_soon', 'overdue', 'unusual_amount', 'missing_bill', 'new_parsed'] as const).map(type => (
              <label key={type} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={settings[type]}
                  onChange={() => setSettings(s => ({ ...s, [type]: !s[type] }))}
                  className="w-4 h-4 rounded border-gray-200 accent-teal-500 transition-all duration-150"
                />
                <span className="text-sm group-hover:text-foreground transition-colors duration-150">{ALERT_TYPE_CONFIG[type].label}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Due soon threshold</label>
              <select className={selectClass} value={settings.dueSoonDays} onChange={e => setSettings(s => ({ ...s, dueSoonDays: +e.target.value }))}>
                {[1, 2, 3, 5, 7].map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Unusual amount threshold</label>
              <select className={selectClass} value={settings.unusualThreshold} onChange={e => setSettings(s => ({ ...s, unusualThreshold: +e.target.value }))}>
                {[10, 20, 30, 40, 50].map(p => <option key={p} value={p}>{p}%</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Notifications</label>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm text-muted-foreground opacity-60">
                  <input type="checkbox" disabled className="w-4 h-4 rounded accent-teal-500" /> Email
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground opacity-60">
                  <input type="checkbox" disabled className="w-4 h-4 rounded accent-teal-500" /> Push
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground/70">Coming soon</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl w-full sm:w-fit overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {FILTER_TABS.map(tab => {
          const count = getFilterCount(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap min-h-[40px]",
                filter === tab.key
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.key === 'anomalies' && <Search className="w-3.5 h-3.5" />}
              {tab.label}
              <span className={cn(
                "text-xs tabular-nums",
                filter === tab.key ? "text-muted-foreground" : "opacity-50"
              )}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Alert + Anomaly List */}
      <div className="space-y-4">
        {/* Anomaly alerts */}
        {filteredAnomalies.map(anomaly => {
          const typeConfig = ANOMALY_TYPE_CONFIG[anomaly.anomaly_type];
          const sevConfig = SEVERITY_CONFIG[anomaly.severity];
          const isExpanded = expandedAnomaly === anomaly.id;

          return (
            <div
              key={anomaly.id}
              onClick={() => { if (anomaly.status === 'new') updateAnomalyStatus(anomaly.id, 'acknowledged'); }}
              className={cn(
                "bg-white rounded-2xl border border-gray-200 border-l-[3px] border-l-violet-500 p-6 transition-all duration-300",
                anomaly.status === 'acknowledged' ? "opacity-70" : "cursor-pointer hover:bg-gray-50/50",
              )}
              style={{
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div className="flex gap-4">
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.06) 100%)',
                  }}
                >
                  <typeConfig.icon className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">{anomaly.message}</h3>
                        {anomaly.status === 'new' && (
                          <span className="w-2 h-2 rounded-full bg-accent shrink-0 shadow-[0_0_6px_rgba(20,184,166,0.5)]" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20 flex items-center gap-1">
                          <Search className="w-2.5 h-2.5" /> AI Detected
                        </span>
                        <span className={cn("text-[10px] font-medium px-2.5 py-0.5 rounded-full", typeConfig.bgColor, typeConfig.color)}>{typeConfig.label}</span>
                        <span className={cn("text-[10px] font-medium px-2.5 py-0.5 rounded-full", sevConfig.bgColor, sevConfig.color)}>{sevConfig.label}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(anomaly.detected_at)}</span>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedAnomaly(isExpanded ? null : anomaly.id); }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-3 transition-colors duration-200 font-medium"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {isExpanded ? 'Less' : 'View Details'}
                      </button>
                      {isExpanded && (
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="flex gap-6 text-xs">
                            <div><span className="text-muted-foreground">Current: </span><span className="font-semibold tabular-nums">${anomaly.current_amount.toFixed(2)}</span></div>
                            <div><span className="text-muted-foreground">Expected: </span><span className="font-semibold tabular-nums">${anomaly.expected_amount.toFixed(2)}</span></div>
                            <div><span className="text-muted-foreground">Deviation: </span><span className="font-semibold text-orange-600 tabular-nums">+{anomaly.deviation_percent}%</span></div>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-4 text-xs text-muted-foreground border border-gray-200/60">
                            <p className="font-medium text-foreground mb-1.5 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> Recommendation</p>
                            {anomaly.recommendation}
                          </div>
                          {anomaly.seasonal_context && (
                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
                              <p className="font-medium mb-1.5 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Seasonal Context</p>
                              {anomaly.seasonal_context}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {anomaly.status === 'new' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateAnomalyStatus(anomaly.id, 'acknowledged'); }} 
                          className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 active:scale-95" 
                          title="Acknowledge" 
                          aria-label="Acknowledge anomaly"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); dismissAnomaly(anomaly.id); }} 
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 active:scale-95" 
                        title="Dismiss" 
                        aria-label="Dismiss anomaly"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Regular alerts */}
        {filtered.map(alert => {
          const config = ALERT_TYPE_CONFIG[alert.type];
          const Icon = ALERT_ICONS[alert.type];
          const leftBorder = ALERT_LEFT_BORDERS[alert.type] || "border-l-gray-300";
          const isExpanded = expandedAlert === alert.id;

          const toggleExpand = () => {
            const opening = expandedAlert !== alert.id;
            setExpandedAlert(opening ? alert.id : null);
            if (opening && !alert.read) markRead(alert.id);
          };

          return (
            <div
              key={alert.id}
              onClick={toggleExpand}
              className={cn(
                "bg-white rounded-2xl border border-gray-200 border-l-[3px] p-6 transition-all duration-300 cursor-pointer",
                leftBorder,
                alert.read && !isExpanded && "opacity-60",
                !alert.read && "hover:bg-gray-50/50",
                isExpanded && "ring-1 ring-gray-200",
              )}
              style={{
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div className="flex gap-4">
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", config.bgColor)}>
                  <Icon className={cn("w-5 h-5", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={cn("text-sm font-semibold", !alert.read && "text-foreground")}>{alert.title}</h3>
                        {!alert.read && (
                          <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_rgba(20,184,166,0.5)]" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{alert.description}</p>
                      <div className="flex items-center gap-3 mt-2.5">
                        <span className={cn("text-[10px] font-medium px-2.5 py-0.5 rounded-full", config.bgColor, config.color)}>{config.label}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(alert.created_at)}</span>
                        {!isExpanded && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ChevronDown className="w-3 h-3" /> Details
                          </span>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="mt-4 space-y-3">
                          {alert.property_id && (
                            <div className="bg-gray-50 rounded-xl p-4 text-xs space-y-2 border border-gray-200/60">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Property</span>
                                <span className="font-medium text-gray-700">
                                  {alert.property_id === '1' ? 'Venice Beach Unit' : alert.property_id === '2' ? 'Silver Lake Duplex' : 'Joshua Tree Cabin'}
                                </span>
                              </div>
                              {alert.type === 'due_soon' && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Action Needed</span>
                                  <span className="font-medium text-amber-600">Pay before due date</span>
                                </div>
                              )}
                              {alert.type === 'overdue' && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Action Needed</span>
                                  <span className="font-medium text-rose-600">Pay immediately to avoid late fees</span>
                                </div>
                              )}
                              {alert.type === 'unusual_amount' && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Recommendation</span>
                                  <span className="font-medium text-orange-600">Review for potential issues</span>
                                </div>
                              )}
                              {alert.type === 'missing_bill' && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Recommendation</span>
                                  <span className="font-medium text-blue-600">Check with provider</span>
                                </div>
                              )}
                            </div>
                          )}
                          {alert.type === 'new_parsed' && (
                            <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-4 text-xs text-teal-700">
                              <p className="font-medium mb-1">Parsed Bills Ready</p>
                              <p>Head to your Inbox to review and approve the parsed bills before they&apos;re added to your expenses.</p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            {alert.bill_id && (
                              <button
                                onClick={(e) => { e.stopPropagation(); viewBill(alert.bill_id!); }}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> View Expense
                              </button>
                            )}
                            {alert.type === 'new_parsed' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); router.push('/dashboard/inbox'); }}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Go to Inbox
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); dismiss(alert.id); }}
                              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss(alert.id); }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 active:scale-95 shrink-0"
                      title="Dismiss"
                      aria-label="Dismiss alert"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && filteredAnomalies.length === 0 && (
          <div 
            className="bg-white rounded-2xl p-12 text-center border border-gray-200"
            style={{
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="font-medium">No alerts in this category</p>
            <p className="text-sm text-muted-foreground mt-1.5">You&apos;re all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}
