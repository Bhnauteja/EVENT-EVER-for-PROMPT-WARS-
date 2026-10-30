import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Layers,
  DollarSign,
  CheckSquare,
  Users,
  MessageSquare,
  Megaphone,
  Store,
  Eye,
  Settings,
  Plus,
  QrCode,
  ShieldAlert,
  ChevronDown,
  Clock,
  Compass
} from 'lucide-react';
import { EventDetails } from '../types';

export type NavTab = 
  | 'dashboard'
  | 'planner'
  | 'timeline'
  | 'budget'
  | 'tasks'
  | 'vendors'
  | 'guests'
  | 'communications'
  | 'announcements';

interface NavbarProps {
  events: EventDetails[];
  activeEvent: EventDetails | undefined;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onSelectEvent: (eventId: string) => void;
  onOpenCreateEvent: () => void;
  onOpenSettings: () => void;
  onOpenQRCode: () => void;
  isGuestView: boolean;
  onToggleGuestView: () => void;
  riskCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  events,
  activeEvent,
  activeTab,
  onTabChange,
  onSelectEvent,
  onOpenCreateEvent,
  onOpenSettings,
  onOpenQRCode,
  isGuestView,
  onToggleGuestView,
  riskCount,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Overview', icon: <Layers className="w-4 h-4" />, badge: riskCount > 0 ? riskCount : undefined },
    { id: 'planner', label: 'AI Planner', icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
    { id: 'timeline', label: 'Schedule', icon: <Clock className="w-4 h-4 text-blue-400" /> },
    { id: 'budget', label: 'Budget & What-If', icon: <DollarSign className="w-4 h-4 text-emerald-400" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4 text-amber-400" /> },
    { id: 'vendors', label: 'Vendors', icon: <Store className="w-4 h-4 text-cyan-400" /> },
    { id: 'guests', label: 'Guests & RSVP', icon: <Users className="w-4 h-4 text-indigo-400" /> },
    { id: 'communications', label: 'WhatsApp & Invites', icon: <MessageSquare className="w-4 h-4 text-green-400" /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4 text-rose-400" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar: Brand + Event Switcher + View Mode + Quick Actions */}
        <div className="flex items-center justify-between h-16 border-b border-slate-800/60">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight text-white font-['Outfit']">
                  Plan<span className="text-indigo-400">Wise</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full uppercase tracking-wider">
                  AI Event OS
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Plan • Manage • Coordinate</p>
            </div>
          </div>

          {/* Event Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-200 transition-all shadow-sm"
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span className="max-w-[160px] sm:max-w-[220px] truncate">
                {activeEvent ? activeEvent.name : 'Select Event'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 sm:right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  Select Active Event
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {events.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => {
                        onSelectEvent(ev.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                        activeEvent?.id === ev.id ? 'bg-indigo-600/15 text-indigo-300 font-semibold border-l-2 border-indigo-500' : 'text-slate-300'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate">{ev.name}</div>
                        <div className="text-[11px] text-slate-500 capitalize">{ev.type} • {new Date(ev.startDate).toLocaleDateString()}</div>
                      </div>
                      {ev.isPublished && (
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                          Live
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="pt-2 px-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      onOpenCreateEvent();
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-md shadow-indigo-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Event</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle: Organizer Studio vs Public Guest Portal */}
            <button
              onClick={onToggleGuestView}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                isGuestView
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold ring-2 ring-amber-400/40'
                  : 'bg-slate-800/90 text-slate-200 hover:bg-slate-750 border border-slate-700 hover:text-white'
              }`}
              title="Preview the event as an attending guest"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isGuestView ? 'Exit Guest View' : 'Guest Portal View'}</span>
            </button>

            {/* QR Code button */}
            <button
              onClick={onOpenQRCode}
              className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition"
              title="View and Download Guest Hub QR Code"
            >
              <QrCode className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Settings button */}
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition"
              title="Supabase, AI Keys, WhatsApp Config & Data Backup"
            >
              <Settings className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>

        {/* Bottom bar: Navigation Tabs (Visible in Organizer Studio) */}
        {!isGuestView && (
          <div className="flex space-x-1 overflow-x-auto py-2 no-scrollbar">
            {tabs.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
