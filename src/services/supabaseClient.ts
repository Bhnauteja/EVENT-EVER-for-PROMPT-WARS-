import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { storage } from './storage';
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

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

/**
 * Deterministically maps any arbitrary string ID (e.g. 'event-hackathon-2026', 'sch-1')
 * into a valid RFC 4122 v4 UUID format compatible with PostgreSQL UUID columns.
 * If the string is already a valid UUID, returns it unchanged.
 */
export function toValidUUID(str: string): string {
  if (!str) return '00000000-0000-4000-8000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) {
    return str.toLowerCase();
  }

  // Deterministic 128-bit hash from string
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x67452301, h4 = 0xefcdab89;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3812015801);
    h4 = Math.imul(h4 ^ ch, 2718281829);
  }

  const hex1 = ((h1 >>> 0) % 0xFFFFFFFF).toString(16).padStart(8, '0');
  const hex2 = ((h2 >>> 0) % 0xFFFFFFFF).toString(16).padStart(8, '0');
  const hex3 = ((h3 >>> 0) % 0xFFFFFFFF).toString(16).padStart(8, '0');
  const hex4 = ((h4 >>> 0) % 0xFFFFFFFF).toString(16).padStart(8, '0');

  const full = (hex1 + hex2 + hex3 + hex4).slice(0, 32);
  const p1 = full.slice(0, 8);
  const p2 = full.slice(8, 12);
  const p3 = '4' + full.slice(13, 16);
  const p4 = ((parseInt(full.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + full.slice(17, 20);
  const p5 = full.slice(20, 32);

  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}

/**
 * Converts nullable or empty string IDs to UUID or null.
 */
export function toNullableUUID(str?: string | null): string | null {
  if (!str || !str.trim()) return null;
  return toValidUUID(str.trim());
}

/**
 * Sanitizes date strings for PostgreSQL DATE columns.
 */
export function toNullableDate(val?: string | null): string | null {
  if (!val || !val.trim()) return null;
  if (val.includes('T')) {
    return val.split('T')[0];
  }
  return val.trim();
}

export function getSupabaseClient(): SupabaseClient | null {
  const settings = storage.getSettings();
  const url = import.meta.env.VITE_SUPABASE_URL || settings.supabaseUrl || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || settings.supabaseAnonKey || '';

  if (!url || !key) {
    return null;
  }

  if (cachedClient && lastUrl === url && lastKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key);
    lastUrl = url;
    lastKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

function mapSupabaseEventToLocal(data: any): EventDetails {
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    description: data.description || '',
    startDate: data.start_date,
    endDate: data.end_date,
    timezone: data.timezone || 'UTC',
    venueName: data.venue_name || '',
    venueAddress: data.venue_address || '',
    directionsUrl: data.directions_url || undefined,
    estimatedGuests: data.estimated_guests || 0,
    totalPlannedBudget: Number(data.total_planned_budget) || 0,
    currency: data.currency || 'USD',
    dressCode: data.dress_code || undefined,
    parkingInfo: data.parking_info || undefined,
    specialInstructions: data.special_instructions || undefined,
    organizerLanguage: data.organizer_language || 'en',
    isPublished: data.is_published ?? true,
    publicSlug: data.public_slug || data.id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export class SupabaseSyncService {
  /**
   * Tests the connection by querying the events table
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        message: 'Supabase credentials are not configured. Enter your Project URL & Anon Key in Settings.'
      };
    }

    try {
      const { data, error } = await client.from('events').select('id').limit(1);
      if (error) {
        return {
          success: false,
          message: `Connected to Supabase project, but query returned error: ${error.message}. Make sure you ran supabase/schema.sql in the SQL Editor.`
        };
      }
      return {
        success: true,
        message: 'Successfully connected to your Supabase PostgreSQL database!'
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Connection failed'
      };
    }
  }

  /**
   * Pushes the current local event records into your Supabase database
   */
  static async pushLocalEventToCloud(event: EventDetails): Promise<{ success: boolean; message: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Supabase is not configured' };
    }

    try {
      const cloudEventId = toValidUUID(event.id);

      // 1. Upsert Event
      const { error: eventError } = await client.from('events').upsert({
        id: cloudEventId,
        name: event.name,
        type: event.type,
        description: event.description || '',
        start_date: event.startDate,
        end_date: event.endDate,
        timezone: event.timezone || 'UTC',
        venue_name: event.venueName,
        venue_address: event.venueAddress,
        directions_url: event.directionsUrl || null,
        estimated_guests: event.estimatedGuests || 0,
        total_planned_budget: event.totalPlannedBudget || 0,
        currency: event.currency || 'USD',
        dress_code: event.dressCode || null,
        parking_info: event.parkingInfo || null,
        special_instructions: event.specialInstructions || null,
        organizer_language: event.organizerLanguage || 'en',
        is_published: event.isPublished,
        public_slug: event.publicSlug || event.id,
        updated_at: new Date().toISOString()
      });

      if (eventError) throw eventError;

      // 2. Upsert Schedules
      const schedules = storage.getSchedules(event.id);
      if (schedules.length > 0) {
        const scheduleRows = schedules.map(s => ({
          id: toValidUUID(s.id),
          event_id: cloudEventId,
          title: s.title,
          description: s.description || null,
          start_time: s.startTime,
          end_time: s.endTime,
          date: toNullableDate(s.date) || toNullableDate(event.startDate),
          location: s.location || '',
          responsible_person: s.responsiblePerson || null,
          status: s.status || 'scheduled',
          is_guest_visible: s.isGuestVisible ?? true,
          prep_notes: s.prepNotes || null,
          order_index: s.orderIndex || 0
        }));
        const { error: schError } = await client.from('schedules').upsert(scheduleRows);
        if (schError) throw schError;
      }

      // 3. Upsert Vendors
      const vendors = storage.getVendors(event.id);
      if (vendors.length > 0) {
        const vendorRows = vendors.map(v => ({
          id: toValidUUID(v.id),
          event_id: cloudEventId,
          name: v.name,
          category: v.category,
          contact_person: v.contactPerson || null,
          email: v.email || null,
          phone: v.phone || null,
          website: v.website || null,
          quoted_cost: v.quotedCost || 0,
          agreed_cost: v.agreedCost || 0,
          paid_amount: v.paidAmount || 0,
          booking_status: v.bookingStatus || 'inquiry',
          payment_status: v.paymentStatus || 'unpaid',
          delivery_date: toNullableDate(v.deliveryDate),
          notes: v.notes || null
        }));
        const { error: venError } = await client.from('vendors').upsert(vendorRows);
        if (venError) throw venError;
      }

      // 4. Upsert Expenses
      const expenses = storage.getExpenses(event.id);
      if (expenses.length > 0) {
        const expenseRows = expenses.map(e => ({
          id: toValidUUID(e.id),
          event_id: cloudEventId,
          title: e.title,
          category: e.category,
          estimated_cost: e.estimatedCost || 0,
          quoted_cost: e.quotedCost || 0,
          committed_cost: e.committedCost || 0,
          paid_amount: e.paidAmount || 0,
          actual_cost: e.actualCost || 0,
          status: e.status || 'unpaid',
          commitment_level: e.commitmentLevel || 'estimated',
          vendor_id: toNullableUUID(e.vendorId),
          due_date: toNullableDate(e.dueDate),
          payment_method: e.paymentMethod || null,
          notes: e.notes || null
        }));
        const { error: expError } = await client.from('expenses').upsert(expenseRows);
        if (expError) throw expError;
      }

      // 5. Upsert Tasks
      const tasks = storage.getTasks(event.id);
      if (tasks.length > 0) {
        const taskRows = tasks.map(t => ({
          id: toValidUUID(t.id),
          event_id: cloudEventId,
          title: t.title,
          description: t.description || null,
          category: t.category || 'General',
          priority: t.priority || 'medium',
          status: t.status || 'pending',
          deadline: toNullableDate(t.deadline),
          assigned_to: t.assignedTo || null,
          related_vendor_id: toNullableUUID(t.relatedVendorId),
          related_schedule_id: toNullableUUID(t.relatedScheduleId),
          private_notes: t.privateNotes || null
        }));
        const { error: taskError } = await client.from('tasks').upsert(taskRows);
        if (taskError) throw taskError;
      }

      // 6. Upsert Guests
      const guests = storage.getGuests(event.id);
      if (guests.length > 0) {
        const guestRows = guests.map(g => ({
          id: toValidUUID(g.id),
          event_id: cloudEventId,
          name: g.name,
          email: g.email || null,
          phone: g.phone || null,
          rsvp_status: g.rsvpStatus || 'awaiting',
          invitation_status: g.invitationStatus || 'not_sent',
          preferred_language: g.preferredLanguage || 'en',
          secure_token: g.secureToken,
          plus_one_allowed: g.plusOneAllowed || false,
          plus_one_count: g.plusOneCount || 0,
          dietary_restrictions: g.dietaryRestrictions || null,
          table_number: g.tableNumber || null,
          guest_notes: g.guestNotes || null,
          organizer_notes: g.organizerNotes || null
        }));
        const { error: gstError } = await client.from('guests').upsert(guestRows);
        if (gstError) throw gstError;
      }

      // 7. Upsert Announcements
      const announcements = storage.getAnnouncements(event.id);
      if (announcements.length > 0) {
        const announcementRows = announcements.map(a => ({
          id: toValidUUID(a.id),
          event_id: cloudEventId,
          title: a.title,
          content: a.content,
          urgency: a.urgency || 'normal',
          target_audience: a.targetAudience || 'all',
          is_published: a.isPublished ?? true,
          published_at: a.publishedAt || new Date().toISOString()
        }));
        const { error: annError } = await client.from('announcements').upsert(announcementRows);
        if (annError) throw annError;
      }

      return {
        success: true,
        message: `Successfully synchronized "${event.name}" and all related schedules, guests, vendors, tasks, and budgets to your Supabase database!`
      };
    } catch (err: any) {
      console.error('Supabase sync error:', err);
      return {
        success: false,
        message: err.message || 'Sync failed'
      };
    }
  }

  /**
   * Pulls published event info from Supabase for public guest hub
   */
  static async fetchPublishedEventFromCloud(slugOrId: string): Promise<EventDetails | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      // 1. Search by public_slug
      const { data: bySlug, error: slugErr } = await client
        .from('events')
        .select('*')
        .eq('public_slug', slugOrId)
        .eq('is_published', true)
        .maybeSingle();

      if (!slugErr && bySlug) {
        return mapSupabaseEventToLocal(bySlug);
      }

      // 2. Search by UUID (or deterministic UUID mapping)
      const targetUUID = toValidUUID(slugOrId);
      const { data: byId, error: idErr } = await client
        .from('events')
        .select('*')
        .eq('id', targetUUID)
        .eq('is_published', true)
        .maybeSingle();

      if (!idErr && byId) {
        return mapSupabaseEventToLocal(byId);
      }

      return null;
    } catch (e) {
      console.error('Error fetching cloud event:', e);
      return null;
    }
  }

  /**
   * Submits an RSVP record directly to Supabase cloud using secure guest token
   */
  static async submitCloudRSVP(
    token: string,
    rsvpStatus: string,
    name: string,
    dietary?: string,
    plusOneCount?: number,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Supabase client not configured' };
    }

    try {
      const { error } = await client
        .from('guests')
        .update({
          name,
          rsvp_status: rsvpStatus,
          dietary_restrictions: dietary || null,
          plus_one_count: plusOneCount || 0,
          guest_notes: notes || null,
          rsvp_submitted_at: new Date().toISOString()
        })
        .eq('secure_token', token);

      if (error) throw error;
      return { success: true, message: 'RSVP submitted directly to cloud database!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to submit cloud RSVP' };
    }
  }
}
