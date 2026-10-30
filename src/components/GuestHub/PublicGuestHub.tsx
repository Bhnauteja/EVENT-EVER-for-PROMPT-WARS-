import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Car,
  Shirt,
  Info,
  CheckCircle,
  HelpCircle,
  Send,
  MessageCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Megaphone,
  UserCheck,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EventDetails, ScheduleItem, Announcement, Guest, RSVPStatus } from '../../types';
import { AIPlannerService } from '../../services/aiPlanner';
import { storage } from '../../services/storage';

interface PublicGuestHubProps {
  event: EventDetails;
  guestToken?: string;
  onExitGuestView?: () => void;
  isOrganizerSession?: boolean;
  onOpenOrganizerLogin?: () => void;
}

export const PublicGuestHub: React.FC<PublicGuestHubProps> = ({
  event,
  guestToken,
  onExitGuestView,
  isOrganizerSession = false,
  onOpenOrganizerLogin
}) => {
  // Public data strictly filtered:
  const publishedSchedules = storage.getSchedules(event.id).filter(s => s.isGuestVisible);
  const publishedAnnouncements = storage.getAnnouncements(event.id).filter(a => a.isPublished);

  // Authenticated guest matching secure token (if link has token)
  const [guest, setGuest] = useState<Guest | undefined>(
    guestToken ? storage.getGuestByToken(guestToken) : undefined
  );

  // RSVP Form State
  const [guestNameInput, setGuestNameInput] = useState(guest ? guest.name : '');
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus>(guest ? guest.rsvpStatus : 'attending');
  const [dietary, setDietary] = useState(guest ? guest.dietaryRestrictions || '' : '');
  const [plusOneCount, setPlusOneCount] = useState<number>(guest ? guest.plusOneCount || 0 : 0);
  const [guestNote, setGuestNote] = useState(guest ? guest.guestNotes || '' : '');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // AI Assistant Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    {
      sender: 'assistant',
      text: `Hello! Welcome to ${event.name}. I am your live event assistant. Ask me anything about directions, timings, dress code, parking, or RSVPs!`
    }
  ]);
  const [userQuestion, setUserQuestion] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);

  // Countdown / Happening Now calculation
  const [nowTime, setNowTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const eventStart = new Date(event.startDate);
  const eventEnd = new Date(event.endDate);
  const isBeforeEvent = nowTime < eventStart;
  const isAfterEvent = nowTime > eventEnd;
  const isEventLive = !isBeforeEvent && !isAfterEvent;

  // Find happening now item
  const curHours = String(nowTime.getHours()).padStart(2, '0');
  const curMins = String(nowTime.getMinutes()).padStart(2, '0');
  const timeStr = `${curHours}:${curMins}`;

  const currentItem = isEventLive
    ? publishedSchedules.find(s => s.startTime <= timeStr && s.endTime >= timeStr)
    : undefined;
  const nextItem = isEventLive
    ? publishedSchedules.find(s => s.startTime > timeStr)
    : publishedSchedules[0];

  const handleRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestNameInput.trim()) return;

    if (guest) {
      const updatedGuest: Guest = {
        ...guest,
        name: guestNameInput,
        rsvpStatus,
        dietaryRestrictions: dietary,
        plusOneCount,
        guestNotes: guestNote,
        rsvpSubmittedAt: new Date().toISOString()
      };
      storage.saveGuest(updatedGuest);
      setGuest(updatedGuest);
    } else {
      // Guest registering themselves via public URL
      const token = 'gst_' + Math.random().toString(36).substr(2, 9);
      const newGuest: Guest = {
        id: 'gst-' + Date.now(),
        eventId: event.id,
        name: guestNameInput,
        rsvpStatus,
        invitationStatus: 'opened',
        preferredLanguage: 'en',
        secureToken: token,
        plusOneAllowed: false,
        plusOneCount: 0,
        dietaryRestrictions: dietary,
        guestNotes: guestNote,
        rsvpSubmittedAt: new Date().toISOString()
      };
      storage.saveGuest(newGuest);
      setGuest(newGuest);
    }

    setIsSubmitted(true);
    if (rsvpStatus === 'attending') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Fallback gracefully
      }
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;

    const q = userQuestion;
    setUserQuestion('');
    setChatMessages(prev => [...prev, { sender: 'user', text: q }]);
    setIsAnswering(true);

    setTimeout(() => {
      const answer = AIPlannerService.answerGuestQuestion(
        q,
        event,
        publishedSchedules,
        publishedAnnouncements
      );
      setChatMessages(prev => [...prev, { sender: 'assistant', text: answer }]);
      setIsAnswering(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Banner ONLY when Organizer is previewing from Organizer Studio */}
      {isOrganizerSession && onExitGuestView && (
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2 text-xs font-bold text-slate-950 flex items-center justify-between shadow-md sticky top-0 z-50">
          <span>👀 Public Guest Hub Preview Mode — Financials & internal notes are strictly hidden.</span>
          <button
            onClick={onExitGuestView}
            className="px-2.5 py-1 bg-slate-900 text-white rounded font-semibold text-[11px] hover:bg-slate-800 transition shadow"
          >
            Exit to Organizer Studio
          </button>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-indigo-950/60 via-slate-900/80 to-slate-950 border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14 text-center space-y-4">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {event.type} • Official Event Page
          </span>

          <h1 className="text-3xl sm:text-5xl font-black text-white font-['Outfit'] tracking-tight">
            {event.name}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            {event.description}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-slate-300 pt-2 font-medium">
            <div className="flex items-center space-x-1.5 bg-slate-900/80 border border-slate-800 px-3.5 py-1.5 rounded-full">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>
                {new Date(event.startDate).toLocaleDateString([], {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-900/80 border border-slate-800 px-3.5 py-1.5 rounded-full">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>
                {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({event.timezone})
              </span>
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-900/80 border border-slate-800 px-3.5 py-1.5 rounded-full">
              <MapPin className="w-4 h-4 text-rose-400" />
              <span>{event.venueName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-6">
        {/* WHAT'S HAPPENING NOW? (Requirement 13) */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/30 shadow-xl">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping"></span>
            <span>Live Coordination Radar</span>
          </div>

          {isEventLive ? (
            <div className="space-y-3">
              {currentItem ? (
                <div>
                  <span className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                    Happening Right Now
                  </span>
                  <h3 className="text-xl font-extrabold text-white mt-1">{currentItem.title}</h3>
                  <div className="text-xs text-slate-300 flex items-center space-x-2 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{currentItem.startTime} - {currentItem.endTime}</span>
                    <span>•</span>
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>{currentItem.location}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-base font-bold text-slate-200">Event is Underway</h3>
                  <p className="text-xs text-slate-400">Next scheduled activity begins shortly.</p>
                </div>
              )}

              {nextItem && nextItem !== currentItem && (
                <div className="pt-2 border-t border-slate-800/80 text-xs flex items-center justify-between text-slate-400">
                  <span>Up Next: <strong className="text-slate-200">{nextItem.title}</strong></span>
                  <span className="font-mono text-indigo-300">@ {nextItem.startTime} ({nextItem.location})</span>
                </div>
              )}
            </div>
          ) : isBeforeEvent ? (
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-200">Event Commences Soon</h3>
              <p className="text-xs text-slate-400">
                Doors open at {publishedSchedules[0] ? publishedSchedules[0].startTime : 'scheduled start'}. Check directions and submit your RSVP below!
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-200">Event Concluded</h3>
              <p className="text-xs text-slate-400">Thank you for attending {event.name}!</p>
            </div>
          )}
        </div>

        {/* LATEST ANNOUNCEMENTS */}
        {publishedAnnouncements.length > 0 && (
          <div className="glass-panel rounded-2xl p-5 border-rose-500/30 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-rose-400">
              <Megaphone className="w-4 h-4" />
              <span>Live Organizer Announcements ({publishedAnnouncements.length})</span>
            </div>

            <div className="space-y-2.5">
              {publishedAnnouncements.map(ann => (
                <div key={ann.id} className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>{ann.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INTERACTIVE RSVP SECTION (Requirement 11 & 13) */}
        <div id="rsvp" className="glass-panel rounded-2xl p-6 border-indigo-500/30 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Attendance Confirmation
              </span>
              <h2 className="text-xl font-bold text-white font-['Outfit'] mt-0.5">
                {guest ? `RSVP for ${guest.name}` : 'Confirm Your Attendance'}
              </h2>
            </div>
            {guest && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Verified Guest Token
              </span>
            )}
          </div>

          {isSubmitted ? (
            <div className="py-6 text-center space-y-2 animate-in fade-in">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">RSVP Received!</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Thank you, <strong>{guestNameInput}</strong>. Your response ({rsvpStatus}) has been securely recorded for the event organizers.
              </p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline pt-2"
              >
                Update My Response
              </button>
            </div>
          ) : (
            <form onSubmit={handleRsvpSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Morales"
                  value={guestNameInput}
                  onChange={e => setGuestNameInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm"
                />
              </div>

              {/* RSVP Choices */}
              <div>
                <label className="block text-slate-300 font-medium mb-2">Will you be attending?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'attending', label: 'Attending 🎉', desc: 'Count me in' },
                    { id: 'declined', label: 'Unable to Attend', desc: 'Send regrets' },
                    { id: 'tentative', label: 'Not Sure Yet', desc: 'Need more time' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRsvpStatus(opt.id as RSVPStatus)}
                      className={`p-3 rounded-xl border text-center transition ${
                        rsvpStatus === opt.id
                          ? opt.id === 'attending'
                            ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                            : opt.id === 'declined'
                            ? 'bg-rose-950/40 border-rose-500 text-white'
                            : 'bg-amber-950/40 border-amber-500 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Dietary / Plus-One fields for Attending */}
              {rsvpStatus === 'attending' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Dietary Preferences / Allergies</label>
                    <input
                      type="text"
                      placeholder="e.g. Vegetarian, Halal, Gluten-Free, None"
                      value={dietary}
                      onChange={e => setDietary(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  {guest?.plusOneAllowed && (
                    <div className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                      <div>
                        <div className="font-semibold text-slate-200">Bringing a Plus-One (+1)?</div>
                        <div className="text-[10px] text-slate-400">Organizer has enabled plus-one for your invitation.</div>
                      </div>
                      <select
                        value={plusOneCount}
                        onChange={e => setPlusOneCount(Number(e.target.value))}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                      >
                        <option value={0}>0 (Just me)</option>
                        <option value={1}>1 Guest</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Notes for Organizers (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Arriving 30 mins late, excited for the keynote!"
                      value={guestNote}
                      onChange={e => setGuestNote(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition mt-2"
              >
                Submit RSVP Confirmation
              </button>
            </form>
          )}
        </div>

        {/* LOGISTICS CARDS: VENUE, DIRECTIONS, PARKING, DRESS CODE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Venue & Directions */}
          <div className="glass-panel rounded-2xl p-5 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-rose-400">
              <MapPin className="w-4 h-4" />
              <span>Venue & Location</span>
            </div>
            <h4 className="text-base font-bold text-white">{event.venueName}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{event.venueAddress}</p>
            {event.directionsUrl && (
              <a
                href={event.directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 pt-1"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Parking & Transit */}
          <div className="glass-panel rounded-2xl p-5 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Car className="w-4 h-4" />
              <span>Parking & Transit</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {event.parkingInfo || 'Parking information has not been published yet.'}
            </p>
          </div>

          {/* Dress Code */}
          <div className="glass-panel rounded-2xl p-5 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <Shirt className="w-4 h-4" />
              <span>Dress Code</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {event.dressCode || 'Smart Casual'}
            </p>
          </div>

          {/* Special Instructions */}
          <div className="glass-panel rounded-2xl p-5 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
              <Info className="w-4 h-4" />
              <span>Special Instructions</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {event.specialInstructions || 'Please arrive 15 minutes before the opening session.'}
            </p>
          </div>
        </div>

        {/* PUBLISHED SCHEDULE (Strictly Guest-Visible Only) */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-blue-400">
            <Clock className="w-4 h-4" />
            <span>Published Itinerary & Schedule</span>
          </div>

          <div className="space-y-3">
            {publishedSchedules.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">Schedule will be announced soon.</p>
            ) : (
              publishedSchedules.map(item => (
                <div key={item.id} className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-start space-x-4">
                  <div className="px-3 py-1.5 bg-slate-800 rounded-lg text-xs font-mono font-bold text-indigo-300 shrink-0">
                    {item.startTime}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                    {item.description && (
                      <p className="text-xs text-slate-300 mt-0.5">{item.description}</p>
                    )}
                    <div className="text-[11px] text-slate-400 font-mono mt-1">
                      📍 {item.location} • Ends {item.endTime}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* EVENT-AWARE AI CHATBOT (Requirement 4 & 13) */}
        <div className="glass-panel rounded-2xl p-6 space-y-4 border-indigo-500/20">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white font-['Outfit']">
              Ask Event AI Assistant
            </h3>
          </div>
          <p className="text-xs text-slate-300">
            Have questions about parking, directions, timings, or diet? Ask our event assistant:
          </p>

          {/* Chat Messages Log */}
          <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 max-h-56 overflow-y-auto space-y-3 text-xs">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-xl whitespace-pre-wrap leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isAnswering && (
              <div className="text-xs text-slate-500 italic flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>Assistant is consulting published event notes...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className="flex space-x-2">
            <input
              type="text"
              placeholder="e.g. Is parking free? Where can I leave my car? What is the dress code?"
              value={userQuestion}
              onChange={e => setUserQuestion(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs"
            />
            <button
              type="submit"
              disabled={!userQuestion.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-40"
            >
              Ask
            </button>
          </form>
        </div>

        {/* Footer Privacy & Safety Notice */}
        <div className="text-center text-[11px] text-slate-500 pt-6 border-t border-slate-900 space-y-2">
          <p>PlanWise Event Coordination Platform • Privacy-Preserving Direct RSVP</p>
          <p>Only information explicitly published by the event organizer is visible on this page.</p>
          {onOpenOrganizerLogin && (
            <div className="pt-2">
              <button
                onClick={onOpenOrganizerLogin}
                className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg text-[10px] font-medium transition"
              >
                <Lock className="w-3 h-3 text-slate-500" />
                <span>Organizer Dashboard Access 🔒</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
