export type EventType = 
  | 'wedding' 
  | 'birthday' 
  | 'hackathon' 
  | 'community' 
  | 'conference' 
  | 'dinner' 
  | 'custom';

export type RSVPStatus = 'attending' | 'declined' | 'tentative' | 'awaiting';
export type InvitationStatus = 'not_sent' | 'sent' | 'delivered' | 'opened';

export interface EventDetails {
  id: string;
  name: string;
  type: EventType;
  description: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  timezone: string;
  venueName: string;
  venueAddress: string;
  directionsUrl?: string;
  estimatedGuests: number;
  totalPlannedBudget: number;
  currency: string;
  dressCode?: string;
  parkingInfo?: string;
  specialInstructions?: string;
  organizerLanguage: string;
  isPublished: boolean;
  publicSlug: string;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleStatus = 'scheduled' | 'in_progress' | 'completed' | 'delayed';

export interface ScheduleItem {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  date?: string; // YYYY-MM-DD (defaults to event startDate)
  location: string;
  responsiblePerson?: string;
  dependencies?: string[];
  status: ScheduleStatus;
  isGuestVisible: boolean;
  prepNotes?: string;
  orderIndex: number;
}

export type ExpenseCategory = 
  | 'Venue' 
  | 'Food & Catering' 
  | 'Decoration' 
  | 'Photography & Video' 
  | 'Entertainment' 
  | 'Transport' 
  | 'Invitations' 
  | 'Accommodation' 
  | 'Equipment' 
  | 'Miscellaneous';

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded';
export type ExpenseCommitment = 'estimated' | 'quoted' | 'committed' | 'actual';

export interface ExpenseItem {
  id: string;
  eventId: string;
  title: string;
  category: ExpenseCategory;
  estimatedCost: number;
  quotedCost: number;
  committedCost: number;
  paidAmount: number;
  actualCost: number;
  status: PaymentStatus;
  commitmentLevel: ExpenseCommitment;
  vendorId?: string;
  dueDate?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  eventId: string;
  name: string;
  category: ExpenseCategory;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  quotedCost: number;
  agreedCost: number;
  paidAmount: number;
  bookingStatus: 'inquiry' | 'quote_received' | 'negotiating' | 'confirmed' | 'cancelled';
  paymentStatus: PaymentStatus;
  deliveryDate?: string;
  notes?: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export interface EventTask {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string; // ISO date or YYYY-MM-DD
  assignedTo?: string;
  dependencies?: string[];
  relatedVendorId?: string;
  relatedScheduleId?: string;
  privateNotes?: string;
  createdAt: string;
}

export interface Guest {
  id: string;
  eventId: string;
  name: string;
  email?: string;
  phone?: string;
  rsvpStatus: RSVPStatus;
  invitationStatus: InvitationStatus;
  preferredLanguage: string;
  secureToken: string;
  plusOneAllowed: boolean;
  plusOneCount: number;
  dietaryRestrictions?: string;
  guestNotes?: string;
  organizerNotes?: string;
  rsvpSubmittedAt?: string;
  tableNumber?: string;
}

export type MessageWorkflowType = 
  | 'bulk_invitation'
  | 'rsvp_reminder'
  | 'venue_date_reminder'
  | 'schedule_notification'
  | 'event_day_update'
  | 'announcement_blast'
  | 'custom_broadcast';

export type MessageDeliveryStatus = 
  | 'draft'
  | 'queued'
  | 'scheduled'
  | 'sent_via_api'
  | 'manual_opened'
  | 'failed';

export interface CommunicationLog {
  id: string;
  eventId: string;
  workflowType: MessageWorkflowType;
  guestId?: string;
  recipientName: string;
  recipientPhone: string;
  messageContent: string;
  status: MessageDeliveryStatus;
  scheduledFor?: string;
  sentAt?: string;
  providerResponse?: string;
  errorReason?: string;
}

export interface Announcement {
  id: string;
  eventId: string;
  title: string;
  content: string;
  urgency: 'normal' | 'important' | 'urgent';
  targetAudience: 'all' | 'attending' | 'tentative' | 'unconfirmed';
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  language?: string;
}

export interface RiskAlert {
  id: string;
  type: 'schedule_overlap' | 'unpaid_vendor' | 'overdue_task' | 'budget_deficit' | 'rsvp_low' | 'missing_info';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionRecommendation: string;
  entityId?: string;
}

export interface AIPromptPlanRequest {
  eventType: EventType;
  eventName: string;
  guestCount: number;
  totalBudget: number;
  currency: string;
  eventDate: string;
  location: string;
  specialInstructions?: string;
}

export interface AIPeriodPlan {
  timelineSuggestions: Array<{
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    location: string;
    isGuestVisible: boolean;
  }>;
  budgetAllocations: Array<{
    category: ExpenseCategory;
    title: string;
    estimatedCost: number;
    notes: string;
  }>;
  taskChecklist: Array<{
    title: string;
    category: string;
    priority: TaskPriority;
    deadlineDaysBefore: number;
    description: string;
  }>;
  vendorRequirements: Array<{
    category: ExpenseCategory;
    serviceNeeded: string;
    estimatedCostRange: string;
    keyQuestions: string;
  }>;
  costSavingIdeas: Array<{
    title: string;
    category: ExpenseCategory;
    potentialSavings: number;
    tradeOff: string;
  }>;
  riskAndContingencies: Array<{
    risk: string;
    mitigation: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  missingInformationFlags: string[];
}
