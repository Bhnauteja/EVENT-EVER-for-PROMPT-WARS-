import {
  EventDetails,
  ScheduleItem,
  ExpenseItem,
  Vendor,
  EventTask,
  Guest,
  RiskAlert
} from '../types';
import { BudgetCalculator } from './budgetCalculator';

export interface PlanChangeDiff {
  field: string;
  oldValue: any;
  newValue: any;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedComponents: string[];
  suggestedActions: string[];
}

export interface ImpactAnalysisReport {
  hasImpact: boolean;
  overallSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  diffs: PlanChangeDiff[];
  summaryMessage: string;
}

export class RiskAndImpactAnalyzer {
  /**
   * Analyzes all active event records to produce real-time risk alerts
   */
  static analyzeRisks(
    event: EventDetails,
    schedules: ScheduleItem[],
    expenses: ExpenseItem[],
    vendors: Vendor[],
    tasks: EventTask[],
    guests: Guest[]
  ): RiskAlert[] {
    const alerts: RiskAlert[] = [];
    const now = new Date();

    // 1. Schedule Overlaps
    const sortedSchedules = [...schedules].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 0; i < sortedSchedules.length - 1; i++) {
      const current = sortedSchedules[i];
      const next = sortedSchedules[i + 1];

      if (current.endTime > next.startTime && current.location === next.location) {
        alerts.push({
          id: `risk-overlap-${current.id}-${next.id}`,
          type: 'schedule_overlap',
          severity: 'high',
          title: `Schedule Overlap: ${current.title} & ${next.title}`,
          description: `Both sessions are booked simultaneously in "${current.location}" between ${next.startTime} and ${current.endTime}.`,
          actionRecommendation: `Adjust ${next.title} start time or relocate to another room.`,
          entityId: current.id
        });
      }
    }

    // 2. Budget Deficit & High Uncommitted Costs
    const budgetSummary = BudgetCalculator.calculateSummary(expenses, event.totalPlannedBudget);
    if (budgetSummary.budgetVariance < 0) {
      alerts.push({
        id: 'risk-budget-deficit',
        type: 'budget_deficit',
        severity: 'high',
        title: `Projected Budget Overrun (${event.currency} ${Math.abs(budgetSummary.budgetVariance).toLocaleString()})`,
        description: `Projected total cost (${event.currency} ${budgetSummary.projectedFinalCost.toLocaleString()}) exceeds planned budget (${event.currency} ${event.totalPlannedBudget.toLocaleString()}).`,
        actionRecommendation: 'Review optional expenses in Smart Savings Mode or adjust guest-related allocations.',
      });
    }

    // 3. Overdue and Urgent Incomplete Tasks
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      return d < now;
    });

    if (overdueTasks.length > 0) {
      alerts.push({
        id: 'risk-overdue-tasks',
        type: 'overdue_task',
        severity: overdueTasks.some(t => t.priority === 'urgent' || t.priority === 'high') ? 'high' : 'medium',
        title: `${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''}`,
        description: `Overdue items include: ${overdueTasks.slice(0, 2).map(t => `"${t.title}"`).join(', ')}.`,
        actionRecommendation: 'Reassign or complete critical dependencies before the event date.',
      });
    }

    // 4. Unpaid or Unconfirmed Vendor Balances
    const pendingVendors = vendors.filter(v => v.bookingStatus === 'confirmed' && v.paymentStatus !== 'paid' && (v.agreedCost - v.paidAmount) > 0);
    if (pendingVendors.length > 0) {
      const totalPending = pendingVendors.reduce((sum, v) => sum + (v.agreedCost - v.paidAmount), 0);
      alerts.push({
        id: 'risk-vendor-payments',
        type: 'unpaid_vendor',
        severity: 'medium',
        title: `${pendingVendors.length} Confirmed Vendor(s) with Outstanding Balance`,
        description: `Total pending vendor payables: ${event.currency} ${totalPending.toLocaleString()}.`,
        actionRecommendation: 'Verify payment milestones before vendor arrival date to prevent service disruption.',
      });
    }

    // 5. Low RSVP Response Rate (when event is less than 30 days away)
    const eventDate = new Date(event.startDate);
    const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (guests.length > 0 && daysUntilEvent > 0 && daysUntilEvent <= 21) {
      const pendingGuests = guests.filter(g => g.rsvpStatus === 'awaiting' || g.rsvpStatus === 'tentative');
      const pendingRatio = pendingGuests.length / guests.length;

      if (pendingRatio > 0.4) {
        alerts.push({
          id: 'risk-rsvp-rate',
          type: 'rsvp_low',
          severity: daysUntilEvent <= 10 ? 'high' : 'medium',
          title: `Pending RSVPs: ${pendingGuests.length} of ${guests.length} Guests Unconfirmed`,
          description: `Event is in ${daysUntilEvent} days, but ${(pendingRatio * 100).toFixed(0)}% of invited guests have not provided a final response.`,
          actionRecommendation: 'Send an automated WhatsApp reminder to all pending recipients to lock in catering.',
        });
      }
    }

    // 6. Missing Essential Information
    if (!event.venueAddress || event.venueAddress.trim().length < 5) {
      alerts.push({
        id: 'risk-missing-venue',
        type: 'missing_info',
        severity: 'high',
        title: 'Missing Physical Venue Address',
        description: 'Guests and external vendors do not have an exact location or map coordinates.',
        actionRecommendation: 'Provide a complete venue street address and Google Maps link.',
      });
    }

    return alerts;
  }

  /**
   * Plan-Change Impact Analysis:
   * When an organizer edits key parameters (date, time, venue, guest count, budget),
   * compute the cascade effect on schedules, vendors, tasks, reminders, and costs.
   */
  static analyzePlanChangeImpact(
    currentEvent: EventDetails,
    updatedDraft: Partial<EventDetails>,
    schedules: ScheduleItem[],
    vendors: Vendor[],
    tasks: EventTask[],
    expenses: ExpenseItem[]
  ): ImpactAnalysisReport {
    const diffs: PlanChangeDiff[] = [];

    // Date & Time Change
    if (updatedDraft.startDate && updatedDraft.startDate !== currentEvent.startDate) {
      const oldDate = new Date(currentEvent.startDate).toLocaleString();
      const newDate = new Date(updatedDraft.startDate).toLocaleString();

      diffs.push({
        field: 'startDate',
        oldValue: oldDate,
        newValue: newDate,
        impactLevel: 'critical',
        description: `Event date/time shifted from ${oldDate} to ${newDate}.`,
        affectedComponents: [
          `${schedules.length} Schedule items may need time realignment`,
          `${vendors.filter(v => v.bookingStatus === 'confirmed').length} Confirmed vendors must be re-notified of date change`,
          `${tasks.filter(t => t.status !== 'completed').length} Pending task deadlines should be recalibrated`,
          'Scheduled WhatsApp invitations & reminders will need resending'
        ],
        suggestedActions: [
          'Publish an urgent announcement to all confirmed guests',
          'Contact booked venue & catering vendors immediately to confirm date availability',
          'Recalibrate timeline builder schedule times'
        ]
      });
    }

    // Venue Change
    if (updatedDraft.venueName && updatedDraft.venueName !== currentEvent.venueName) {
      diffs.push({
        field: 'venueName',
        oldValue: currentEvent.venueName,
        newValue: updatedDraft.venueName,
        impactLevel: 'high',
        description: `Venue changed from "${currentEvent.venueName}" to "${updatedDraft.venueName}".`,
        affectedComponents: [
          'Guest Event Hub directions and map pin',
          'Vendor delivery locations and access permissions',
          'Parking and public transit instructions'
        ],
        suggestedActions: [
          'Update venue address and map link immediately',
          'Draft a WhatsApp notification for attending guests regarding the new venue location',
          'Review venue rules (outside food, decibel limit, curfew)'
        ]
      });
    }

    // Guest Count Change
    if (updatedDraft.estimatedGuests && updatedDraft.estimatedGuests !== currentEvent.estimatedGuests) {
      const diff = updatedDraft.estimatedGuests - currentEvent.estimatedGuests;
      const cateringExpenses = expenses.filter(e => e.category === 'Food & Catering');
      const totalCatering = cateringExpenses.reduce((s, e) => s + (e.committedCost || e.estimatedCost), 0);
      const estPerHead = currentEvent.estimatedGuests > 0 ? totalCatering / currentEvent.estimatedGuests : 50;
      const estimatedCostImpact = Math.round(diff * estPerHead);

      diffs.push({
        field: 'estimatedGuests',
        oldValue: currentEvent.estimatedGuests,
        newValue: updatedDraft.estimatedGuests,
        impactLevel: Math.abs(diff) > 20 ? 'high' : 'medium',
        description: `Guest count adjusted by ${diff > 0 ? '+' : ''}${diff} guests (${currentEvent.estimatedGuests} → ${updatedDraft.estimatedGuests}).`,
        affectedComponents: [
          `Estimated catering cost impact: ~${currentEvent.currency} ${estimatedCostImpact.toLocaleString()}`,
          'Venue seating layout and table count capacity',
          'Swag, badge, and drink quantity requirements'
        ],
        suggestedActions: [
          'Check if the venue maximum capacity accommodates this count',
          'Update catering vendor with the adjusted guest range',
          'Recalculate budget allocations using Budget Reality Check'
        ]
      });
    }

    // Budget Change
    if (updatedDraft.totalPlannedBudget && updatedDraft.totalPlannedBudget !== currentEvent.totalPlannedBudget) {
      const diff = updatedDraft.totalPlannedBudget - currentEvent.totalPlannedBudget;
      diffs.push({
        field: 'totalPlannedBudget',
        oldValue: currentEvent.totalPlannedBudget,
        newValue: updatedDraft.totalPlannedBudget,
        impactLevel: diff < 0 ? 'high' : 'low',
        description: `Planned budget modified by ${diff > 0 ? '+' : ''}${diff.toLocaleString()} ${currentEvent.currency}.`,
        affectedComponents: [
          'Budget variance and burn rate',
          'Recommended contingency reserve calculation'
        ],
        suggestedActions: [
          diff < 0
            ? 'Run Smart Savings Mode to trim discretionary costs'
            : 'Allocate surplus to contingency or premium entertainment enhancements'
        ]
      });
    }

    let overallSeverity: ImpactAnalysisReport['overallSeverity'] = 'none';
    if (diffs.some(d => d.impactLevel === 'critical')) {
      overallSeverity = 'critical';
    } else if (diffs.some(d => d.impactLevel === 'high')) {
      overallSeverity = 'high';
    } else if (diffs.some(d => d.impactLevel === 'medium')) {
      overallSeverity = 'medium';
    } else if (diffs.length > 0) {
      overallSeverity = 'low';
    }

    return {
      hasImpact: diffs.length > 0,
      overallSeverity,
      diffs,
      summaryMessage: diffs.length > 0
        ? `Changing these parameters will impact ${diffs.reduce((acc, d) => acc + d.affectedComponents.length, 0)} linked event components.`
        : 'No structural dependencies affected.'
    };
  }
}
