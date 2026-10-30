import React from 'react';
import { AlertTriangle, Clock, DollarSign, Users, Info, ChevronRight } from 'lucide-react';
import { RiskAlert } from '../../types';

interface RiskAlertsBannerProps {
  alerts: RiskAlert[];
  onNavigateToTab?: (tab: string) => void;
}

export const RiskAlertsBanner: React.FC<RiskAlertsBannerProps> = ({ alerts, onNavigateToTab }) => {
  if (alerts.length === 0) return null;

  const getIcon = (type: RiskAlert['type']) => {
    switch (type) {
      case 'schedule_overlap':
        return <Clock className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'budget_deficit':
        return <DollarSign className="w-5 h-5 text-rose-400 shrink-0" />;
      case 'rsvp_low':
        return <Users className="w-5 h-5 text-indigo-400 shrink-0" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
    }
  };

  const getTargetTab = (type: RiskAlert['type']): string => {
    switch (type) {
      case 'schedule_overlap':
        return 'timeline';
      case 'budget_deficit':
        return 'budget';
      case 'overdue_task':
        return 'tasks';
      case 'unpaid_vendor':
        return 'vendors';
      case 'rsvp_low':
        return 'guests';
      default:
        return 'dashboard';
    }
  };

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Active Event Readiness & Risk Alerts ({alerts.length})
          </h3>
        </div>
        <span className="text-[11px] text-slate-500">Live system audit based on stored records</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {alerts.map(alert => {
          const isHigh = alert.severity === 'high';
          const targetTab = getTargetTab(alert.type);

          return (
            <div
              key={alert.id}
              className={`p-3.5 rounded-xl border flex items-start space-x-3 transition-all ${
                isHigh
                  ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                  : 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
              }`}
            >
              <div className="mt-0.5">{getIcon(alert.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-100 truncate">{alert.title}</h4>
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      isHigh ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{alert.description}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-400 italic font-mono text-[11px]">
                    Action: {alert.actionRecommendation}
                  </span>
                  {onNavigateToTab && (
                    <button
                      onClick={() => onNavigateToTab(targetTab)}
                      className="inline-flex items-center space-x-1 font-semibold text-indigo-400 hover:text-indigo-300 shrink-0 ml-2"
                    >
                      <span>Fix</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
