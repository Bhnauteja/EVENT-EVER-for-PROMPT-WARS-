import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  CreditCard,
  PieChart,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Sliders,
  CheckCircle,
  FileSpreadsheet,
  X,
  Save
} from 'lucide-react';
import { EventDetails, ExpenseItem, ExpenseCategory, ExpenseCommitment, PaymentStatus } from '../../types';
import { BudgetCalculator, ALL_EXPENSE_CATEGORIES } from '../../services/budgetCalculator';
import { storage } from '../../services/storage';
import { WhatIfSimulator } from './WhatIfSimulator';

interface BudgetManagerProps {
  event: EventDetails;
  expenses: ExpenseItem[];
  onUpdate: () => void;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({ event, expenses, onUpdate }) => {
  const [activeBudgetView, setActiveBudgetView] = useState<'records' | 'reality_check' | 'smart_savings' | 'simulator'>('records');

  // Expense form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  // Form inputs
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food & Catering');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [quotedCost, setQuotedCost] = useState<number>(0);
  const [committedCost, setCommittedCost] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [actualCost, setActualCost] = useState<number>(0);
  const [commitmentLevel, setCommitmentLevel] = useState<ExpenseCommitment>('estimated');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Payment recording modal
  const [paymentModalExpense, setPaymentModalExpense] = useState<ExpenseItem | null>(null);
  const [paymentAmountToAdd, setPaymentAmountToAdd] = useState<number>(0);

  // Filter
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Calculations
  const summary = BudgetCalculator.calculateSummary(expenses, event.totalPlannedBudget);
  const realityCheck = BudgetCalculator.runRealityCheck(event, expenses);
  const smartSavings = BudgetCalculator.generateSmartSavings(event, expenses);

  const openCreateModal = () => {
    setTitle('');
    setCategory('Food & Catering');
    setEstimatedCost(1000);
    setQuotedCost(0);
    setCommittedCost(0);
    setPaidAmount(0);
    setActualCost(0);
    setCommitmentLevel('estimated');
    setDueDate('');
    setNotes('');
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exp: ExpenseItem) => {
    setTitle(exp.title);
    setCategory(exp.category);
    setEstimatedCost(exp.estimatedCost);
    setQuotedCost(exp.quotedCost);
    setCommittedCost(exp.committedCost);
    setPaidAmount(exp.paidAmount);
    setActualCost(exp.actualCost);
    setCommitmentLevel(exp.commitmentLevel);
    setDueDate(exp.dueDate || '');
    setNotes(exp.notes || '');
    setEditingExpense(exp);
    setIsModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Determine payment status deterministically
    let status: PaymentStatus = 'unpaid';
    if (paidAmount >= (committedCost > 0 ? committedCost : estimatedCost) && paidAmount > 0) {
      status = 'paid';
    } else if (paidAmount > 0) {
      status = 'partially_paid';
    }

    if (editingExpense) {
      const updated: ExpenseItem = {
        ...editingExpense,
        title,
        category,
        estimatedCost,
        quotedCost,
        committedCost,
        paidAmount,
        actualCost: actualCost > 0 ? actualCost : committedCost > 0 ? committedCost : estimatedCost,
        commitmentLevel,
        status,
        dueDate,
        notes
      };
      storage.saveExpense(updated);
    } else {
      const newExp: ExpenseItem = {
        id: 'exp-' + Date.now(),
        eventId: event.id,
        title,
        category,
        estimatedCost,
        quotedCost,
        committedCost,
        paidAmount,
        actualCost: actualCost > 0 ? actualCost : committedCost > 0 ? committedCost : estimatedCost,
        commitmentLevel,
        status,
        dueDate,
        notes,
        createdAt: new Date().toISOString()
      };
      storage.saveExpense(newExp);
    }

    setIsModalOpen(false);
    setEditingExpense(null);
    onUpdate();
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Delete this expense record?')) {
      storage.deleteExpense(id);
      onUpdate();
    }
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalExpense || paymentAmountToAdd <= 0) return;

    const newPaidTotal = paymentModalExpense.paidAmount + paymentAmountToAdd;
    const targetObligation = paymentModalExpense.committedCost > 0 ? paymentModalExpense.committedCost : paymentModalExpense.estimatedCost;

    let newStatus: PaymentStatus = 'partially_paid';
    if (newPaidTotal >= targetObligation) {
      newStatus = 'paid';
    }

    const updated: ExpenseItem = {
      ...paymentModalExpense,
      paidAmount: newPaidTotal,
      status: newStatus,
      notes: (paymentModalExpense.notes ? paymentModalExpense.notes + ' ' : '') + `[Paid ${event.currency} ${paymentAmountToAdd} on ${new Date().toLocaleDateString()}]`
    };

    storage.saveExpense(updated);
    setPaymentModalExpense(null);
    setPaymentAmountToAdd(0);
    onUpdate();
  };

  const handleApplySavingSuggestion = (suggestion: typeof smartSavings[0]) => {
    // Find matching category expenses and apply trim to estimated costs
    const catExpenses = expenses.filter(e => e.category === suggestion.category && e.committedCost === 0);
    if (catExpenses.length > 0) {
      const trimRatio = 0.8;
      const updated = catExpenses.map(e => ({
        ...e,
        estimatedCost: Math.round(e.estimatedCost * trimRatio),
        notes: (e.notes ? e.notes + ' ' : '') + `[Smart Savings Mode applied: ${suggestion.title}]`
      }));
      storage.saveBulkExpenses(updated);
      alert(`Applied Smart Savings: Saved estimated ${event.currency} ${suggestion.estimatedSaving.toLocaleString()} on uncommitted ${suggestion.category} expenses!`);
      onUpdate();
    } else {
      alert(`No uncommitted line items in ${suggestion.category} to automatically adjust. Review your committed vendor contracts.`);
    }
  };

  const filteredExpenses = expenses.filter(e => {
    if (selectedCategoryFilter === 'all') return true;
    return e.category === selectedCategoryFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header and View Mode Switcher */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white font-['Outfit']">
              Budget Management & Financial Reality
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Deterministic accounting tracking Planning Estimates, Vendor Quotes, Committed Contracts, and Paid Cash.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Planned Budget</span>
          <div className="text-lg font-bold text-white font-mono mt-0.5">
            {event.currency} {event.totalPlannedBudget.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500">Approved limit</span>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Committed Costs</span>
          <div className="text-lg font-bold text-indigo-300 font-mono mt-0.5">
            {event.currency} {summary.totalCommitted.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">Agreed obligations</span>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Cash Paid</span>
          <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
            {event.currency} {summary.totalPaid.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">{summary.paidPercentage}% of committed</span>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Remaining Payable</span>
          <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
            {event.currency} {summary.remainingPayable.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">Due to vendors</span>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Net Variance</span>
          <div className={`text-lg font-bold font-mono mt-0.5 ${summary.budgetVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {summary.budgetVariance >= 0 ? `+${event.currency} ` : `-${event.currency} `}
            {Math.abs(summary.budgetVariance).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">{summary.budgetVariance >= 0 ? 'Under budget' : 'Over budget'}</span>
        </div>
      </div>

      {/* Budget Tabs: Records, Reality Check, Smart Savings, What-If Simulator */}
      <div className="flex space-x-1 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveBudgetView('records')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 transition ${
            activeBudgetView === 'records'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
          <span>Expense Ledger ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveBudgetView('reality_check')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 transition ${
            activeBudgetView === 'reality_check'
              ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Budget Reality Check</span>
        </button>

        <button
          onClick={() => setActiveBudgetView('smart_savings')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 transition ${
            activeBudgetView === 'smart_savings'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Smart Savings Mode ({smartSavings.length})</span>
        </button>

        <button
          onClick={() => setActiveBudgetView('simulator')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 transition ${
            activeBudgetView === 'simulator'
              ? 'bg-purple-950/40 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-purple-400" />
          <span>What-If Sandbox Simulator</span>
        </button>
      </div>

      {/* VIEW 1: EXPENSE LEDGER */}
      {activeBudgetView === 'records' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 shrink-0">Filter by Category:</span>
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                selectedCategoryFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            {ALL_EXPENSE_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                  selectedCategoryFilter === cat ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat} ({expenses.filter(e => e.category === cat).length})
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Title & Category</th>
                    <th className="py-3 px-3">State</th>
                    <th className="py-3 px-3 text-right">Estimate</th>
                    <th className="py-3 px-3 text-right">Committed</th>
                    <th className="py-3 px-3 text-right">Paid</th>
                    <th className="py-3 px-3 text-right">Remaining Balance</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No expense records in this category.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map(item => {
                      const obligation = item.committedCost > 0 ? item.committedCost : item.estimatedCost;
                      const balance = Math.max(0, obligation - item.paidAmount);

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-100">{item.title}</div>
                            <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                              <span className="font-medium text-indigo-400">{item.category}</span>
                              {item.notes && <span className="text-slate-500 italic truncate max-w-[200px]">• {item.notes}</span>}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className="capitalize text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              {item.commitmentLevel}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-slate-300">
                            {event.currency} {item.estimatedCost.toLocaleString()}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-semibold text-indigo-300">
                            {event.currency} {item.committedCost.toLocaleString()}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-400">
                            {event.currency} {item.paidAmount.toLocaleString()}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-semibold text-amber-400">
                            {event.currency} {balance.toLocaleString()}
                          </td>

                          <td className="py-3 px-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              item.status === 'paid'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : item.status === 'partially_paid'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-slate-700 text-slate-400'
                            }`}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              {balance > 0 && (
                                <button
                                  onClick={() => {
                                    setPaymentModalExpense(item);
                                    setPaymentAmountToAdd(balance);
                                  }}
                                  className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded text-[11px] font-semibold transition"
                                  title="Record Payment"
                                >
                                  + Pay
                                </button>
                              )}
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(item.id)}
                                className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: REALITY CHECK */}
      {activeBudgetView === 'reality_check' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-6 border-indigo-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Budget Reality Check Audit
                </span>
                <h3 className="text-xl font-bold text-white font-['Outfit'] mt-1">
                  Financial Health Score: {realityCheck.healthScore} / 100
                </h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                realityCheck.overallHealth === 'healthy'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : realityCheck.overallHealth === 'caution'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {realityCheck.overallHealth} Health
              </span>
            </div>

            {/* Recommendations List */}
            <div className="mt-4 space-y-2">
              {realityCheck.summaryRecommendations.map((rec, i) => (
                <div key={i} className="p-3 bg-slate-900/60 rounded-xl text-xs text-slate-300 flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>

            {/* Underestimated Risks */}
            {realityCheck.underestimatedRisks.length > 0 && (
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                  Benchmark Underestimation Warnings
                </h4>
                <div className="space-y-2">
                  {realityCheck.underestimatedRisks.map((risk, i) => (
                    <div key={i} className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-200">
                        <span>{risk.itemTitle} ({risk.category})</span>
                        <span className="text-amber-400 font-mono">Suggested: {event.currency} {risk.benchmarkSuggestion.toLocaleString()}</span>
                      </div>
                      <p className="text-slate-400">{risk.identifiedRisk}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: SMART SAVINGS MODE */}
      {activeBudgetView === 'smart_savings' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white font-['Outfit']">
                Smart Savings Recommendations
              </h3>
            </div>
            <p className="text-xs text-slate-300 max-w-xl">
              Deterministic optimization suggestions based on category benchmarks and uncommitted planning estimates.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {smartSavings.map(s => (
                <div key={s.id} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        {s.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Save ~{event.currency} {s.estimatedSaving.toLocaleString()}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-2">{s.title}</h4>
                    <p className="text-xs text-slate-300 mt-1">{s.actionableSteps}</p>
                    <div className="mt-2 text-[11px] text-slate-400 italic">
                      Trade-off: {s.tradeOff}
                    </div>
                  </div>

                  {s.canAutoApply && (
                    <button
                      onClick={() => handleApplySavingSuggestion(s)}
                      className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
                    >
                      Apply Optimization to Uncommitted Items
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: WHAT-IF SIMULATOR */}
      {activeBudgetView === 'simulator' && (
        <WhatIfSimulator event={event} expenses={expenses} onApplyChanges={onUpdate} />
      )}

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white font-['Outfit']">
                {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Venue Deposit, Buffet Lunch, Audio System Rental"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {ALL_EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Commitment Level</label>
                  <select
                    value={commitmentLevel}
                    onChange={e => setCommitmentLevel(e.target.value as ExpenseCommitment)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="estimated">Estimated (Planning)</option>
                    <option value="quoted">Quoted by Vendor</option>
                    <option value="committed">Committed Contract</option>
                    <option value="actual">Actual Final Cost</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Estimated ({event.currency})</label>
                  <input
                    type="number"
                    min={0}
                    value={estimatedCost}
                    onChange={e => setEstimatedCost(Number(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Committed ({event.currency})</label>
                  <input
                    type="number"
                    min={0}
                    value={committedCost}
                    onChange={e => setCommittedCost(Number(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Paid So Far ({event.currency})</label>
                  <input
                    type="number"
                    min={0}
                    value={paidAmount}
                    onChange={e => setPaidAmount(Number(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Notes / Invoice Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. Invoice #991, 50% deposit"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModalExpense && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white font-['Outfit']">
              Record Partial / Full Payment
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              For: <strong>{paymentModalExpense.title}</strong>
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Payment Amount ({event.currency})</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={paymentAmountToAdd}
                  onChange={e => setPaymentAmountToAdd(Number(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-base font-bold"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalExpense(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
