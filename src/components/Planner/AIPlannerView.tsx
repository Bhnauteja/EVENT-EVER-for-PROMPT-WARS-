import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  DollarSign,
  Clock,
  CheckSquare,
  Store,
  ShieldAlert,
  ArrowRight,
  Check,
  AlertCircle,
  HelpCircle,
  Layers,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import {
  EventDetails,
  AIPeriodPlan,
  AIPromptPlanRequest,
  ScheduleItem,
  ExpenseItem,
  EventTask
} from '../../types';
import { AIPlannerService } from '../../services/aiPlanner';
import { storage } from '../../services/storage';

interface AIPlannerViewProps {
  event: EventDetails;
  onApplyPlanSuccess?: () => void;
}

export const AIPlannerView: React.FC<AIPlannerViewProps> = ({ event, onApplyPlanSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<AIPeriodPlan | null>(null);
  const [activePlanTab, setActivePlanTab] = useState<'timeline' | 'budget' | 'tasks' | 'vendors' | 'savings' | 'risks'>('timeline');

  // Input adjustments
  const [guestCount, setGuestCount] = useState(event.estimatedGuests);
  const [totalBudget, setTotalBudget] = useState(event.totalPlannedBudget);
  const [specialInstructions, setSpecialInstructions] = useState(event.specialInstructions || '');

  // Selection state for granular review & apply
  const [selectedTimelineIndices, setSelectedTimelineIndices] = useState<Set<number>>(new Set());
  const [selectedBudgetIndices, setSelectedBudgetIndices] = useState<Set<number>>(new Set());
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<Set<number>>(new Set());
  const [applyStatusMessage, setApplyStatusMessage] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setApplyStatusMessage(null);
    try {
      const request: AIPromptPlanRequest = {
        eventName: event.name,
        eventType: event.type,
        guestCount,
        totalBudget,
        currency: event.currency,
        eventDate: event.startDate,
        location: event.venueName,
        specialInstructions
      };

      const plan = await AIPlannerService.generatePlan(request);
      setGeneratedPlan(plan);

      // Default all items to selected for review
      setSelectedTimelineIndices(new Set(plan.timelineSuggestions.map((_, i) => i)));
      setSelectedBudgetIndices(new Set(plan.budgetAllocations.map((_, i) => i)));
      setSelectedTaskIndices(new Set(plan.taskChecklist.map((_, i) => i)));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectTimeline = (idx: number) => {
    const next = new Set(selectedTimelineIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedTimelineIndices(next);
  };

  const toggleSelectBudget = (idx: number) => {
    const next = new Set(selectedBudgetIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedBudgetIndices(next);
  };

  const toggleSelectTask = (idx: number) => {
    const next = new Set(selectedTaskIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedTaskIndices(next);
  };

  const handleApplySelected = () => {
    if (!generatedPlan) return;

    let appliedCount = 0;

    // 1. Merge selected schedule items
    if (selectedTimelineIndices.size > 0) {
      const currentSchedules = storage.getSchedules(event.id);
      let orderIndex = currentSchedules.length;
      const newSchedules: ScheduleItem[] = [];

      generatedPlan.timelineSuggestions.forEach((item, idx) => {
        if (selectedTimelineIndices.has(idx)) {
          newSchedules.push({
            id: 'sch-' + Date.now() + '-' + idx,
            eventId: event.id,
            title: item.title,
            description: item.description,
            startTime: item.startTime,
            endTime: item.endTime,
            location: item.location || event.venueName,
            status: 'scheduled',
            isGuestVisible: item.isGuestVisible,
            orderIndex: orderIndex++
          });
          appliedCount++;
        }
      });
      storage.saveBulkSchedules(newSchedules);
    }

    // 2. Merge selected budget items
    if (selectedBudgetIndices.size > 0) {
      const newExpenses: ExpenseItem[] = [];
      generatedPlan.budgetAllocations.forEach((item, idx) => {
        if (selectedBudgetIndices.has(idx)) {
          newExpenses.push({
            id: 'exp-' + Date.now() + '-' + idx,
            eventId: event.id,
            title: item.title,
            category: item.category,
            estimatedCost: item.estimatedCost,
            quotedCost: 0,
            committedCost: 0,
            paidAmount: 0,
            actualCost: 0,
            status: 'unpaid',
            commitmentLevel: 'estimated',
            notes: item.notes,
            createdAt: new Date().toISOString()
          });
          appliedCount++;
        }
      });
      storage.saveBulkExpenses(newExpenses);
    }

    // 3. Merge selected task checklist items
    if (selectedTaskIndices.size > 0) {
      const newTasks: EventTask[] = [];
      const eventDate = new Date(event.startDate);

      generatedPlan.taskChecklist.forEach((item, idx) => {
        if (selectedTaskIndices.has(idx)) {
          // Compute target deadline date
          const targetDeadline = new Date(eventDate);
          targetDeadline.setDate(targetDeadline.getDate() - item.deadlineDaysBefore);

          newTasks.push({
            id: 'task-' + Date.now() + '-' + idx,
            eventId: event.id,
            title: item.title,
            description: item.description,
            category: item.category,
            priority: item.priority,
            status: 'pending',
            deadline: targetDeadline.toISOString().split('T')[0],
            createdAt: new Date().toISOString()
          });
          appliedCount++;
        }
      });
      storage.saveBulkTasks(newTasks);
    }

    setApplyStatusMessage(`Successfully converted and applied ${appliedCount} AI planning records into your database!`);
    if (onApplyPlanSuccess) {
      onApplyPlanSuccess();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white font-['Outfit']">
                AI Event Architect & Planning Engine
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Generate a comprehensive schedule, deterministic budget allocations, task checklist, and risk plan tailored to <strong className="text-white">{event.name}</strong>. Review each recommendation before safely merging it into your live database.
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-600/30 flex items-center justify-center space-x-2 transition shrink-0 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synthesizing Plan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{generatedPlan ? 'Regenerate Plan' : 'Generate Event Plan'}</span>
              </>
            )}
          </button>
        </div>

        {/* Parameter Customizer Controls */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Target Guest Count</label>
            <input
              type="number"
              value={guestCount}
              onChange={e => setGuestCount(Number(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-medium mb-1">Target Total Budget ({event.currency})</label>
            <input
              type="number"
              value={totalBudget}
              onChange={e => setTotalBudget(Number(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-medium mb-1">Special Directives / Themes</label>
            <input
              type="text"
              placeholder="e.g. Vegetarian only, outdoor lawn, tech sponsor focus"
              value={specialInstructions}
              onChange={e => setSpecialInstructions(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
            />
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {applyStatusMessage && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center space-x-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{applyStatusMessage}</span>
        </div>
      )}

      {/* Generated Plan Review Interface */}
      {generatedPlan ? (
        <div className="space-y-4">
          {/* Plan Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 overflow-x-auto gap-2">
            <div className="flex space-x-2">
              <button
                onClick={() => setActivePlanTab('timeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activePlanTab === 'timeline'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Schedule ({generatedPlan.timelineSuggestions.length})</span>
              </button>

              <button
                onClick={() => setActivePlanTab('budget')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activePlanTab === 'budget'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Budget ({generatedPlan.budgetAllocations.length})</span>
              </button>

              <button
                onClick={() => setActivePlanTab('tasks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activePlanTab === 'tasks'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Checklist ({generatedPlan.taskChecklist.length})</span>
              </button>

              <button
                onClick={() => setActivePlanTab('savings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activePlanTab === 'savings'
                    ? 'bg-pink-600 text-white'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cost Savings ({generatedPlan.costSavingIdeas.length})</span>
              </button>

              <button
                onClick={() => setActivePlanTab('risks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activePlanTab === 'risks'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Risks & Flags ({generatedPlan.riskAndContingencies.length + generatedPlan.missingInformationFlags.length})</span>
              </button>
            </div>

            {/* Apply Selected Button */}
            <button
              onClick={handleApplySelected}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition shadow-md flex items-center space-x-1.5 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Apply Selected Records</span>
            </button>
          </div>

          {/* TAB 1: TIMELINE */}
          {activePlanTab === 'timeline' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Select the schedule items you want to merge into your editable schedule:</span>
                <span className="font-mono text-indigo-400 font-semibold">
                  {selectedTimelineIndices.size} of {generatedPlan.timelineSuggestions.length} selected
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {generatedPlan.timelineSuggestions.map((item, idx) => {
                  const isChecked = selectedTimelineIndices.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelectTimeline(idx)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start space-x-3 ${
                        isChecked
                          ? 'bg-indigo-950/20 border-indigo-500/40'
                          : 'bg-slate-900/40 border-slate-800 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-slate-800 font-mono text-xs text-indigo-300 font-bold rounded">
                            {item.startTime} - {item.endTime}
                          </span>
                          <span className="text-sm font-bold text-white truncate">{item.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">📍 {item.location}</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{item.description}</p>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                        item.isGuestVisible ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {item.isGuestVisible ? 'Guest Visible' : 'Internal'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BUDGET ALLOCATIONS */}
          {activePlanTab === 'budget' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Select budget allocations to add to your expense records:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {selectedBudgetIndices.size} of {generatedPlan.budgetAllocations.length} selected
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {generatedPlan.budgetAllocations.map((item, idx) => {
                  const isChecked = selectedBudgetIndices.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelectBudget(idx)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start space-x-3 ${
                        isChecked
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-slate-900/40 border-slate-800 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            {item.category}
                          </span>
                          <span className="text-sm font-extrabold text-white font-mono">
                            {event.currency} {item.estimatedCost.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-slate-200 mt-1">{item.title}</div>
                        <p className="text-xs text-slate-400 mt-0.5 italic">{item.notes}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: TASKS */}
          {activePlanTab === 'tasks' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Select task checklist items to merge into your task management board:</span>
                <span className="font-mono text-amber-400 font-semibold">
                  {selectedTaskIndices.size} of {generatedPlan.taskChecklist.length} selected
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {generatedPlan.taskChecklist.map((item, idx) => {
                  const isChecked = selectedTaskIndices.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelectTask(idx)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start space-x-3 ${
                        isChecked
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : 'bg-slate-900/40 border-slate-800 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-800 text-amber-600 focus:ring-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                            {item.category}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                            item.priority === 'urgent' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {item.priority}
                          </span>
                          <span className="text-xs text-slate-500">
                            Due ~{item.deadlineDaysBefore} days before event
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-slate-100 mt-1">{item.title}</div>
                        <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SAVINGS IDEAS */}
          {activePlanTab === 'savings' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Actionable cost-saving opportunities identified by the planning engine:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {generatedPlan.costSavingIdeas.map((idea, idx) => (
                  <div key={idx} className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-pink-400">
                        {idea.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Save ~{event.currency} {idea.potentialSavings.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-100">{idea.title}</div>
                    <p className="text-xs text-slate-400 leading-relaxed font-mono text-[11px]">
                      Trade-off: {idea.tradeOff}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: RISKS & FLAGS */}
          {activePlanTab === 'risks' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">
                  Potential Contingency Risks
                </h4>
                <div className="space-y-2">
                  {generatedPlan.riskAndContingencies.map((risk, idx) => (
                    <div key={idx} className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100">{risk.risk}</span>
                        <span className="uppercase text-[10px] font-bold text-rose-400">{risk.severity}</span>
                      </div>
                      <p className="text-slate-300">Mitigation: {risk.mitigation}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                  Missing Information Flags (Requires Organizer Confirmation)
                </h4>
                <div className="space-y-1.5">
                  {generatedPlan.missingInformationFlags.map((flag, idx) => (
                    <div key={idx} className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs text-amber-200 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="glass-panel rounded-2xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4 text-purple-400">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white font-['Outfit']">
            No Active AI Plan Generated Yet
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
            Click <strong>Generate Event Plan</strong> above to analyze your event type, guest count, and budget. Our planner creates structured schedules, tasks, and budgets with zero guesswork.
          </p>
        </div>
      )}
    </div>
  );
};
