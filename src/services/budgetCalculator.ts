import { ExpenseItem, ExpenseCategory, EventDetails } from '../types';

export interface BudgetSummary {
  plannedBudget: number;
  totalEstimated: number;
  totalQuoted: number;
  totalCommitted: number;
  totalPaid: number;
  totalActual: number;
  projectedFinalCost: number; // Committed + max(0, Estimated - Committed for categories where commitments haven't been made)
  remainingPayable: number;   // Committed - Paid
  remainingBudget: number;    // Planned - projectedFinalCost
  budgetVariance: number;     // Planned - projectedFinalCost (positive = surplus, negative = deficit)
  burnPercentage: number;
  paidPercentage: number;
  categoryBreakdown: Record<ExpenseCategory, {
    allocatedEstimated: number;
    committed: number;
    paid: number;
    actual: number;
    variance: number;
    itemsCount: number;
  }>;
}

export interface RealityCheckReport {
  overallHealth: 'healthy' | 'caution' | 'critical';
  healthScore: number; // 0 to 100
  recommendedContingency: number;
  contingencyPercentage: number;
  overspentCategories: Array<{
    category: ExpenseCategory;
    excessAmount: number;
    impactExplanation: string;
  }>;
  underestimatedRisks: Array<{
    category: ExpenseCategory;
    itemTitle: string;
    identifiedRisk: string;
    benchmarkSuggestion: number;
  }>;
  highCostItems: Array<{
    id: string;
    title: string;
    category: ExpenseCategory;
    cost: number;
    percentageOfBudget: number;
  }>;
  summaryRecommendations: string[];
}

export interface SmartSavingSuggestion {
  id: string;
  title: string;
  category: ExpenseCategory;
  estimatedSaving: number;
  actionableSteps: string;
  tradeOff: string;
  impactLevel: 'low' | 'medium' | 'high';
  canAutoApply: boolean;
}

export const ALL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Venue',
  'Food & Catering',
  'Decoration',
  'Photography & Video',
  'Entertainment',
  'Transport',
  'Invitations',
  'Accommodation',
  'Equipment',
  'Miscellaneous'
];

export class BudgetCalculator {
  static calculateSummary(expenses: ExpenseItem[], plannedBudget: number): BudgetSummary {
    let totalEstimated = 0;
    let totalQuoted = 0;
    let totalCommitted = 0;
    let totalPaid = 0;
    let totalActual = 0;

    const categoryBreakdown: BudgetSummary['categoryBreakdown'] = {} as any;
    for (const cat of ALL_EXPENSE_CATEGORIES) {
      categoryBreakdown[cat] = {
        allocatedEstimated: 0,
        committed: 0,
        paid: 0,
        actual: 0,
        variance: 0,
        itemsCount: 0
      };
    }

    for (const item of expenses) {
      const est = Number(item.estimatedCost) || 0;
      const quoted = Number(item.quotedCost) || 0;
      const committed = Number(item.committedCost) || 0;
      const paid = Number(item.paidAmount) || 0;
      const actual = Number(item.actualCost) || 0;

      totalEstimated += est;
      totalQuoted += quoted;
      totalCommitted += committed;
      totalPaid += paid;
      totalActual += actual;

      const cat = item.category || 'Miscellaneous';
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = {
          allocatedEstimated: 0,
          committed: 0,
          paid: 0,
          actual: 0,
          variance: 0,
          itemsCount: 0
        };
      }

      categoryBreakdown[cat].allocatedEstimated += est;
      categoryBreakdown[cat].committed += committed;
      categoryBreakdown[cat].paid += paid;
      categoryBreakdown[cat].actual += actual;
      categoryBreakdown[cat].itemsCount += 1;
    }

    // Projected final cost:
    // If an item has committed cost > 0, we count the committed cost.
    // If not committed yet, we count the estimated cost.
    let projectedFinalCost = 0;
    for (const item of expenses) {
      if (item.committedCost > 0) {
        projectedFinalCost += item.committedCost;
      } else if (item.quotedCost > 0) {
        projectedFinalCost += item.quotedCost;
      } else {
        projectedFinalCost += item.estimatedCost;
      }
    }

    // Remaining payable on committed contracts
    const remainingPayable = Math.max(0, totalCommitted - totalPaid);
    const remainingBudget = plannedBudget - projectedFinalCost;
    const budgetVariance = plannedBudget - projectedFinalCost;
    const burnPercentage = plannedBudget > 0 ? Math.min(100, Math.round((projectedFinalCost / plannedBudget) * 100)) : 0;
    const paidPercentage = totalCommitted > 0 ? Math.min(100, Math.round((totalPaid / totalCommitted) * 100)) : 0;

    // Calculate category variances
    for (const cat of ALL_EXPENSE_CATEGORIES) {
      const b = categoryBreakdown[cat];
      const categoryProjected = expenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + (e.committedCost > 0 ? e.committedCost : e.quotedCost > 0 ? e.quotedCost : e.estimatedCost), 0);
      b.variance = b.allocatedEstimated - categoryProjected;
    }

    return {
      plannedBudget,
      totalEstimated,
      totalQuoted,
      totalCommitted,
      totalPaid,
      totalActual,
      projectedFinalCost,
      remainingPayable,
      remainingBudget,
      budgetVariance,
      burnPercentage,
      paidPercentage,
      categoryBreakdown
    };
  }

  static runRealityCheck(event: EventDetails, expenses: ExpenseItem[]): RealityCheckReport {
    const summary = this.calculateSummary(expenses, event.totalPlannedBudget);
    const recommendedContingencyRate = 0.12; // 12% contingency reserve recommended
    const recommendedContingency = Math.round(event.totalPlannedBudget * recommendedContingencyRate);

    const overspentCategories: RealityCheckReport['overspentCategories'] = [];
    const underestimatedRisks: RealityCheckReport['underestimatedRisks'] = [];
    const highCostItems: RealityCheckReport['highCostItems'] = [];

    // Find overspent or disproportionate categories
    for (const cat of ALL_EXPENSE_CATEGORIES) {
      const data = summary.categoryBreakdown[cat];
      if (data.allocatedEstimated > 0 && data.committed > data.allocatedEstimated) {
        const excess = data.committed - data.allocatedEstimated;
        overspentCategories.push({
          category: cat,
          excessAmount: excess,
          impactExplanation: `Committed obligations (${event.currency} ${data.committed.toLocaleString()}) exceed initial allocation (${event.currency} ${data.allocatedEstimated.toLocaleString()}) by ${event.currency} ${excess.toLocaleString()}.`
        });
      }
    }

    // Benchmark checks for missing critical categories
    const categoriesWithExpenses = new Set(expenses.map(e => e.category));
    if (event.type === 'wedding' && !categoriesWithExpenses.has('Photography & Video')) {
      underestimatedRisks.push({
        category: 'Photography & Video',
        itemTitle: 'Wedding Photography & Video Coverage',
        identifiedRisk: 'No photography or video line item detected. Industry standard is 10-15% of total budget.',
        benchmarkSuggestion: Math.round(event.totalPlannedBudget * 0.12)
      });
    }

    if (event.type === 'hackathon' && !categoriesWithExpenses.has('Equipment')) {
      underestimatedRisks.push({
        category: 'Equipment',
        itemTitle: 'Network & Power Infrastructure',
        identifiedRisk: 'High-density WiFi hardware and power drop rentals are missing for 200+ attendees.',
        benchmarkSuggestion: Math.round(event.totalPlannedBudget * 0.08)
      });
    }

    // Check per-guest catering realism
    const cateringExpenses = expenses.filter(e => e.category === 'Food & Catering');
    const totalCatering = cateringExpenses.reduce((sum, e) => sum + (e.committedCost || e.estimatedCost), 0);
    if (event.estimatedGuests > 0) {
      const costPerGuest = totalCatering / event.estimatedGuests;
      if (event.type === 'wedding' && costPerGuest < 45 && costPerGuest > 0) {
        underestimatedRisks.push({
          category: 'Food & Catering',
          itemTitle: 'Per-Guest Catering Allocation',
          identifiedRisk: `Catering calculation yields only ${event.currency} ${costPerGuest.toFixed(1)} per guest, which is below standard catering minimums for weddings.`,
          benchmarkSuggestion: event.estimatedGuests * 75
        });
      }
    }

    // Identify high-cost items (>20% of budget)
    for (const item of expenses) {
      const cost = item.committedCost || item.quotedCost || item.estimatedCost;
      if (event.totalPlannedBudget > 0) {
        const pct = (cost / event.totalPlannedBudget) * 100;
        if (pct >= 18) {
          highCostItems.push({
            id: item.id,
            title: item.title,
            category: item.category,
            cost,
            percentageOfBudget: Math.round(pct)
          });
        }
      }
    }

    // Determine health score
    let healthScore = 100;
    if (summary.budgetVariance < 0) {
      const deficitRatio = Math.abs(summary.budgetVariance) / (event.totalPlannedBudget || 1);
      healthScore -= Math.min(50, Math.round(deficitRatio * 100));
    }
    healthScore -= overspentCategories.length * 10;
    healthScore -= underestimatedRisks.length * 8;
    healthScore = Math.max(10, Math.min(100, healthScore));

    const overallHealth: RealityCheckReport['overallHealth'] =
      healthScore >= 80 ? 'healthy' : healthScore >= 55 ? 'caution' : 'critical';

    const summaryRecommendations: string[] = [];
    if (summary.budgetVariance < 0) {
      summaryRecommendations.push(`Projected costs exceed your total budget by ${event.currency} ${Math.abs(summary.budgetVariance).toLocaleString()}. Activate Smart Savings Mode to rebalance.`);
    } else {
      summaryRecommendations.push(`Budget is currently within safe limits with a surplus of ${event.currency} ${summary.budgetVariance.toLocaleString()}.`);
    }

    summaryRecommendations.push(`Set aside a ${Math.round(recommendedContingencyRate * 100)}% contingency buffer (${event.currency} ${recommendedContingency.toLocaleString()}) for unexpected last-minute requirements.`);

    if (underestimatedRisks.length > 0) {
      summaryRecommendations.push(`${underestimatedRisks.length} key category cost risk(s) identified based on event benchmarks.`);
    }

    return {
      overallHealth,
      healthScore,
      recommendedContingency,
      contingencyPercentage: Math.round(recommendedContingencyRate * 100),
      overspentCategories,
      underestimatedRisks,
      highCostItems,
      summaryRecommendations
    };
  }

  static generateSmartSavings(event: EventDetails, expenses: ExpenseItem[]): SmartSavingSuggestion[] {
    const suggestions: SmartSavingSuggestion[] = [];
    const currency = event.currency;

    // Check decoration expenses
    const decorExpenses = expenses.filter(e => e.category === 'Decoration');
    const totalDecor = decorExpenses.reduce((s, e) => s + (e.committedCost || e.estimatedCost), 0);
    if (totalDecor > 800) {
      suggestions.push({
        id: 'save-decor',
        title: 'Opt for Seasonal Florals & Ambient Uplighting',
        category: 'Decoration',
        estimatedSaving: Math.round(totalDecor * 0.28),
        actionableSteps: 'Replace elaborate non-seasonal imported floral arrangements with locally sourced greenery and warm LED uplighting wash.',
        tradeOff: 'Minimal visual sacrifice; creates an intimate aesthetic while saving on florist labor.',
        impactLevel: 'medium',
        canAutoApply: true
      });
    }

    // Check catering / bar service
    const cateringExpenses = expenses.filter(e => e.category === 'Food & Catering');
    const totalCatering = cateringExpenses.reduce((s, e) => s + (e.committedCost || e.estimatedCost), 0);
    if (totalCatering > 2000) {
      suggestions.push({
        id: 'save-bar',
        title: 'Curated Signature Cocktail Bar instead of Full Open Bar',
        category: 'Food & Catering',
        estimatedSaving: Math.round(totalCatering * 0.18),
        actionableSteps: 'Feature two curated signature craft drinks plus beer and wine, rather than unmetered top-shelf liquor selection.',
        tradeOff: 'Faster bar service queue with distinct cocktail curation guests often prefer.',
        impactLevel: 'high',
        canAutoApply: true
      });
    }

    // Check invitations & printing
    const inviteExpenses = expenses.filter(e => e.category === 'Invitations');
    const totalInvites = inviteExpenses.reduce((s, e) => s + (e.committedCost || e.estimatedCost), 0);
    if (totalInvites > 300) {
      suggestions.push({
        id: 'save-invites',
        title: 'Digital-First WhatsApp RSVP & Smart QR Codes',
        category: 'Invitations',
        estimatedSaving: Math.round(totalInvites * 0.75),
        actionableSteps: 'Use PlanWise’s built-in digital guest hub and WhatsApp automated delivery instead of luxury letterpress physical mailings.',
        tradeOff: 'Zero paper waste, instantaneous RSVP tracking, real-time reminders.',
        impactLevel: 'low',
        canAutoApply: true
      });
    }

    // Check equipment / AV
    const equipExpenses = expenses.filter(e => e.category === 'Equipment' || e.category === 'Entertainment');
    const totalEquip = equipExpenses.reduce((s, e) => s + (e.committedCost || e.estimatedCost), 0);
    if (totalEquip > 1500) {
      suggestions.push({
        id: 'save-equip',
        title: 'Bundle Stage Sound & Lighting with Single Production Vendor',
        category: 'Equipment',
        estimatedSaving: Math.round(totalEquip * 0.15),
        actionableSteps: 'Consolidate multiple separate equipment rentals into a single package deal with one logistics delivery fee.',
        tradeOff: 'Streamlines vendor coordination and reduces transport overheads.',
        impactLevel: 'medium',
        canAutoApply: false
      });
    }

    // Generic fallback suggestion if budget is small
    if (suggestions.length === 0) {
      suggestions.push({
        id: 'save-misc',
        title: 'Trim Discretionary Miscellaneous Contingency',
        category: 'Miscellaneous',
        estimatedSaving: Math.round(event.totalPlannedBudget * 0.05),
        actionableSteps: 'Re-audit miscellaneous line items and shift surplus into core venue and hospitality.',
        tradeOff: 'Requires tighter adherence to existing quotes.',
        impactLevel: 'low',
        canAutoApply: true
      });
    }

    return suggestions;
  }

  // What-If Simulator: deterministic sandbox projection without touching database
  static simulateScenario(
    event: EventDetails,
    expenses: ExpenseItem[],
    guestAdjustment: number, // e.g. -20 or +30
    budgetAdjustment: number, // e.g. +2000 or -1500
    categoryMultipliers: Partial<Record<ExpenseCategory, number>> // e.g. {'Food & Catering': 0.85}
  ): {
    simulatedGuests: number;
    simulatedBudget: number;
    simulatedProjectedCost: number;
    simulatedVariance: number;
    costPerGuest: number;
    deltaCost: number;
    deltaVariance: number;
  } {
    const baseSummary = this.calculateSummary(expenses, event.totalPlannedBudget);
    const simulatedGuests = Math.max(1, event.estimatedGuests + guestAdjustment);
    const simulatedBudget = Math.max(100, event.totalPlannedBudget + budgetAdjustment);

    const guestScalingFactor = event.estimatedGuests > 0 ? simulatedGuests / event.estimatedGuests : 1;

    let simulatedProjectedCost = 0;
    for (const item of expenses) {
      const baseCost = item.committedCost > 0 ? item.committedCost : item.quotedCost > 0 ? item.quotedCost : item.estimatedCost;
      let cost = baseCost;

      // Food and Invitations scale with guest count
      if (item.category === 'Food & Catering' || item.category === 'Invitations') {
        cost = cost * guestScalingFactor;
      }

      // Apply category multiplier if modified in simulator
      const mult = categoryMultipliers[item.category];
      if (mult !== undefined && mult > 0) {
        cost = cost * mult;
      }

      simulatedProjectedCost += cost;
    }

    const simulatedVariance = simulatedBudget - simulatedProjectedCost;
    const costPerGuest = Math.round(simulatedProjectedCost / simulatedGuests);
    const deltaCost = simulatedProjectedCost - baseSummary.projectedFinalCost;
    const deltaVariance = simulatedVariance - baseSummary.budgetVariance;

    return {
      simulatedGuests,
      simulatedBudget,
      simulatedProjectedCost: Math.round(simulatedProjectedCost),
      simulatedVariance: Math.round(simulatedVariance),
      costPerGuest,
      deltaCost: Math.round(deltaCost),
      deltaVariance: Math.round(deltaVariance)
    };
  }
}
