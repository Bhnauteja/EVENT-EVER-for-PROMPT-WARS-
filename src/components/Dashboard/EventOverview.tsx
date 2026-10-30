import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  DollarSign,
  Users,
  CheckCircle2,
  AlertTriangle,
  Store,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  MapPin,
  Megaphone,
  Plus
} from 'lucide-react';
import {
  EventDetails,
  ScheduleItem,
  ExpenseItem,
  Vendor,
  EventTask,
  Guest,
  Announcement,
  RiskAlert
} from '../../types';
import { BudgetCalculator } from '../../services/budgetCalculator';
import { RiskAlertsBanner } from './RiskAlertsBanner';

interface EventOverviewProps {
  event: EventDetails;
  schedules: ScheduleItem[];
  expenses: ExpenseItem[];
  vendors: Vendor[];
  tasks: EventTask[];
  guests: Guest[];
  announcements: Announcement[];
  riskAlerts: RiskAlert[];
  onNavigateTab: (tab: string) => void;
  onOpenCreateTask?: () => void;
  onOpenCreateExpense?: () => void;
}

export const EventOverview: React.FC<EventOverviewProps> = ({
  event,
  schedules,
  expenses,
  vendors,
  tasks,
  guests,
  announcements,
  riskAlerts,
  onNavigateTab,
}) => {
  // Live Countdown state
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; isPast: boolean }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(event.startDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, isPast: false });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [event.startDate]);

  // Deterministic budget calculations
  const budgetSummary = BudgetCalculator.calculateSummary(expenses, event.totalPlannedBudget);

  // Guest calculations
  const totalGuests = guests.length;
  const attendingGuests = guests.filter(g => g.rsvpStatus === 'attending');
  const attendingCount = attendingGuests.reduce((sum, g) => sum + 1 + (g.plusOneCount || 0), 0);
  const pendingCount = guests.filter(g => g.rsvpStatus === 'awaiting' || g.rsvpStatus === 'tentative').length;
  const declinedCount = guests.filter(g => g.rsvpStatus === 'declined').length;
  const rsvpRate = totalGuests > 0 ? Math.round(((totalGuests - pendingCount) / totalGuests) * 100) : 0;

  // Task calculations
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const overdueTasksCount = tasks.filter(t => {
    if (t.status === 'completed' || !t.deadline) return false;
    return new Date(t.deadline) < new Date();
  }).length;

  // Vendors
  const confirmedVendors = vendors.filter(v => v.bookingStatus === 'confirmed');
  const unpaidVendorsCount = vendors.filter(v => v.bookingStatus === 'confirmed' && v.paymentStatus !== 'paid').length;

  // Upcoming 3 schedule items
  const upcomingSchedules = [...schedules].slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Risk Alerts Banner */}
      <RiskAlertsBanner alerts={riskAlerts} onNavigateToTab={onNavigateTab} />

      {/* Hero Event Header & Countdown */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {event.type}
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                event.isPublished 
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-700/50 text-slate-400 border-slate-600/50'
              }`}>
                {event.isPublished ? '● Published to Guests' : '○ Private Draft'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 font-['Outfit'] tracking-tight">
              {event.name}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl line-clamp-2">
              {event.description || 'No description provided.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>
                  {new Date(event.startDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>
                  {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({event.timezone})
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4 text-rose-400" />
                <span className="truncate max-w-[220px]">{event.venueName}</span>
              </div>
            </div>
          </div>

          {/* Countdown Clock */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shrink-0 shadow-lg">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
              {timeLeft.isPast ? 'Event Concluded' : 'Event Countdown'}
            </div>
            {timeLeft.isPast ? (
              <div className="text-center py-2 text-emerald-400 font-semibold text-sm">
                Event is Completed or In Progress
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-center">
                <div className="bg-slate-800/90 rounded-lg px-2.5 py-1.5 min-w-[50px]">
                  <div className="text-xl font-extrabold text-white font-mono">{timeLeft.days}</div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400">Days</div>
                </div>
                <span className="text-slate-600 font-bold">:</span>
                <div className="bg-slate-800/90 rounded-lg px-2.5 py-1.5 min-w-[50px]">
                  <div className="text-xl font-extrabold text-white font-mono">{String(timeLeft.hours).padStart(2, '0')}</div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400">Hours</div>
                </div>
                <span className="text-slate-600 font-bold">:</span>
                <div className="bg-slate-800/90 rounded-lg px-2.5 py-1.5 min-w-[50px]">
                  <div className="text-xl font-extrabold text-white font-mono">{String(timeLeft.minutes).padStart(2, '0')}</div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400">Mins</div>
                </div>
                <span className="text-slate-600 font-bold">:</span>
                <div className="bg-slate-800/90 rounded-lg px-2.5 py-1.5 min-w-[50px]">
                  <div className="text-xl font-extrabold text-indigo-400 font-mono">{String(timeLeft.seconds).padStart(2, '0')}</div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400">Secs</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Budget Card */}
        <div 
          onClick={() => onNavigateTab('budget')}
          className="glass-panel glass-panel-hover rounded-xl p-4 cursor-pointer relative"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Financial Overview</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white font-['Outfit']">
              {event.currency} {budgetSummary.projectedFinalCost.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-slate-400">Planned: {event.currency} {event.totalPlannedBudget.toLocaleString()}</span>
              <span className={`font-semibold ${budgetSummary.budgetVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {budgetSummary.budgetVariance >= 0 ? `+${event.currency} ${budgetSummary.budgetVariance.toLocaleString()}` : `-${event.currency} ${Math.abs(budgetSummary.budgetVariance).toLocaleString()}`}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  budgetSummary.projectedFinalCost > event.totalPlannedBudget ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, budgetSummary.burnPercentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Guest & RSVP Card */}
        <div 
          onClick={() => onNavigateTab('guests')}
          className="glass-panel glass-panel-hover rounded-xl p-4 cursor-pointer relative"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Guest RSVPs</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white font-['Outfit']">
              {attendingCount} <span className="text-xs font-normal text-slate-400">confirmed / {event.estimatedGuests} planned</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1 text-slate-400">
              <span>{pendingCount} Pending</span>
              <span>{declinedCount} Declined</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, rsvpRate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Task Readiness Card */}
        <div 
          onClick={() => onNavigateTab('tasks')}
          className="glass-panel glass-panel-hover rounded-xl p-4 cursor-pointer relative"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tasks & Checklist</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white font-['Outfit']">
              {completedTasks} / {tasks.length} <span className="text-xs font-normal text-slate-400">completed</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-slate-400">{taskProgress}% complete</span>
              {overdueTasksCount > 0 && (
                <span className="text-rose-400 font-semibold">{overdueTasksCount} overdue</span>
              )}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${taskProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Vendor Coordination Card */}
        <div 
          onClick={() => onNavigateTab('vendors')}
          className="glass-panel glass-panel-hover rounded-xl p-4 cursor-pointer relative"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vendor Contracts</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white font-['Outfit']">
              {confirmedVendors.length} <span className="text-xs font-normal text-slate-400">confirmed</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1 text-slate-400">
              <span>{vendors.length} total vendors</span>
              <span className={unpaidVendorsCount > 0 ? 'text-amber-400 font-medium' : 'text-emerald-400'}>
                {unpaidVendorsCount > 0 ? `${unpaidVendorsCount} balance due` : 'All paid'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="h-full bg-cyan-500 rounded-full transition-all"
                style={{ width: `${vendors.length > 0 ? Math.round((confirmedVendors.length / vendors.length) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Upcoming Schedule & Quick Action Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Timeline Highlights */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <h2 className="text-base font-bold text-white font-['Outfit']">
                Timeline Highlights ({schedules.length} Items Scheduled)
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('timeline')}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
            >
              <span>Full Schedule</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {schedules.length === 0 ? (
            <div className="text-center py-8 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No schedule items created yet.</p>
              <button
                onClick={() => onNavigateTab('planner')}
                className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium inline-flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Schedule with AI</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSchedules.map((item, idx) => (
                <div 
                  key={item.id}
                  className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-between hover:border-slate-700 transition"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="px-2.5 py-1.5 bg-slate-800 rounded-lg text-xs font-mono font-bold text-indigo-300 shrink-0">
                      {item.startTime}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-200 truncate">{item.title}</div>
                      <div className="text-xs text-slate-400 truncate">
                        📍 {item.location} {item.responsiblePerson ? `• Lead: ${item.responsiblePerson}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center space-x-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.endTime}
                    </span>
                    {item.isGuestVisible ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-medium border border-emerald-500/20">
                        Public
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded font-medium">
                        Internal
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Announcements */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Megaphone className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white font-['Outfit']">Recent Guest Announcements</h3>
              </div>
              <button
                onClick={() => onNavigateTab('announcements')}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {announcements.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No announcements published yet.</p>
            ) : (
              <div className="space-y-2">
                {announcements.slice(0, 2).map(ann => (
                  <div key={ann.id} className="p-2.5 bg-slate-900/40 border border-slate-800 rounded-lg text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{ann.title}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-1 line-clamp-1">{ann.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Quick Actions & What Needs Attention */}
        <div className="space-y-4">
          {/* Quick Actions Panel */}
          <div className="glass-panel rounded-2xl p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Coordinator Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onNavigateTab('planner')}
                className="p-3 bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/20 hover:border-purple-500/40 rounded-xl text-left transition group"
              >
                <Sparkles className="w-4 h-4 text-purple-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-purple-200">AI Event Architect</div>
                <div className="text-[10px] text-purple-400/80 mt-0.5">Generate or refine plan</div>
              </button>

              <button
                onClick={() => onNavigateTab('communications')}
                className="p-3 bg-green-950/20 hover:bg-green-950/40 border border-green-500/20 hover:border-green-500/40 rounded-xl text-left transition group"
              >
                <Users className="w-4 h-4 text-green-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-green-200">WhatsApp Engine</div>
                <div className="text-[10px] text-green-400/80 mt-0.5">Send personalized RSVPs</div>
              </button>

              <button
                onClick={() => onNavigateTab('budget')}
                className="p-3 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-left transition group"
              >
                <DollarSign className="w-4 h-4 text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-emerald-200">What-If Simulator</div>
                <div className="text-[10px] text-emerald-400/80 mt-0.5">Test guest & cost changes</div>
              </button>

              <button
                onClick={() => onNavigateTab('tasks')}
                className="p-3 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/20 hover:border-amber-500/40 rounded-xl text-left transition group"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-amber-200">Manage Tasks</div>
                <div className="text-[10px] text-amber-400/80 mt-0.5">Audit upcoming deadlines</div>
              </button>
            </div>
          </div>

          {/* Storage & Persistence Status Badge */}
          <div className="glass-panel rounded-2xl p-4 border-slate-800 text-xs text-slate-400">
            <div className="flex items-center space-x-2 text-slate-300 font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Data Persistence Status</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Active Browser Storage: Fully persistent locally with real relational schemas. Ready for Supabase PostgreSQL connection in Settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
