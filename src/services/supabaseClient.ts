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
      // 1. Upsert Event
      const { error: eventError } = await client.from('events').upsert({
        id: event.id,
        name: event.name,
        type: event.type,
        description: event.description,
        start_date: event.startDate,
        end_date: event.endDate,
        timezone: event.timezone,
        venue_name: event.venueName,
        venue_address: event.venueAddress,
        directions_url: event.directionsUrl,
        estimated_guests: event.estimatedGuests,
        total_planned_budget: event.totalPlannedBudget,
        currency: event.currency,
        dress_code: event.dressCode,
        parking_info: event.parkingInfo,
        special_instructions: event.specialInstructions,
        organizer_language: event.organizerLanguage,
        is_published: event.isPublished,
        public_slug: event.publicSlug,
        updated_at: new Date().toISOString()
      });

      if (eventError) throw eventError;

      // 2. Upsert Schedules
      const schedules = storage.getSchedules(event.id);
      if (schedules.length > 0) {
        const scheduleRows = schedules.map(s => ({
          id: s.id,
          event_id: event.id,
          title: s.title,
          description: s.description,
          start_time: s.startTime,
          end_time: s.endTime,
          location: s.location,
          responsible_person: s.responsiblePerson,
          status: s.status,
          is_guest_visible: s.isGuestVisible,
          prep_notes: s.prepNotes,
          order_index: s.orderIndex
        }));
        await client.from('schedules').upsert(scheduleRows);
      }

      // 3. Upsert Guests
      const guests = storage.getGuests(event.id);
      if (guests.length > 0) {
        const guestRows = guests.map(g => ({
          id: g.id,
          event_id: event.id,
          name: g.name,
          email: g.email,
          phone: g.phone,
          rsvp_status: g.rsvpStatus,
          invitation_status: g.invitationStatus,
          preferred_language: g.preferredLanguage,
          secure_token: g.secureToken,
          plus_one_allowed: g.plusOneAllowed,
          plus_one_count: g.plusOneCount,
          dietary_restrictions: g.dietaryRestrictions,
          table_number: g.tableNumber,
          guest_notes: g.guestNotes,
          organizer_notes: g.organizerNotes
        }));
        await client.from('guests').upsert(guestRows);
      }

      return {
        success: true,
        message: `Successfully synchronized "${event.name}" and all related schedules & guests to your Supabase database!`
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
      const { data, error } = await client
        .from('events')
        .select('*')
        .or(`public_slug.eq.${slugOrId},id.eq.${slugOrId}`)
        .eq('is_published', true)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        type: data.type,
        description: data.description,
        startDate: data.start_date,
        endDate: data.end_date,
        timezone: data.timezone,
        venueName: data.venue_name,
        venueAddress: data.venue_address,
        directionsUrl: data.directions_url,
        estimatedGuests: data.estimated_guests,
        totalPlannedBudget: Number(data.total_planned_budget),
        currency: data.currency,
        dressCode: data.dress_code,
        parkingInfo: data.parking_info,
        specialInstructions: data.special_instructions,
        organizerLanguage: data.organizer_language,
        isPublished: data.is_published,
        publicSlug: data.public_slug,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (e) {
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
          dietary_restrictions: dietary,
          plus_one_count: plusOneCount || 0,
          guest_notes: notes,
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
