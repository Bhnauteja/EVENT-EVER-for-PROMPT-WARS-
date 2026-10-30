import {
  EventDetails,
  Guest,
  MessageWorkflowType,
  CommunicationLog,
  MessageDeliveryStatus
} from '../types';
import { storage } from './storage';

export interface WhatsAppTemplate {
  name: string;
  category: string;
  language: string;
  bodyText: string;
  variables: string[];
}

export const OFFICIAL_WHATSAPP_TEMPLATES: Record<MessageWorkflowType, WhatsAppTemplate> = {
  bulk_invitation: {
    name: 'event_invitation_v2',
    category: 'MARKETING',
    language: 'en_US',
    bodyText: 'Hi {{1}}, you are warmly invited to {{2}} on {{3}} at {{4}}. Please tap the link below to confirm your RSVP and view full details: {{5}}',
    variables: ['Guest Name', 'Event Name', 'Date', 'Venue', 'RSVP Link']
  },
  rsvp_reminder: {
    name: 'event_rsvp_reminder_v1',
    category: 'UTILITY',
    language: 'en_US',
    bodyText: 'Hello {{1}}, this is a friendly reminder to submit your RSVP for {{2}} taking place on {{3}}. We need final headcounts by next week! Confirm here: {{4}}',
    variables: ['Guest Name', 'Event Name', 'Date', 'RSVP Link']
  },
  venue_date_reminder: {
    name: 'event_logistics_alert_v1',
    category: 'UTILITY',
    language: 'en_US',
    bodyText: 'Hi {{1}}, {{2}} is coming up in 48 hours! Venue: {{3}} (Directions: {{4}}). Dress Code: {{5}}. See you soon!',
    variables: ['Guest Name', 'Event Name', 'Venue', 'Directions Link', 'Dress Code']
  },
  schedule_notification: {
    name: 'event_schedule_release_v1',
    category: 'UTILITY',
    language: 'en_US',
    bodyText: 'Hi {{1}}, the official schedule for {{2}} has been published! Check out the lineup, workshops, and timings here: {{3}}',
    variables: ['Guest Name', 'Event Name', 'Schedule Link']
  },
  event_day_update: {
    name: 'event_live_update_v1',
    category: 'UTILITY',
    language: 'en_US',
    bodyText: '🚨 Live Update for {{1}} attendees: {{2}}. View real-time schedule: {{3}}',
    variables: ['Event Name', 'Announcement Content', 'Live Link']
  },
  announcement_blast: {
    name: 'event_general_announcement_v1',
    category: 'UTILITY',
    language: 'en_US',
    bodyText: 'Notice for {{1}} guests: {{2}}. Learn more at {{3}}',
    variables: ['Event Name', 'Announcement Message', 'Event URL']
  },
  custom_broadcast: {
    name: 'event_custom_broadcast_v1',
    category: 'UTILITY',
    language: 'en_US',
    bodyText: '{{1}}: {{2}}',
    variables: ['Event Name', 'Custom Message']
  }
};

export class CommunicationService {
  /**
   * Generates personalized RSVP and event hub link for a guest
   */
  static getGuestEventUrl(event: EventDetails, guest?: Guest): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://planwise.app';
    const slug = event.publicSlug || event.id;
    if (guest && guest.secureToken) {
      return `${origin}?event=${slug}&token=${guest.secureToken}`;
    }
    return `${origin}?event=${slug}`;
  }

  /**
   * Renders the message content substituting variables
   */
  static renderMessage(workflowType: MessageWorkflowType, event: EventDetails, guest: Guest): string {
    const rsvpUrl = this.getGuestEventUrl(event, guest);
    const dateFormatted = new Date(event.startDate).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    switch (workflowType) {
      case 'bulk_invitation':
        return `Hi ${guest.name}! You are cordially invited to *${event.name}* on ${dateFormatted} at ${event.venueName}.

Please confirm your RSVP and view full schedule & location details here:
👉 ${rsvpUrl}`;

      case 'rsvp_reminder':
        return `Hi ${guest.name}, this is a gentle reminder to submit your RSVP for *${event.name}* on ${dateFormatted}. We are locking in catering headcounts shortly!

Tap here to confirm attendance:
👉 ${rsvpUrl}`;

      case 'venue_date_reminder':
        return `Hi ${guest.name}! *${event.name}* is approaching.
📍 Location: ${event.venueName} (${event.venueAddress})
👔 Dress Code: ${event.dressCode || 'Smart Casual'}
🚗 Parking: ${event.parkingInfo || 'Available on-site'}

Full event hub: ${rsvpUrl}`;

      case 'schedule_notification':
        return `Hi ${guest.name}, the updated schedule for *${event.name}* is now live! View the complete timeline and speakers:
👉 ${rsvpUrl}`;

      case 'event_day_update':
        return `📢 *${event.name} Event-Day Notice*
Welcome! Registration and badges are open. Please have your check-in code ready:
👉 ${rsvpUrl}`;

      default:
        return `Hi ${guest.name}, this is an update regarding *${event.name}*. View full details: ${rsvpUrl}`;
    }
  }

  /**
   * Generates a clean WhatsApp Click-to-Chat URL (wa.me)
   * This is the compliant manual fallback that opens WhatsApp with pre-filled personalized text.
   */
  static generateWhatsAppClickToChatUrl(phone: string, text: string): string {
    // Sanitize phone number (strip spaces, dashes, brackets, leading zeros)
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(text);
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }

  /**
   * Evaluates recipient eligibility immediately before sending
   * Prevents sending reminders to guests who have already responded.
   */
  static isGuestEligibleForWorkflow(guest: Guest, workflowType: MessageWorkflowType): { eligible: boolean; reason?: string } {
    if (!guest.phone) {
      return { eligible: false, reason: 'No phone number provided' };
    }

    if (workflowType === 'rsvp_reminder') {
      if (guest.rsvpStatus === 'attending') {
        return { eligible: false, reason: 'Guest has already confirmed attending' };
      }
      if (guest.rsvpStatus === 'declined') {
        return { eligible: false, reason: 'Guest has declined invitation' };
      }
    }

    return { eligible: true };
  }

  /**
   * Sends or queues a message through the provider abstraction.
   * If official Meta Cloud API keys are configured, attempts the real API call.
   * Otherwise, accurately logs status as 'manual_opened' or 'draft'.
   */
  static async sendMessage(
    event: EventDetails,
    guest: Guest,
    workflowType: MessageWorkflowType
  ): Promise<{ success: boolean; status: MessageDeliveryStatus; message: string; waMeUrl?: string }> {
    const eligibility = this.isGuestEligibleForWorkflow(guest, workflowType);
    if (!eligibility.eligible) {
      return {
        success: false,
        status: 'failed',
        message: eligibility.reason || 'Guest is ineligible for this workflow'
      };
    }

    const messageContent = this.renderMessage(workflowType, event, guest);
    const settings = storage.getSettings();

    // Check if official WhatsApp Cloud API is configured
    if (settings.whatsappAccessToken && settings.whatsappPhoneNumberId) {
      try {
        const response = await fetch(`https://graph.facebook.com/v20.0/${settings.whatsappPhoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${settings.whatsappAccessToken}`
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: guest.phone?.replace(/[^0-9]/g, ''),
            type: 'text',
            text: { preview_url: true, body: messageContent }
          })
        });

        if (response.ok) {
          const resData = await response.json();
          const log: CommunicationLog = {
            id: 'comm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            eventId: event.id,
            workflowType,
            guestId: guest.id,
            recipientName: guest.name,
            recipientPhone: guest.phone || '',
            messageContent,
            status: 'sent_via_api',
            sentAt: new Date().toISOString(),
            providerResponse: `WhatsApp Cloud API 200 OK (wamid: ${resData.messages?.[0]?.id || 'delivered'})`
          };
          storage.saveCommunication(log);
          return { success: true, status: 'sent_via_api', message: 'Delivered via official WhatsApp Cloud API' };
        } else {
          const errData = await response.json();
          throw new Error(errData.error?.message || 'API request failed');
        }
      } catch (e: any) {
        console.warn('WhatsApp API delivery failed:', e);
        const log: CommunicationLog = {
          id: 'comm-' + Date.now(),
          eventId: event.id,
          workflowType,
          guestId: guest.id,
          recipientName: guest.name,
          recipientPhone: guest.phone || '',
          messageContent,
          status: 'failed',
          sentAt: new Date().toISOString(),
          errorReason: e.message || 'WhatsApp Cloud API request failed'
        };
        storage.saveCommunication(log);
        return { success: false, status: 'failed', message: e.message || 'API delivery failed' };
      }
    }

    // Honest manual Click-to-Chat fallback
    const waMeUrl = this.generateWhatsAppClickToChatUrl(guest.phone || '', messageContent);
    const log: CommunicationLog = {
      id: 'comm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      eventId: event.id,
      workflowType,
      guestId: guest.id,
      recipientName: guest.name,
      recipientPhone: guest.phone || '',
      messageContent,
      status: 'manual_opened',
      sentAt: new Date().toISOString(),
      providerResponse: 'Direct WhatsApp Click-to-Chat opened in browser/app'
    };
    storage.saveCommunication(log);

    return {
      success: true,
      status: 'manual_opened',
      message: 'WhatsApp Click-to-Chat ready (official API keys not configured)',
      waMeUrl
    };
  }
}
