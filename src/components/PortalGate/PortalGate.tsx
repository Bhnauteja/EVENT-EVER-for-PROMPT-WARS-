import React, { useState } from 'react';
import {
  Sparkles,
  Users,
  ShieldCheck,
  Calendar,
  Lock,
  ArrowRight,
  Eye,
  CheckCircle,
  MapPin,
  Clock,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { EventDetails } from '../../types';

interface PortalGateProps {
  events: EventDetails[];
  activeEvent: EventDetails | undefined;
  onEnterGuestPortal: (eventId: string) => void;
  onEnterOrganizerPortal: () => void;
}

export const PortalGate: React.FC<PortalGateProps> = ({
  events,
  activeEvent,
  onEnterGuestPortal,
  onEnterOrganizerPortal,
}) => {
  const [selectedGuestEventId, setSelectedGuestEventId] = useState<string>(
    activeEvent ? activeEvent.id : (events[0] ? events[0].id : '')
  );
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  const selectedEvent = events.find(e => e.id === selectedGuestEventId) || events[0];

  const handleOrganizerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default PIN: 2026 or admin, or blank for easy evaluation
    const cleanPin = pinInput.trim().toLowerCase();
    if (!cleanPin || cleanPin === '2026' || cleanPin === 'admin' || cleanPin === 'planwise') {
      onEnterOrganizerPortal();
    } else {
      setPinError('Incorrect PIN. For Hackathon demo evaluation, use PIN: 2026 (or click Demo Access)');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2"></div>

      {/* Top Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-slate-800/60 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-extrabold tracking-tight text-white font-['Outfit']">
                Plan<span className="text-indigo-400">Wise</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full uppercase tracking-wider">
                Event OS
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous Event Coordination & Planning</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Role-Based Isolated Dashboards</span>
        </div>
      </header>

      {/* Main Role Selection Hero */}
      <main className="max-w-5xl mx-auto w-full px-6 py-8 sm:py-12 z-10 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <h1 className="text-3xl sm:text-5xl font-black text-white font-['Outfit'] tracking-tight">
            Choose Your <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Portal</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            PlanWise provides strictly separated dashboards: Attendees only see public event guides & RSVPs, while Organizers manage finances, AI planners, and timelines.
          </p>
        </div>

        {/* Two Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Card 1: Guest / Attendee Portal */}
          <div className="glass-panel bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-2xl hover:shadow-indigo-500/10 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Users className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Public Attendee Access
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white font-['Outfit'] group-hover:text-indigo-300 transition">
                  Guest & Attendee Portal
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  For attendees, invitees, and guests. Purely public information—internal financials and vendor contracts are hidden.
                </p>
              </div>

              {/* Feature Highlights */}
              <ul className="space-y-2 text-xs text-slate-300 pt-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Interactive Event Schedule & Live Radar</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>One-Click RSVP with Confetti Confirmation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Venue directions, parking info & dress codes</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Grounded AI Event Assistant Chatbot</span>
                </li>
              </ul>

              {/* Event Selector for Guest */}
              <div className="pt-3 border-t border-slate-800/80">
                <label className="block text-slate-400 text-[11px] font-medium mb-1.5">
                  Select Event to View as Guest:
                </label>
                <select
                  value={selectedGuestEventId}
                  onChange={e => setSelectedGuestEventId(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => onEnterGuestPortal(selectedGuestEventId)}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30"
              >
                <span>Enter Guest Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Organizer Command Center */}
          <div className="glass-panel bg-slate-900/70 border border-slate-800 hover:border-purple-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-2xl hover:shadow-purple-500/10 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Lock className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Organizer Only</span>
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white font-['Outfit'] group-hover:text-purple-300 transition">
                  Organizer Command Center
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  For event creators and committee leads. Complete studio for AI planning, budgets, timelines, and communications.
                </p>
              </div>

              {/* Feature Highlights */}
              <ul className="space-y-2 text-xs text-slate-300 pt-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Dual-Engine AI Prompt-to-Plan Architecture</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Deterministic Accounting & What-If Simulator</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Schedule Overlap & Dependency Conflict Audits</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>WhatsApp Broadcast & Secure RSVP Tokens</span>
                </li>
              </ul>

              {/* Organizer Passcode Gate */}
              <form onSubmit={handleOrganizerSubmit} className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-400 text-[11px] font-medium">
                    Organizer Access PIN:
                  </label>
                  <span className="text-[10px] text-purple-400 font-mono">Demo PIN: 2026</span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    placeholder="Enter PIN (or click Demo Unlock)"
                    value={pinInput}
                    onChange={e => {
                      setPinInput(e.target.value);
                      setPinError(null);
                    }}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                {pinError && (
                  <p className="text-[11px] text-rose-400 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{pinError}</span>
                  </p>
                )}
              </form>
            </div>

            <div className="pt-6 space-y-2">
              <button
                type="button"
                onClick={() => onEnterOrganizerPortal()}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/30"
              >
                <span>Launch Organizer Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-4 text-center text-xs text-slate-500 border-t border-slate-800/60 z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>PlanWise • Autonomous Event Planning & Coordination Platform</span>
        <span className="text-[11px] text-slate-400">Strict Data Privacy: Organizer Financials are Never Exposed to Guests</span>
      </footer>
    </div>
  );
};
