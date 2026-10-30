import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { EventOverview } from './components/Dashboard/EventOverview';
import { AIPlannerView } from './components/Planner/AIPlannerView';
import { TimelineBuilder } from './components/Timeline/TimelineBuilder';
import { BudgetManager } from './components/Budget/BudgetManager';
import { TaskManager } from './components/Tasks/TaskManager';
import { VendorManager } from './components/Vendors/VendorManager';
import { GuestManager } from './components/Guests/GuestManager';
import { CommunicationHub } from './components/Communications/CommunicationHub';
import { AnnouncementManager } from './components/Announcements/AnnouncementManager';
import { PublicGuestHub } from './components/GuestHub/PublicGuestHub';
import { PortalGate } from './components/PortalGate/PortalGate';
import { EventFormModal } from './components/Modals/EventFormModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { QRCodeModal } from './components/Modals/QRCodeModal';
import { OrganizerPinModal } from './components/Modals/OrganizerPinModal';
import {
  EventDetails,
  ScheduleItem,
  ExpenseItem,
  Vendor,
  EventTask,
  Guest,
  Announcement,
  CommunicationLog,
  RiskAlert
} from './types';
import { storage } from './services/storage';
import { RiskAndImpactAnalyzer } from './services/riskAndImpactAnalyzer';

export type PortalMode = 'landing' | 'organizer' | 'guest';

export const App: React.FC = () => {
  const [events, setEvents] = useState<EventDetails[]>([]);
  const [activeEventId, setActiveEventId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  
  // Clean role-based navigation states
  const [portalMode, setPortalMode] = useState<PortalMode>('landing');
  const [isOrganizerSession, setIsOrganizerSession] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [guestToken, setGuestToken] = useState<string | undefined>(undefined);

  // Entities for the active event
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [communications, setCommunications] = useState<CommunicationLog[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);

  // Modals
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);

  // Load and refresh data
  const refreshData = () => {
    const loadedEvents = storage.getEvents();
    setEvents(loadedEvents);

    const currentId = storage.getActiveEventId() || (loadedEvents[0] ? loadedEvents[0].id : '');
    setActiveEventId(currentId);

    if (currentId) {
      const activeEvent = loadedEvents.find(e => e.id === currentId);
      const evSchedules = storage.getSchedules(currentId);
      const evExpenses = storage.getExpenses(currentId);
      const evVendors = storage.getVendors(currentId);
      const evTasks = storage.getTasks(currentId);
      const evGuests = storage.getGuests(currentId);
      const evAnnouncements = storage.getAnnouncements(currentId);
      const evComms = storage.getCommunications(currentId);

      setSchedules(evSchedules);
      setExpenses(evExpenses);
      setVendors(evVendors);
      setTasks(evTasks);
      setGuests(evGuests);
      setAnnouncements(evAnnouncements);
      setCommunications(evComms);

      if (activeEvent) {
        const risks = RiskAndImpactAnalyzer.analyzeRisks(
          activeEvent,
          evSchedules,
          evExpenses,
          evVendors,
          evTasks,
          evGuests
        );
        setRiskAlerts(risks);
      }
    }
  };

  useEffect(() => {
    // 1. Initial hydration
    refreshData();

    // 2. Parse URL path & parameters for clean role separation
    const handleLocationChange = () => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get('token');
      const eventParam = params.get('event');
      const guestParam = params.get('guest');

      // Check /event/:slug route
      if (path.startsWith('/event/')) {
        const slug = path.replace('/event/', '').split('/')[0].split('?')[0];
        if (slug) {
          const matching = storage.getEventBySlug(slug);
          if (matching) {
            storage.setActiveEventId(matching.id);
            setActiveEventId(matching.id);
          }
        }
        setPortalMode('guest');
        if (tokenParam) setGuestToken(tokenParam);
        return;
      }

      // Check /organizer route
      if (path === '/organizer') {
        setIsOrganizerSession(true);
        setPortalMode('organizer');
        return;
      }

      // Check query parameter fallback
      if (tokenParam) {
        setGuestToken(tokenParam);
        setPortalMode('guest');
        return;
      }

      if (eventParam) {
        const matching = storage.getEventBySlug(eventParam);
        if (matching) {
          storage.setActiveEventId(matching.id);
          setActiveEventId(matching.id);
        }
        setPortalMode('guest');
        return;
      }

      if (guestParam === 'true') {
        setPortalMode('guest');
        return;
      }

      // Default home/root -> Role Portal Gate
      setPortalMode('landing');
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);

    // 3. Listen to internal storage updates
    const handleUpdate = () => refreshData();
    window.addEventListener('planwise_data_updated', handleUpdate);
    window.addEventListener('planwise_event_changed', handleUpdate);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('planwise_data_updated', handleUpdate);
      window.removeEventListener('planwise_event_changed', handleUpdate);
    };
  }, []);

  const activeEvent = events.find(e => e.id === activeEventId) || events[0];

  const handleSelectEvent = (id: string) => {
    storage.setActiveEventId(id);
    setActiveEventId(id);
    refreshData();
  };

  const handleEnterGuestPortal = (eventId: string) => {
    storage.setActiveEventId(eventId);
    setActiveEventId(eventId);
    const ev = storage.getEventById(eventId);
    if (ev && typeof window !== 'undefined') {
      window.history.pushState({}, '', `/event/${ev.publicSlug}`);
    }
    setPortalMode('guest');
  };

  const handleEnterOrganizerPortal = () => {
    setIsOrganizerSession(true);
    setPortalMode('organizer');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/organizer');
    }
  };

  const handleExitToPortalGate = () => {
    setPortalMode('landing');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 1. PORTAL GATE (Role Selection Landing Page) */}
      {portalMode === 'landing' && (
        <PortalGate
          events={events}
          activeEvent={activeEvent}
          onEnterGuestPortal={handleEnterGuestPortal}
          onEnterOrganizerPortal={handleEnterOrganizerPortal}
        />
      )}

      {/* 2. GUEST ATTENDEE PORTAL (Strictly Isolated from Organizer Operations) */}
      {portalMode === 'guest' && activeEvent && (
        <PublicGuestHub
          event={activeEvent}
          guestToken={guestToken}
          isOrganizerSession={isOrganizerSession}
          onExitGuestView={() => setPortalMode('organizer')}
          onOpenOrganizerLogin={() => setIsPinModalOpen(true)}
        />
      )}

      {/* 3. ORGANIZER COMMAND CENTER (Full Studio with All Operational Modules) */}
      {portalMode === 'organizer' && (
        <>
          <Navbar
            events={events}
            activeEvent={activeEvent}
            activeTab={activeTab}
            onTabChange={tab => setActiveTab(tab)}
            onSelectEvent={handleSelectEvent}
            onOpenCreateEvent={() => setIsCreateEventOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenQRCode={() => setIsQRCodeOpen(true)}
            isGuestView={false}
            onToggleGuestView={() => setPortalMode('guest')}
            onExitToPortalGate={handleExitToPortalGate}
            riskCount={riskAlerts.length}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {!activeEvent ? (
              <div className="glass-panel rounded-2xl p-12 text-center">
                <p className="text-slate-400">No events found. Create your first event to get started.</p>
                <button
                  onClick={() => setIsCreateEventOpen(true)}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  Create Event
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <EventOverview
                    event={activeEvent}
                    schedules={schedules}
                    expenses={expenses}
                    vendors={vendors}
                    tasks={tasks}
                    guests={guests}
                    announcements={announcements}
                    riskAlerts={riskAlerts}
                    onNavigateTab={tab => setActiveTab(tab as NavTab)}
                  />
                )}

                {activeTab === 'planner' && (
                  <AIPlannerView
                    event={activeEvent}
                    onApplyPlanSuccess={() => {
                      refreshData();
                      setActiveTab('timeline');
                    }}
                  />
                )}

                {activeTab === 'timeline' && (
                  <TimelineBuilder
                    event={activeEvent}
                    schedules={schedules}
                    onUpdate={refreshData}
                  />
                )}

                {activeTab === 'budget' && (
                  <BudgetManager
                    event={activeEvent}
                    expenses={expenses}
                    onUpdate={refreshData}
                  />
                )}

                {activeTab === 'tasks' && (
                  <TaskManager
                    event={activeEvent}
                    tasks={tasks}
                    onUpdate={refreshData}
                  />
                )}

                {activeTab === 'vendors' && (
                  <VendorManager
                    event={activeEvent}
                    vendors={vendors}
                    onUpdate={refreshData}
                  />
                )}

                {activeTab === 'guests' && (
                  <GuestManager
                    event={activeEvent}
                    guests={guests}
                    onUpdate={refreshData}
                  />
                )}

                {activeTab === 'communications' && (
                  <CommunicationHub
                    event={activeEvent}
                    guests={guests}
                    communications={communications}
                    onUpdate={refreshData}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                  />
                )}

                {activeTab === 'announcements' && (
                  <AnnouncementManager
                    event={activeEvent}
                    announcements={announcements}
                    schedules={schedules}
                    vendors={vendors}
                    tasks={tasks}
                    expenses={expenses}
                    onUpdate={refreshData}
                  />
                )}
              </>
            )}
          </main>

          {/* Organizer Footer */}
          <footer className="border-t border-slate-800/80 bg-slate-900/40 py-5 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-300">PlanWise</span>
                <span>• Organizer Command Center Workspace</span>
              </div>
              <div className="flex items-center space-x-4">
                <span>Deterministic Accounting</span>
                <span>•</span>
                <span>AI Architecture</span>
                <span>•</span>
                <span>WhatsApp Coordination</span>
              </div>
            </div>
          </footer>
        </>
      )}

      {/* Global Modals */}
      {isCreateEventOpen && (
        <EventFormModal
          onClose={() => setIsCreateEventOpen(false)}
          onSaved={ev => {
            setIsCreateEventOpen(false);
            refreshData();
          }}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onUpdate={refreshData}
        />
      )}

      {isQRCodeOpen && activeEvent && (
        <QRCodeModal
          event={activeEvent}
          onClose={() => setIsQRCodeOpen(false)}
        />
      )}

      {/* Organizer PIN Unlock Modal */}
      {isPinModalOpen && (
        <OrganizerPinModal
          onSuccess={() => {
            setIsPinModalOpen(false);
            handleEnterOrganizerPortal();
          }}
          onClose={() => setIsPinModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
