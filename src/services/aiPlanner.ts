import {
  EventType,
  EventDetails,
  AIPromptPlanRequest,
  AIPeriodPlan,
  ScheduleItem,
  ExpenseItem,
  EventTask
} from '../types';
import { storage } from './storage';

export class AIPlannerService {
  /**
   * Generates a comprehensive event plan.
   * If Gemini / OpenAI API key is configured in settings, it queries the live AI endpoint.
   * Otherwise, it uses the deterministic expert event architecture engine tailored to the event parameters.
   */
  static async generatePlan(request: AIPromptPlanRequest): Promise<AIPeriodPlan> {
    const settings = storage.getSettings();

    if (settings.geminiApiKey) {
      try {
        return await this.callGeminiAPI(request, settings.geminiApiKey);
      } catch (err) {
        console.warn('Gemini API call failed, falling back to deterministic expert engine:', err);
      }
    } else if (settings.openaiApiKey) {
      try {
        return await this.callOpenAIAPI(request, settings.openaiApiKey);
      } catch (err) {
        console.warn('OpenAI API call failed, falling back to deterministic expert engine:', err);
      }
    }

    // Deterministic expert planning engine
    return this.generateDeterministicPlan(request);
  }

  /**
   * Deterministic expert system providing realistic, tailored planning records
   * based on the exact event type, guest count, budget, and location.
   */
  static generateDeterministicPlan(req: AIPromptPlanRequest): AIPeriodPlan {
    const { eventType, eventName, guestCount, totalBudget, currency, location } = req;

    if (eventType === 'wedding') {
      return {
        timelineSuggestions: [
          {
            title: 'Vendor Arrivals & Floral Installation',
            description: 'Florists, lighting technicians, and sound engineers arrive on-site.',
            startTime: '13:00',
            endTime: '15:30',
            location: location || 'Main Courtyard',
            isGuestVisible: false
          },
          {
            title: 'Guest Arrival & Welcome Refreshments',
            description: 'Sparkling cider, infused waters, and live harp/violin prelude.',
            startTime: '16:00',
            endTime: '16:30',
            location: location || 'Arrival Terrace',
            isGuestVisible: true
          },
          {
            title: 'Ceremony & Exchange of Vows',
            description: 'Processional, exchange of vows and rings, first kiss as partners.',
            startTime: '16:30',
            endTime: '17:15',
            location: location || 'Ceremony Lawn',
            isGuestVisible: true
          },
          {
            title: 'Cocktail Hour & Sunset Photos',
            description: 'Canapés, signature cocktails, and golden hour portrait sessions.',
            startTime: '17:15',
            endTime: '18:30',
            location: location || 'Garden Patio',
            isGuestVisible: true
          },
          {
            title: 'Grand Entrance & Plated Dinner',
            description: 'Couple introduction, 3-course dinner, followed by heartfelt toasts.',
            startTime: '18:30',
            endTime: '20:30',
            location: location || 'Grand Reception Tent',
            isGuestVisible: true
          },
          {
            title: 'Cake Cutting & First Dance',
            description: 'Couple dance, parent dances, and sweet tier cutting.',
            startTime: '20:30',
            endTime: '21:00',
            location: location || 'Dance Pavilion',
            isGuestVisible: true
          },
          {
            title: 'Open Dance Floor & Live DJ',
            description: 'High-energy celebration with dessert buffet and late-night bites.',
            startTime: '21:00',
            endTime: '23:30',
            location: location || 'Dance Pavilion',
            isGuestVisible: true
          },
          {
            title: 'Sparkler Send-Off & Guest Departure',
            description: 'Festive sparkler farewell line and organized guest shuttles.',
            startTime: '23:30',
            endTime: '23:59',
            location: location || 'Main Gate',
            isGuestVisible: true
          }
        ],
        budgetAllocations: [
          {
            category: 'Venue',
            title: 'Estate / Hall Venue Rental & Site Prep',
            estimatedCost: Math.round(totalBudget * 0.30),
            notes: 'Benchmark 30% of total budget for full-day ceremony and reception grounds.'
          },
          {
            category: 'Food & Catering',
            title: 'Full Dinner Catering & Bar Package',
            estimatedCost: Math.round(totalBudget * 0.35),
            notes: `Estimated at ${(Math.round(totalBudget * 0.35) / (guestCount || 1)).toFixed(0)} ${currency} per head for ${guestCount} guests.`
          },
          {
            category: 'Photography & Video',
            title: '8-Hour Photography & Cinema Drone Coverage',
            estimatedCost: Math.round(totalBudget * 0.12),
            notes: 'Captures getting-ready, ceremony, portraits, and reception highlights.'
          },
          {
            category: 'Decoration',
            title: 'Ceremony Arch, Centerpieces & Floral Design',
            estimatedCost: Math.round(totalBudget * 0.10),
            notes: 'Covers floral arbor, table runners, candles, and welcoming signage.'
          },
          {
            category: 'Entertainment',
            title: 'Ceremony Musician & Reception DJ / Sound Pack',
            estimatedCost: Math.round(totalBudget * 0.07),
            notes: 'Live acoustic strings for vows plus 4-hour DJ sound system.'
          },
          {
            category: 'Miscellaneous',
            title: 'Contingency Reserve & Marriage Licensing Fees',
            estimatedCost: Math.round(totalBudget * 0.06),
            notes: 'Recommended emergency reserve for tips, weather buffers, and permits.'
          }
        ],
        taskChecklist: [
          {
            title: 'Book and Deposit Venue & Secure Date Agreement',
            category: 'Venue',
            priority: 'urgent',
            deadlineDaysBefore: 180,
            description: 'Sign contract and verify noise ordinance curfew and vendor insurance policy.'
          },
          {
            title: 'Catering Menu Tasting & Dietary Selections',
            category: 'Food & Catering',
            priority: 'high',
            deadlineDaysBefore: 90,
            description: 'Select appetizers, main entrées, and finalize vegetarian/vegan/halal alternatives.'
          },
          {
            title: 'Send Digital Invitations with Secure RSVP Tokens',
            category: 'Guest Relations',
            priority: 'high',
            deadlineDaysBefore: 60,
            description: 'Trigger personalized WhatsApp invitations and email links via PlanWise.'
          },
          {
            title: 'Lock In Seating Chart & Final Headcount for Caterer',
            category: 'Guest Relations',
            priority: 'urgent',
            deadlineDaysBefore: 14,
            description: 'Cross-reference confirmed RSVPs and dietary notes with the catering manager.'
          },
          {
            title: 'Run Timeline Walkthrough with Photographer and DJ',
            category: 'Day-of Logistics',
            priority: 'medium',
            deadlineDaysBefore: 7,
            description: 'Verify song cues for processional and golden hour sunset shooting window.'
          }
        ],
        vendorRequirements: [
          {
            category: 'Food & Catering',
            serviceNeeded: 'Licensed Caterer with Full Service Staff',
            estimatedCostRange: `${Math.round(totalBudget * 0.30)} - ${Math.round(totalBudget * 0.38)} ${currency}`,
            keyQuestions: 'Are plateware, glassware, linens, and bar staff included in the quote?'
          },
          {
            category: 'Photography & Video',
            serviceNeeded: 'Lead Photographer + Second Shooter',
            estimatedCostRange: `${Math.round(totalBudget * 0.10)} - ${Math.round(totalBudget * 0.14)} ${currency}`,
            keyQuestions: 'What is the turnaround time for the digital gallery and sneak-peek photos?'
          },
          {
            category: 'Decoration',
            serviceNeeded: 'Florist & Decor Styling Specialist',
            estimatedCostRange: `${Math.round(totalBudget * 0.08)} - ${Math.round(totalBudget * 0.12)} ${currency}`,
            keyQuestions: 'Do you handle midnight tear-down and floral repurposed arrangements?'
          }
        ],
        costSavingIdeas: [
          {
            title: 'Repurpose Ceremony Florals for the Reception Tables',
            category: 'Decoration',
            potentialSavings: Math.round(totalBudget * 0.035),
            tradeOff: 'Requires 1 helper to transfer altar urns to the head sweetheart table during cocktail hour.'
          },
          {
            title: 'Feature a Champagne & Signature Cocktail Station vs Unlimited Top-Shelf Bar',
            category: 'Food & Catering',
            potentialSavings: Math.round(totalBudget * 0.05),
            tradeOff: 'Guests enjoy 2 curated specialty drinks plus wine/beer instead of open liquor shelf.'
          },
          {
            title: 'Digital Invitations & Online RSVP Portal (PlanWise)',
            category: 'Invitations',
            potentialSavings: Math.round(totalBudget * 0.02),
            tradeOff: 'Replaces expensive physical letterpress paper and postage fees with zero RSVP loss.'
          }
        ],
        riskAndContingencies: [
          {
            risk: 'Inclement Weather on Outdoor Ceremony Lawn',
            mitigation: 'Reserve marquee tent walls or confirm indoor salon contingency 72 hours prior.',
            severity: 'high'
          },
          {
            risk: 'Guests Overstaying and Incurring Venue Overtime Penalties',
            mitigation: 'Schedule final song 30 minutes before venue license curfew.',
            severity: 'medium'
          },
          {
            risk: 'Late RSVPs skewing catering order',
            mitigation: 'Automate WhatsApp reminders 2 weeks before caterer lock-in date.',
            severity: 'medium'
          }
        ],
        missingInformationFlags: [
          'Confirm whether the venue provides tables and chairs or if external rental is required.',
          'Verify if the venue has an active sound limitation or strict decibel limiter.',
          'Confirm shuttle service details if venue is distant from primary hotel blocks.'
        ]
      };
    }

    if (eventType === 'hackathon' || eventType === 'conference') {
      return {
        timelineSuggestions: [
          {
            title: 'Doors Open, Registration & Light Breakfast',
            description: 'Badge check-in, WiFi credential distribution, and coffee/bagel bar.',
            startTime: '08:30',
            endTime: '10:00',
            location: location || 'Main Lobby & Registration Desk',
            isGuestVisible: true
          },
          {
            title: 'Opening Ceremony, Track Announcements & Rules',
            description: 'Welcome keynote, sponsor challenge prompts, and API prize reveals.',
            startTime: '10:00',
            endTime: '11:00',
            location: location || 'Main Auditorium',
            isGuestVisible: true
          },
          {
            title: 'Team Formation Mixer & Hacking Kickoff',
            description: 'Solo participant match-making and project scoping.',
            startTime: '11:00',
            endTime: '12:00',
            location: location || 'Collaborative Labs 1-4',
            isGuestVisible: true
          },
          {
            title: 'Buffet Lunch & Sponsor Mentor Stations',
            description: 'Healthy boxed lunch and open mentor office hours.',
            startTime: '13:00',
            endTime: '14:30',
            location: location || 'Dining Pavilion',
            isGuestVisible: true
          },
          {
            title: 'Technical Workshops & Live Coding Sessions',
            description: 'Partner API deep dives, cloud deployment, and system architecture tips.',
            startTime: '15:30',
            endTime: '17:30',
            location: location || 'Workshop Room B',
            isGuestVisible: true
          },
          {
            title: 'Dinner & Midnight Snack Drop',
            description: 'Warm dinner followed by midnight pizza recharge and energy drinks.',
            startTime: '19:30',
            endTime: '23:30',
            location: location || 'Dining Pavilion',
            isGuestVisible: true
          },
          {
            title: 'Code Freeze & Devpost Submission Deadline',
            description: 'All project links and repository README files locked.',
            startTime: '15:00',
            endTime: '15:15',
            location: location || 'Online Devpost Portal',
            isGuestVisible: true
          },
          {
            title: 'Project Expo, Demonstrations & Judging',
            description: 'Table presentations to judges and attendees.',
            startTime: '15:30',
            endTime: '18:00',
            location: location || 'Exhibition Hall',
            isGuestVisible: true
          },
          {
            title: 'Awards Ceremony & Winner Showcase',
            description: 'Announcement of track winners, overall prizes, and closing remarks.',
            startTime: '18:30',
            endTime: '19:30',
            location: location || 'Main Auditorium',
            isGuestVisible: true
          }
        ],
        budgetAllocations: [
          {
            category: 'Food & Catering',
            title: 'Continuous Catering (3 Meals + Midnight Snacks & Coffee)',
            estimatedCost: Math.round(totalBudget * 0.40),
            notes: 'High fuel meals for participants throughout the build period.'
          },
          {
            category: 'Venue',
            title: '24/7 Facility Access, HVAC & Janitorial Staff',
            estimatedCost: Math.round(totalBudget * 0.22),
            notes: 'Covers overnight venue permits, cleaning crew, and security staff.'
          },
          {
            category: 'Miscellaneous',
            title: 'Winner Cash Prizes & Custom Engraved Trophies',
            estimatedCost: Math.round(totalBudget * 0.18),
            notes: 'Incentivizes top builder talent and rewards innovation.'
          },
          {
            category: 'Equipment',
            title: 'High-Density WiFi Network, Extension Cords & AV',
            estimatedCost: Math.round(totalBudget * 0.10),
            notes: 'Dedicated gigabit switches and power strips for 200+ active devices.'
          },
          {
            category: 'Invitations',
            title: 'Participant Swag, T-Shirts & Custom Lanyards',
            estimatedCost: Math.round(totalBudget * 0.10),
            notes: 'Screenprinted shirts, badge clips, and event stickers.'
          }
        ],
        taskChecklist: [
          {
            title: 'Stress Test Venue WiFi & Power Outlets',
            category: 'Equipment',
            priority: 'urgent',
            deadlineDaysBefore: 14,
            description: 'Ensure breaker panels and wireless access points support concurrent high-load laptop charging.'
          },
          {
            title: 'Confirm Overnight Campus Security Roster',
            category: 'Venue',
            priority: 'high',
            deadlineDaysBefore: 10,
            description: 'Submit approved badge attendee list to campus security.'
          },
          {
            title: 'Order Swag & Participant Badges',
            category: 'Merchandise',
            priority: 'high',
            deadlineDaysBefore: 21,
            description: 'Finalize artwork sizing and order T-shirts with 10% sizing buffer.'
          },
          {
            title: 'Recruit & Brief Judging Panel',
            category: 'Judging',
            priority: 'medium',
            deadlineDaysBefore: 7,
            description: 'Distribute judging rubrics and setup scoring dashboards.'
          }
        ],
        vendorRequirements: [
          {
            category: 'Food & Catering',
            serviceNeeded: 'Catering Vendor for Multi-Meal Delivery',
            estimatedCostRange: `${Math.round(totalBudget * 0.35)} - ${Math.round(totalBudget * 0.45)} ${currency}`,
            keyQuestions: 'Can you deliver hot meals on time at 1:00 PM and midnight without campus delays?'
          },
          {
            category: 'Equipment',
            serviceNeeded: 'Event IT Networking Provider',
            estimatedCostRange: `${Math.round(totalBudget * 0.08)} - ${Math.round(totalBudget * 0.14)} ${currency}`,
            keyQuestions: 'What is the fallback cellular failover if local ethernet drops?'
          }
        ],
        costSavingIdeas: [
          {
            title: 'Partner with Local Tech Companies for Sponsor Swag & Cloud Credits',
            category: 'Miscellaneous',
            potentialSavings: Math.round(totalBudget * 0.12),
            tradeOff: 'Offer booth presence in exchange for covering cloud compute and prize pool.'
          },
          {
            title: 'Use Institutional Space to Waive Rental Fees',
            category: 'Venue',
            potentialSavings: Math.round(totalBudget * 0.15),
            tradeOff: 'Requires booking through university department or affiliated student club.'
          }
        ],
        riskAndContingencies: [
          {
            risk: 'WiFi Network Overload or Failure during hacking',
            mitigation: 'Isolate hacker network from stage AV network; provide backup LTE routers.',
            severity: 'high'
          },
          {
            risk: 'Insufficient Power Drops triggering circuit breaker trips',
            mitigation: 'Rent industrial yellow jacket cable protectors and distribute load across multiple phases.',
            severity: 'high'
          }
        ],
        missingInformationFlags: [
          'Verify if overnight sleeping bags or quiet rest areas are permitted by venue policy.',
          'Confirm parking validation policy for out-of-town participants.'
        ]
      };
    }

    // Default: Birthday, Community gathering, Dinner, or Custom
    return {
      timelineSuggestions: [
        {
          title: 'Host & Staff Arrival, Decor Setup',
          description: 'Balloons, signage, music playlist, and drink station setup.',
          startTime: '17:30',
          endTime: '18:45',
          location: location || 'Event Space',
          isGuestVisible: false
        },
        {
          title: 'Guest Arrival & Welcome Drinks',
          description: 'Welcome cocktails, playlist music, and photo backdrop moments.',
          startTime: '19:00',
          endTime: '20:00',
          location: location || 'Main Lounge',
          isGuestVisible: true
        },
        {
          title: 'Dinner / Food Station Opens',
          description: 'Catered food stations, shared appetizers, and social mingling.',
          startTime: '20:00',
          endTime: '21:30',
          location: location || 'Dining Area',
          isGuestVisible: true
        },
        {
          title: 'Celebration Toast & Highlight Moment',
          description: 'Speech by host, cake presentation, or community tribute.',
          startTime: '21:30',
          endTime: '22:00',
          location: location || 'Main Stage / Center',
          isGuestVisible: true
        },
        {
          title: 'Party, Dancing & Music',
          description: 'Upbeat music, dance floor, games, and celebration.',
          startTime: '22:00',
          endTime: '00:30',
          location: location || 'Dance Lounge',
          isGuestVisible: true
        },
        {
          title: 'Farewell & Departure',
          description: 'Goodbyes, party favors distribution, and rideshare coordination.',
          startTime: '00:30',
          endTime: '01:00',
          location: location || 'Lobby Exit',
          isGuestVisible: true
        }
      ],
      budgetAllocations: [
        {
          category: 'Food & Catering',
          title: 'Food, Hors d’oeuvres & Bartending',
          estimatedCost: Math.round(totalBudget * 0.42),
          notes: 'High quality food and drinks account for core guest satisfaction.'
        },
        {
          category: 'Venue',
          title: 'Private Room / Rooftop Rental Fee',
          estimatedCost: Math.round(totalBudget * 0.28),
          notes: 'Space rental with dedicated seating and staff.'
        },
        {
          category: 'Entertainment',
          title: 'DJ, Audio Equipment & Lighting',
          estimatedCost: Math.round(totalBudget * 0.15),
          notes: 'Keeps energy elevated with curated sound.'
        },
        {
          category: 'Decoration',
          title: 'Custom Backdrop, Balloons & Floral Styling',
          estimatedCost: Math.round(totalBudget * 0.10),
          notes: 'Photo-worthy aesthetic elements and centerpieces.'
        },
        {
          category: 'Miscellaneous',
          title: 'Contingency & Favors',
          estimatedCost: Math.round(totalBudget * 0.05),
          notes: 'Buffer for unexpected costs or extra drinks.'
        }
      ],
      taskChecklist: [
        {
          title: 'Confirm Venue Reservation & Minimum Spend Policy',
          category: 'Venue',
          priority: 'urgent',
          deadlineDaysBefore: 30,
          description: 'Verify sound limits, outside cake policy, and end-of-night checkout.'
        },
        {
          title: 'Send WhatsApp Invitations with Digital RSVP Form',
          category: 'Invitations',
          priority: 'high',
          deadlineDaysBefore: 21,
          description: 'Send direct links with dress code and parking instructions.'
        },
        {
          title: 'Finalize Playlist or DJ Song Brief',
          category: 'Entertainment',
          priority: 'medium',
          deadlineDaysBefore: 5,
          description: 'Provide must-play and do-not-play tracks.'
        },
        {
          title: 'Confirm Final Headcount for Food Prep',
          category: 'Catering',
          priority: 'high',
          deadlineDaysBefore: 4,
          description: 'Communicate exact headcount with kitchen manager.'
        }
      ],
      vendorRequirements: [
        {
          category: 'Food & Catering',
          serviceNeeded: 'Catering or Bar Service',
          estimatedCostRange: `${Math.round(totalBudget * 0.35)} - ${Math.round(totalBudget * 0.45)} ${currency}`,
          keyQuestions: 'What are the food options for gluten-free and vegetarian guests?'
        }
      ],
      costSavingIdeas: [
        {
          title: 'Pre-Set Cocktail Hour with Curated Beverage Menu',
          category: 'Food & Catering',
          potentialSavings: Math.round(totalBudget * 0.08),
          tradeOff: 'Limits open liquor waste while providing excellent hospitality.'
        },
        {
          title: 'DIY Statement Photo Backdrop',
          category: 'Decoration',
          potentialSavings: Math.round(totalBudget * 0.04),
          tradeOff: 'Requires 45 minutes of friend setup time before party begins.'
        }
      ],
      riskAndContingencies: [
        {
          risk: 'More guests show up than RSVP’d',
          mitigation: 'Order 10% food buffer and configure venue for standing cocktail capacity.',
          severity: 'medium'
        }
      ],
      missingInformationFlags: [
        'Confirm if the venue requires an outside food fee for birthday cake.',
        'Check if there is elevator access for elderly guests or decor load-in.'
      ]
    };
  }

  /**
   * Helper to call Gemini API if key is provided
   */
  private static async callGeminiAPI(req: AIPromptPlanRequest, apiKey: string): Promise<AIPeriodPlan> {
    const prompt = `You are a professional event architect and financial coordinator.
Generate a structured, practical, realistic plan for the following event:
Event Name: ${req.eventName}
Event Type: ${req.eventType}
Estimated Guests: ${req.guestCount}
Total Budget: ${req.totalBudget} ${req.currency}
Date: ${req.eventDate}
Location: ${req.location}
Special Instructions: ${req.specialInstructions || 'None'}

Return ONLY valid JSON matching this exact structure:
{
  "timelineSuggestions": [{"title": "", "description": "", "startTime": "HH:MM", "endTime": "HH:MM", "location": "", "isGuestVisible": true}],
  "budgetAllocations": [{"category": "Venue|Food & Catering|Decoration|Photography & Video|Entertainment|Transport|Invitations|Accommodation|Equipment|Miscellaneous", "title": "", "estimatedCost": 0, "notes": ""}],
  "taskChecklist": [{"title": "", "category": "", "priority": "high|medium|low|urgent", "deadlineDaysBefore": 0, "description": ""}],
  "vendorRequirements": [{"category": "", "serviceNeeded": "", "estimatedCostRange": "", "keyQuestions": ""}],
  "costSavingIdeas": [{"title": "", "category": "", "potentialSavings": 0, "tradeOff": ""}],
  "riskAndContingencies": [{"risk": "", "mitigation": "", "severity": "high|medium|low"}],
  "missingInformationFlags": [""]
}`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!res.ok) throw new Error(`Gemini API error: ${res.statusText}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(text);
  }

  /**
   * Helper to call OpenAI API if key is provided
   */
  private static async callOpenAIAPI(req: AIPromptPlanRequest, apiKey: string): Promise<AIPeriodPlan> {
    const prompt = `Generate an event plan for:
Event: ${req.eventName} (${req.eventType})
Guests: ${req.guestCount}, Budget: ${req.totalBudget} ${req.currency}, Location: ${req.location}
Return structured JSON matching AIPeriodPlan interface.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) throw new Error(`OpenAI API error: ${res.statusText}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    return JSON.parse(content);
  }

  /**
   * Event-Aware Guest AI Assistant
   * Strictly answers questions grounded in published event information!
   */
  static answerGuestQuestion(
    question: string,
    event: EventDetails,
    publishedSchedule: ScheduleItem[],
    publishedAnnouncements: Array<{ title: string; content: string }>
  ): string {
    const q = question.toLowerCase();

    // Parking queries
    if (q.includes('park') || q.includes('car') || q.includes('garage') || q.includes('valet')) {
      if (event.parkingInfo) {
        return `🚗 **Parking Information:** ${event.parkingInfo}`;
      }
      return `🚗 Parking details have not been explicitly specified for this event. Please reach out to the event organizers or venue at ${event.venueName}.`;
    }

    // Dress code queries
    if (q.includes('dress') || q.includes('wear') || q.includes('attire') || q.includes('clothes') || q.includes('suit') || q.includes('shoes')) {
      if (event.dressCode) {
        return `👔 **Dress Code:** ${event.dressCode}`;
      }
      return `👔 The organizer has not published a specific dress code. Smart casual is generally a safe choice!`;
    }

    // Venue / directions / address / map queries
    if (q.includes('where') || q.includes('address') || q.includes('location') || q.includes('map') || q.includes('directions') || q.includes('venue')) {
      let resp = `📍 **Venue & Location:**\n**${event.venueName}**\n${event.venueAddress}`;
      if (event.directionsUrl) {
        resp += `\n[Open in Google Maps / Directions](${event.directionsUrl})`;
      }
      return resp;
    }

    // Time / start / schedule / when queries
    if (q.includes('when') || q.includes('time') || q.includes('start') || q.includes('end') || q.includes('schedule') || q.includes('agenda')) {
      const start = new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const startDateStr = new Date(event.startDate).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
      let resp = `⏰ **Event Timing:**\nThe event begins on **${startDateStr}** at **${start}** (${event.timezone}).\n\n**Published Schedule Highlights:**\n`;
      if (publishedSchedule.length > 0) {
        resp += publishedSchedule.slice(0, 5).map(s => `• **${s.startTime} - ${s.endTime}**: ${s.title} (${s.location})`).join('\n');
      } else {
        resp += 'Full schedule will be updated shortly by the organizer.';
      }
      return resp;
    }

    // Food / drinks / dinner / vegetarian / dietary queries
    if (q.includes('food') || q.includes('eat') || q.includes('dinner') || q.includes('lunch') || q.includes('breakfast') || q.includes('drink') || q.includes('vegetarian') || q.includes('vegan') || q.includes('diet')) {
      return `🍽️ **Food & Refreshments:**\nCatering is coordinated for attending guests. When you submit your RSVP on this page, you can specify your personal dietary preferences (e.g. Vegetarian, Halal, Gluten-free, Nut allergies) so the organizers accommodate you!`;
    }

    // WiFi / laptop / instructions queries
    if (q.includes('wifi') || q.includes('internet') || q.includes('bring') || q.includes('instructions') || q.includes('requirements')) {
      if (event.specialInstructions) {
        return `📋 **Organizer Instructions:**\n${event.specialInstructions}`;
      }
      return `📋 Please bring your personal ID and your RSVP confirmation token.`;
    }

    // Announcements queries
    if (q.includes('announcement') || q.includes('update') || q.includes('news')) {
      if (publishedAnnouncements.length > 0) {
        return `📢 **Latest Announcements:**\n` + publishedAnnouncements.map(a => `• **${a.title}**: ${a.content}`).join('\n\n');
      }
      return `📢 No urgent announcements have been published yet. Everything is running according to plan!`;
    }

    // Default polite response grounded in event info
    return `Hello! I am the event assistant for **${event.name}**. 
Here are the essential details:
• **Date & Time:** ${new Date(event.startDate).toLocaleString()}
• **Venue:** ${event.venueName} (${event.venueAddress})
${event.dressCode ? `• **Dress Code:** ${event.dressCode}\n` : ''}${event.parkingInfo ? `• **Parking:** ${event.parkingInfo}\n` : ''}
Feel free to ask me anything specific about timings, directions, dress code, parking, or RSVPs!`;
  }
}
