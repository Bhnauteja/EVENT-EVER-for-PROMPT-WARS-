import React, { useState } from 'react';
import {
  Sliders,
  DollarSign,
  Users,
  RotateCcw,
  Check,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { EventDetails, ExpenseItem, ExpenseCategory } from '../../types';
import { BudgetCalculator, ALL_EXPENSE_CATEGORIES } from '../../services/budgetCalculator';
import { storage } from '../../services/storage';

interface WhatIfSimulatorProps {
  event: EventDetails;
  expenses: ExpenseItem[];
  onApplyChanges: () => void;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({ event, expenses, onApplyChanges }) => {
  // Simulator state (isolated from actual records)
  const [guestAdjustment, setGuestAdjustment] = useState<number>(0);
  const [budgetAdjustment, setBudgetAdjustment] = useState<number>(0);
  const [categoryMultipliers, setCategoryMultipliers] = useState<Partial<Record<ExpenseCategory, number>>>({});
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  // Compute simulation projection deterministically
  const simulation = BudgetCalculator.simulateScenario(
    event,
    expenses,
    guestAdjustment,
    budgetAdjustment,
    categoryMultipliers
  );

  const handleMultiplierChange = (category: ExpenseCategory, value: number) => {
    setCategoryMultipliers(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleReset = () => {
    setGuestAdjustment(0);
    setBudgetAdjustment(0);
    setCategoryMultipliers({});
    setAppliedMessage(null);
  };

  const handleApplyToRealRecords = () => {
    // 1. Update event budget and guests
    const updatedEvent: EventDetails = {
      ...event,
      estimatedGuests: simulation.simulatedGuests,
      totalPlannedBudget: simulation.simulatedBudget
    };
    storage.saveEvent(updatedEvent);

    // 2. Adjust matching expenses if multipliers were tweaked
    const hasCategoryChanges = Object.keys(categoryMultipliers).length > 0 || guestAdjustment !== 0;
    if (hasCategoryChanges) {
      const guestRatio = event.estimatedGuests > 0 ? simulation.simulatedGuests / event.estimatedGuests : 1;
      const updatedExpenses = expenses.map(item => {
        let multiplier = 1;
        if ((item.category === 'Food & Catering' || item.category === 'Invitations') && guestAdjustment !== 0) {
          multiplier *= guestRatio;
        }
        if (categoryMultipliers[item.category] !== undefined) {
          multiplier *= categoryMultipliers[item.category]!;
        }

        if (multiplier !== 1) {
          return {
            ...item,
            estimatedCost: Math.round(item.estimatedCost * multiplier),
            notes: (item.notes ? item.notes + ' ' : '') + `[Adjusted in Simulator by ${(multiplier * 100).toFixed(0)}%]`
          };
        }
        return item;
      });
      storage.saveBulkExpenses(updatedExpenses);
    }

    setAppliedMessage('Simulated scenarios successfully applied into your official event records!');
    onApplyChanges();
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border-indigo-500/20 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sliders className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-white font-['Outfit']">
              What-If Financial Sandbox Simulator
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Stress-test changes in guest counts, budget caps, or category trims. Results remain in this isolated sandbox until you explicitly apply them.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center space-x-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sandbox</span>
          </button>
          <button
            onClick={handleApplyToRealRecords}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply to Live Records</span>
          </button>
        </div>
      </div>

      {appliedMessage && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{appliedMessage}</span>
        </div>
      )}

      {/* Simulator Metrics Preview Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div>
          <span className="text-[11px] font-semibold uppercase text-slate-400">Simulated Guests</span>
          <div className="text-xl font-bold text-white font-mono mt-0.5">
            {simulation.simulatedGuests}
            <span className="text-xs text-slate-400 ml-1.5 font-normal">
              ({guestAdjustment >= 0 ? `+${guestAdjustment}` : guestAdjustment})
            </span>
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase text-slate-400">Projected Total Cost</span>
          <div className="text-xl font-bold text-white font-mono mt-0.5">
            {event.currency} {simulation.simulatedProjectedCost.toLocaleString()}
          </div>
          <span className={`text-[10px] font-semibold ${simulation.deltaCost <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {simulation.deltaCost <= 0 ? `-${event.currency} ${Math.abs(simulation.deltaCost).toLocaleString()}` : `+${event.currency} ${simulation.deltaCost.toLocaleString()}`} vs baseline
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase text-slate-400">Budget Variance</span>
          <div className={`text-xl font-bold font-mono mt-0.5 ${simulation.simulatedVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {simulation.simulatedVariance >= 0 ? `+${event.currency} ` : `-${event.currency} `}
            {Math.abs(simulation.simulatedVariance).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">
            {simulation.simulatedVariance >= 0 ? 'Surplus' : 'Deficit Shortfall'}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase text-slate-400">Est. Cost Per Guest</span>
          <div className="text-xl font-bold text-white font-mono mt-0.5">
            {event.currency} {simulation.costPerGuest}
          </div>
          <span className="text-[10px] text-slate-400">Per attendee</span>
        </div>
      </div>

      {/* Sliders Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Slider 1: Guest Count Adjustment */}
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Guest Count Sandbox Adjustment</span>
            </span>
            <span className="font-mono text-indigo-300 font-bold">
              {event.estimatedGuests + guestAdjustment} guests ({guestAdjustment >= 0 ? `+${guestAdjustment}` : guestAdjustment})
            </span>
          </div>
          <input
            type="range"
            min={-Math.min(50, event.estimatedGuests - 5)}
            max={100}
            step={5}
            value={guestAdjustment}
            onChange={e => setGuestAdjustment(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-{Math.min(50, event.estimatedGuests - 5)} guests</span>
            <span>Current: {event.estimatedGuests}</span>
            <span>+100 guests</span>
          </div>
        </div>

        {/* Slider 2: Planned Budget Adjustment */}
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Total Planned Budget Target</span>
            </span>
            <span className="font-mono text-emerald-300 font-bold">
              {event.currency} {(event.totalPlannedBudget + budgetAdjustment).toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min={-Math.round(event.totalPlannedBudget * 0.4)}
            max={Math.round(event.totalPlannedBudget * 0.6)}
            step={500}
            value={budgetAdjustment}
            onChange={e => setBudgetAdjustment(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-{event.currency} {Math.round(event.totalPlannedBudget * 0.4).toLocaleString()}</span>
            <span>Current: {event.currency} {event.totalPlannedBudget.toLocaleString()}</span>
            <span>+{event.currency} {Math.round(event.totalPlannedBudget * 0.6).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Category Trim / Expand Sandbox Multipliers */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Category Scaling & Rebalancing Sandbox (Simulate % Cuts or Expansions)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {ALL_EXPENSE_CATEGORIES.slice(0, 5).map(cat => {
            const mult = categoryMultipliers[cat] !== undefined ? categoryMultipliers[cat]! : 1;
            return (
              <div key={cat} className="p-2.5 bg-slate-900/70 border border-slate-800 rounded-lg text-xs space-y-1.5">
                <div className="font-medium text-slate-300 truncate">{cat}</div>
                <div className="flex items-center justify-between text-[11px] font-mono text-indigo-300">
                  <span>{(mult * 100).toFixed(0)}%</span>
                  {mult < 1 && <span className="text-emerald-400 text-[10px]">Trimmed</span>}
                  {mult > 1 && <span className="text-rose-400 text-[10px]">Expanded</span>}
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={mult}
                  onChange={e => handleMultiplierChange(cat, parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-1"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
