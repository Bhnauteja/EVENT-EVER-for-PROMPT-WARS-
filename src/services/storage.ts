import {
  EventDetails,
  ScheduleItem,
  ExpenseItem,
  Vendor,
  EventTask,
  Guest,
  Announcement,
  CommunicationLog
} from '../types';
import {
  SEED_EVENTS,
  SEED_SCHEDULE,
  SEED_EXPENSES,
  SEED_VENDORS,
  SEED_TASKS,
  SEED_GUESTS,
  SEED_ANNOUNCEMENTS,
  SEED_COMMUNICATIONS
} from './mockData';

export interface AppSettings {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  organizerPin?: string;
  useLiveSupabase: boolean;
  demoModeNoticeShown: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  geminiApiKey: '',
  openaiApiKey: '',
  whatsappPhoneNumberId: '',
  whatsappAccessToken: '',
  organizerPin: '7989',
  useLiveSupabase: false,
  demoModeNoticeShown: false,
};

class StorageService {
  private activeEventIdKey = 'planwise_active_event_id';
  private eventsKey = 'planwise_events';
  private schedulesKey = 'planwise_schedules';
  private expensesKey = 'planwise_expenses';
  private vendorsKey = 'planwise_vendors';
  private tasksKey = 'planwise_tasks';
  private guestsKey = 'planwise_guests';
  private announcementsKey = 'planwise_announcements';
  private communicationsKey = 'planwise_communications';
  private settingsKey = 'planwise_settings';

  constructor() {
    this.initializeIfEmpty();
  }

  private initializeIfEmpty() {
    try {
      if (!localStorage.getItem(this.eventsKey)) {
        localStorage.setItem(this.eventsKey, JSON.stringify(SEED_EVENTS));
      }
      if (!localStorage.getItem(this.schedulesKey)) {
        localStorage.setItem(this.schedulesKey, JSON.stringify(SEED_SCHEDULE));
      }
      if (!localStorage.getItem(this.expensesKey)) {
        localStorage.setItem(this.expensesKey, JSON.stringify(SEED_EXPENSES));
      }
      if (!localStorage.getItem(this.vendorsKey)) {
        localStorage.setItem(this.vendorsKey, JSON.stringify(SEED_VENDORS));
      }
      if (!localStorage.getItem(this.tasksKey)) {
        localStorage.setItem(this.tasksKey, JSON.stringify(SEED_TASKS));
      }
      if (!localStorage.getItem(this.guestsKey)) {
        localStorage.setItem(this.guestsKey, JSON.stringify(SEED_GUESTS));
      }
      if (!localStorage.getItem(this.announcementsKey)) {
        localStorage.setItem(this.announcementsKey, JSON.stringify(SEED_ANNOUNCEMENTS));
      }
      if (!localStorage.getItem(this.communicationsKey)) {
        localStorage.setItem(this.communicationsKey, JSON.stringify(SEED_COMMUNICATIONS));
      }
      if (!localStorage.getItem(this.settingsKey)) {
        localStorage.setItem(this.settingsKey, JSON.stringify(DEFAULT_SETTINGS));
      }
      if (!localStorage.getItem(this.activeEventIdKey)) {
        localStorage.setItem(this.activeEventIdKey, SEED_EVENTS[0].id);
      }
    } catch (e) {
      console.warn('LocalStorage access restricted, falling back to memory state', e);
    }
  }

  // Active Event
  getActiveEventId(): string {
    return localStorage.getItem(this.activeEventIdKey) || (SEED_EVENTS[0] ? SEED_EVENTS[0].id : '');
  }

  setActiveEventId(id: string): void {
    localStorage.setItem(this.activeEventIdKey, id);
    window.dispatchEvent(new CustomEvent('planwise_event_changed', { detail: id }));
  }

  // Events CRUD
  getEvents(): EventDetails[] {
    const raw = localStorage.getItem(this.eventsKey);
    return raw ? JSON.parse(raw) : SEED_EVENTS;
  }

  getEventById(id: string): EventDetails | undefined {
    return this.getEvents().find(e => e.id === id);
  }

  getEventBySlug(slug: string): EventDetails | undefined {
    return this.getEvents().find(e => e.publicSlug === slug || e.id === slug);
  }

  saveEvent(event: EventDetails): void {
    const events = this.getEvents();
    const index = events.findIndex(e => e.id === event.id);
    if (index >= 0) {
      events[index] = { ...event, updatedAt: new Date().toISOString() };
    } else {
      events.push({ ...event, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(this.eventsKey, JSON.stringify(events));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  deleteEvent(id: string): void {
    const events = this.getEvents().filter(e => e.id !== id);
    localStorage.setItem(this.eventsKey, JSON.stringify(events));
    if (this.getActiveEventId() === id && events.length > 0) {
      this.setActiveEventId(events[0].id);
    }
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  // Schedules CRUD
  getSchedules(eventId: string): ScheduleItem[] {
    const raw = localStorage.getItem(this.schedulesKey);
    const all: ScheduleItem[] = raw ? JSON.parse(raw) : SEED_SCHEDULE;
    return all.filter(item => item.eventId === eventId).sort((a, b) => a.orderIndex - b.orderIndex);
  }

  saveScheduleItem(item: ScheduleItem): void {
    const raw = localStorage.getItem(this.schedulesKey);
    const all: ScheduleItem[] = raw ? JSON.parse(raw) : [];
    const index = all.findIndex(s => s.id === item.id);
    if (index >= 0) {
      all[index] = item;
    } else {
      all.push(item);
    }
    localStorage.setItem(this.schedulesKey, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  deleteScheduleItem(id: string): void {
    const raw = localStorage.getItem(this.schedulesKey);
    const all: ScheduleItem[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter(s => s.id !== id);
    localStorage.setItem(this.schedulesKey, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  saveBulkSchedules(items: ScheduleItem[]): void {
    const raw = localStorage.getItem(this.schedulesKey);
    let all: ScheduleItem[] = raw ? JSON.parse(raw) : [];
    for (const item of items) {
      const idx = all.findIndex(s => s.id === item.id);
      if (idx >= 0) {
        all[idx] = item;
      } else {
        all.push(item);
      }
    }
    localStorage.setItem(this.schedulesKey, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  // Expenses CRUD
  getExpenses(eventId: string): ExpenseItem[] {
    const raw = localStorage.getItem(this.expensesKey);
    const all: ExpenseItem[] = raw ? JSON.parse(raw) : SEED_EXPENSES;
    return all.filter(exp => exp.eventId === eventId);
  }

  saveExpense(expense: ExpenseItem): void {
    const raw = localStorage.getItem(this.expensesKey);
    const all: ExpenseItem[] = raw ? JSON.parse(raw) : [];
    const index = all.findIndex(e => e.id === expense.id);
    if (index >= 0) {
      all[index] = expense;
    } else {
      all.push(expense);
    }
    localStorage.setItem(this.expensesKey, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  deleteExpense(id: string): void {
    const raw = localStorage.getItem(this.expensesKey);
    const all: ExpenseItem[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter(e => e.id !== id);
    localStorage.setItem(this.expensesKey, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  saveBulkExpenses(items: ExpenseItem[]): void {
    const raw = localStorage.getItem(this.expensesKey);
    let all: ExpenseItem[] = raw ? JSON.parse(raw) : [];
    for (const item of items) {
      const idx = all.findIndex(e => e.id === item.id);
      if (idx >= 0) {
        all[idx] = item;
      } else {
        all.push(item);
      }
    }
    localStorage.setItem(this.expensesKey, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  // Vendors CRUD
  getVendors(eventId: string): Vendor[] {
    const raw = localStorage.getItem(this.vendorsKey);
    const all: Vendor[] = raw ? JSON.parse(raw) : SEED_VENDORS;
    return all.filter(v => v.eventId === eventId);
  }

  saveVendor(vendor: Vendor): void {
    const raw = localStorage.getItem(this.vendorsKey);
    const all: Vendor[] = raw ? JSON.parse(raw) : [];
    const index = all.findIndex(v => v.id === vendor.id);
    if (index >= 0) {
      all[index] = vendor;
    } else {
      all.push(vendor);
    }
    localStorage.setItem(this.vendorsKey, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  deleteVendor(id: string): void {
    const raw = localStorage.getItem(this.vendorsKey);
    const all: Vendor[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter(v => v.id !== id);
    localStorage.setItem(this.vendorsKey, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  // Tasks CRUD
  getTasks(eventId: string): EventTask[] {
    const raw = localStorage.getItem(this.tasksKey);
    const all: EventTask[] = raw ? JSON.parse(raw) : SEED_TASKS;
    return all.filter(t => t.eventId === eventId);
  }

  saveTask(task: EventTask): void {
    const raw = localStorage.getItem(this.tasksKey);
    const all: EventTask[] = raw ? JSON.parse(raw) : [];
    const index = all.findIndex(t => t.id === task.id);
    if (index >= 0) {
      all[index] = task;
    } else {
      all.push(task);
    }
    localStorage.setItem(this.tasksKey, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  deleteTask(id: string): void {
    const raw = localStorage.getItem(this.tasksKey);
    const all: EventTask[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter(t => t.id !== id);
    localStorage.setItem(this.tasksKey, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  saveBulkTasks(items: EventTask[]): void {
    const raw = localStorage.getItem(this.tasksKey);
    let all: EventTask[] = raw ? JSON.parse(raw) : [];
    for (const item of items) {
      const idx = all.findIndex(t => t.id === item.id);
      if (idx >= 0) {
        all[idx] = item;
      } else {
        all.push(item);
      }
    }
    localStorage.setItem(this.tasksKey, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  // Guests CRUD
  getGuests(eventId: string): Guest[] {
    const raw = localStorage.getItem(this.guestsKey);
    const all: Guest[] = raw ? JSON.parse(raw) : SEED_GUESTS;
    return all.filter(g => g.eventId === eventId);
  }

  getGuestByToken(token: string): Guest | undefined {
    const raw = localStorage.getItem(this.guestsKey);
    const all: Guest[] = raw ? JSON.parse(raw) : SEED_GUESTS;
    return all.find(g => g.secureToken === token);
  }

  saveGuest(guest: Guest): void {
    const raw = localStorage.getItem(this.guestsKey);
    const all: Guest[] = raw ? JSON.parse(raw) : [];
    const index = all.findIndex(g => g.id === guest.id);
    if (index >= 0) {
      all[index] = guest;
    } else {
      all.push(guest);
    }
    localStorage.setItem(this.guestsKey, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  deleteGuest(id: string): void {
    const raw = localStorage.getItem(this.guestsKey);
    const all: Guest[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter(g => g.id !== id);
    localStorage.setItem(this.guestsKey, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  saveBulkGuests(guests: Guest[]): void {
    const raw = localStorage.getItem(this.guestsKey);
    let all: Guest[] = raw ? JSON.parse(raw) : [];
    for (const g of guests) {
      const idx = all.findIndex(existing => existing.id === g.id || (existing.email && existing.email.toLowerCase() === g.email?.toLowerCase()));
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...g };
      } else {
        all.push(g);
      }
    }
    localStorage.setItem(this.guestsKey, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  // Announcements CRUD
  getAnnouncements(eventId: string): Announcement[] {
    const raw = localStorage.getItem(this.announcementsKey);
    const all: Announcement[] = raw ? JSON.parse(raw) : SEED_ANNOUNCEMENTS;
    return all.filter(a => a.eventId === eventId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  saveAnnouncement(announcement: Announcement): void {
    const raw = localStorage.getItem(this.announcementsKey);
    const all: Announcement[] = raw ? JSON.parse(raw) : [];
    const index = all.findIndex(a => a.id === announcement.id);
    if (index >= 0) {
      all[index] = announcement;
    } else {
      all.push(announcement);
    }
    localStorage.setItem(this.announcementsKey, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  deleteAnnouncement(id: string): void {
    const raw = localStorage.getItem(this.announcementsKey);
    const all: Announcement[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter(a => a.id !== id);
    localStorage.setItem(this.announcementsKey, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  // Communications CRUD
  getCommunications(eventId: string): CommunicationLog[] {
    const raw = localStorage.getItem(this.communicationsKey);
    const all: CommunicationLog[] = raw ? JSON.parse(raw) : SEED_COMMUNICATIONS;
    return all.filter(c => c.eventId === eventId).sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
  }

  saveCommunication(log: CommunicationLog): void {
    const raw = localStorage.getItem(this.communicationsKey);
    const all: CommunicationLog[] = raw ? JSON.parse(raw) : [];
    const index = all.findIndex(c => c.id === log.id);
    if (index >= 0) {
      all[index] = log;
    } else {
      all.unshift(log);
    }
    localStorage.setItem(this.communicationsKey, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }

  // App Settings
  getSettings(): AppSettings {
    const raw = localStorage.getItem(this.settingsKey);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  }

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(this.settingsKey, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('planwise_settings_updated'));
  }

  getOrganizerPin(): string {
    const s = this.getSettings();
    return s.organizerPin || '7989';
  }

  setOrganizerPin(newPin: string): void {
    const s = this.getSettings();
    this.saveSettings({ ...s, organizerPin: newPin });
  }

  // Export / Import / Reset
  exportFullBackup(): string {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      events: this.getEvents(),
      schedules: JSON.parse(localStorage.getItem(this.schedulesKey) || '[]'),
      expenses: JSON.parse(localStorage.getItem(this.expensesKey) || '[]'),
      vendors: JSON.parse(localStorage.getItem(this.vendorsKey) || '[]'),
      tasks: JSON.parse(localStorage.getItem(this.tasksKey) || '[]'),
      guests: JSON.parse(localStorage.getItem(this.guestsKey) || '[]'),
      announcements: JSON.parse(localStorage.getItem(this.announcementsKey) || '[]'),
      communications: JSON.parse(localStorage.getItem(this.communicationsKey) || '[]'),
    };
    return JSON.stringify(backup, null, 2);
  }

  importBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.events && Array.isArray(data.events)) {
        localStorage.setItem(this.eventsKey, JSON.stringify(data.events));
        if (data.schedules) localStorage.setItem(this.schedulesKey, JSON.stringify(data.schedules));
        if (data.expenses) localStorage.setItem(this.expensesKey, JSON.stringify(data.expenses));
        if (data.vendors) localStorage.setItem(this.vendorsKey, JSON.stringify(data.vendors));
        if (data.tasks) localStorage.setItem(this.tasksKey, JSON.stringify(data.tasks));
        if (data.guests) localStorage.setItem(this.guestsKey, JSON.stringify(data.guests));
        if (data.announcements) localStorage.setItem(this.announcementsKey, JSON.stringify(data.announcements));
        if (data.communications) localStorage.setItem(this.communicationsKey, JSON.stringify(data.communications));
        if (data.events[0]) this.setActiveEventId(data.events[0].id);
        window.dispatchEvent(new CustomEvent('planwise_data_updated'));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import backup', e);
      return false;
    }
  }

  resetToDemo(): void {
    localStorage.setItem(this.eventsKey, JSON.stringify(SEED_EVENTS));
    localStorage.setItem(this.schedulesKey, JSON.stringify(SEED_SCHEDULE));
    localStorage.setItem(this.expensesKey, JSON.stringify(SEED_EXPENSES));
    localStorage.setItem(this.vendorsKey, JSON.stringify(SEED_VENDORS));
    localStorage.setItem(this.tasksKey, JSON.stringify(SEED_TASKS));
    localStorage.setItem(this.guestsKey, JSON.stringify(SEED_GUESTS));
    localStorage.setItem(this.announcementsKey, JSON.stringify(SEED_ANNOUNCEMENTS));
    localStorage.setItem(this.communicationsKey, JSON.stringify(SEED_COMMUNICATIONS));
    localStorage.setItem(this.activeEventIdKey, SEED_EVENTS[0].id);
    window.dispatchEvent(new CustomEvent('planwise_data_updated'));
  }
}

export const storage = new StorageService();
