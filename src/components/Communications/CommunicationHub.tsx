import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Info,
  Settings,
  Eye,
  CheckCheck
} from 'lucide-react';
import {
  EventDetails,
  Guest,
  MessageWorkflowType,
  CommunicationLog,
  MessageDeliveryStatus
} from '../../types';
import {
  CommunicationService,
  OFFICIAL_WHATSAPP_TEMPLATES
} from '../../services/communicationService';
import { storage } from '../../services/storage';

interface CommunicationHubProps {
  event: EventDetails;
  guests: Guest[];
  communications: CommunicationLog[];
  onUpdate: () => void;
  onOpenSettings: () => void;
}

export const CommunicationHub: React.FC<CommunicationHubProps> = ({
  event,
  guests,
  communications,
  onUpdate,
  onOpenSettings
}) => {
  const [activeWorkflow, setActiveWorkflow] = useState<MessageWorkflowType>('bulk_invitation');
  const [recipientFilter, setRecipientFilter] = useState<'all' | 'awaiting' | 'attending' | 'tentative'>('awaiting');
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [lastActionResult, setLastActionResult] = useState<{ count: number; status: string; waLinks?: string[] } | null>(null);

  const settings = storage.getSettings();
  const hasMetaApiKeys = Boolean(settings.whatsappAccessToken && settings.whatsappPhoneNumberId);

  // Filter eligible recipients based on workflow
  const eligibleGuests = guests.filter(g => {
    if (!g.phone) return false;
    if (recipientFilter === 'awaiting') return g.rsvpStatus === 'awaiting';
    if (recipientFilter === 'attending') return g.rsvpStatus === 'attending';
    if (recipientFilter === 'tentative') return g.rsvpStatus === 'tentative';
    return true;
  });

  // Sample guest for preview
  const sampleGuest = guests[0] || {
    id: 'sample',
    name: 'Jordan Morales',
    phone: '+1 617-555-0143',
    rsvpStatus: 'awaiting',
    secureToken: 'hck_sample88'
  };

  const previewMessage = CommunicationService.renderMessage(activeWorkflow, event, sampleGuest as Guest);
  const templateConfig = OFFICIAL_WHATSAPP_TEMPLATES[activeWorkflow];

  // Select all / deselect all
  const handleSelectAll = () => {
    if (selectedGuestIds.size === eligibleGuests.length) {
      setSelectedGuestIds(new Set());
    } else {
      setSelectedGuestIds(new Set(eligibleGuests.map(g => g.id)));
    }
  };

  const toggleGuestSelect = (id: string) => {
    const next = new Set(selectedGuestIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedGuestIds(next);
  };

  const handleExecuteDispatch = async () => {
    const targets = eligibleGuests.filter(g => selectedGuestIds.has(g.id));
    if (targets.length === 0) {
      alert('Please select at least one eligible recipient with a valid phone number.');
      return;
    }

    setIsSending(true);
    setLastActionResult(null);

    const waLinks: string[] = [];
    let sentCount = 0;

    for (const guest of targets) {
      const result = await CommunicationService.sendMessage(event, guest, activeWorkflow);
      if (result.success) {
        sentCount++;
        if (result.waMeUrl) {
          waLinks.push(result.waMeUrl);
        }
      }
    }

    setIsSending(false);
    setLastActionResult({
      count: sentCount,
      status: hasMetaApiKeys ? 'Sent via official WhatsApp Cloud API' : 'Personalized Click-to-Chat links prepared',
      waLinks: waLinks.length > 0 ? waLinks : undefined
    });

    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-green-500/10 text-green-400">
              <MessageSquare className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white font-['Outfit']">
              WhatsApp Communication & RSVP Engine
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Automated invitation distribution, non-respondent reminders, schedule drops, and real-time announcements.
          </p>
        </div>

        {/* Integration Status Badge */}
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 ${
            hasMetaApiKeys
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${hasMetaApiKeys ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{hasMetaApiKeys ? 'Official Meta API Active' : 'Click-to-Chat Fallback Mode'}</span>
          </div>

          <button
            onClick={onOpenSettings}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Configure WhatsApp API Keys"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Honest Compliance Notice */}
      <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-200">Compliance & Integrity Standard:</strong> PlanWise never simulates fake deliveries. If Meta Cloud API credentials are configured in Settings, direct API delivery is executed. Without credentials, PlanWise creates legitimate 1-click WhatsApp wa.me links preserving recipient tokens without account risk.
        </div>
      </div>

      {/* Workflow Chooser Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        {[
          { id: 'bulk_invitation', label: '1. Event Invitations', sub: 'Initial invitation & RSVP link' },
          { id: 'rsvp_reminder', label: '2. RSVP Reminders', sub: 'Target unresponded guests' },
          { id: 'venue_date_reminder', label: '3. Logistics & Venue Alert', sub: 'Dress code & directions' },
          { id: 'schedule_notification', label: '4. Schedule Drop', sub: 'Published agenda release' },
        ].map(wf => (
          <button
            key={wf.id}
            onClick={() => {
              setActiveWorkflow(wf.id as MessageWorkflowType);
              setSelectedGuestIds(new Set());
              setLastActionResult(null);
            }}
            className={`p-3 rounded-xl border text-left transition ${
              activeWorkflow === wf.id
                ? 'bg-green-950/20 border-green-500/40 text-white'
                : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-bold text-slate-200">{wf.label}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{wf.sub}</div>
          </button>
        ))}
      </div>

      {/* Main Two-Column Console: Recipient Selection & Live Message Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recipient Selection */}
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center space-x-2">
              <Users className="w-4 h-4 text-green-400" />
              <span>Select Eligible Recipients ({eligibleGuests.length})</span>
            </h3>

            {/* Recipient Filter */}
            <select
              value={recipientFilter}
              onChange={e => {
                setRecipientFilter(e.target.value as any);
                setSelectedGuestIds(new Set());
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs"
            >
              <option value="awaiting">Awaiting RSVP Response</option>
              <option value="attending">Confirmed Attendees Only</option>
              <option value="tentative">Tentative Guests</option>
              <option value="all">All Guests with Phone</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <button
              onClick={handleSelectAll}
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              {selectedGuestIds.size === eligibleGuests.length ? 'Deselect All' : 'Select All Eligible'}
            </button>
            <span className="font-mono text-slate-300">{selectedGuestIds.size} selected</span>
          </div>

          {/* Guest Checklist */}
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {eligibleGuests.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                No guests matching the current filter have phone numbers.
              </div>
            ) : (
              eligibleGuests.map(g => {
                const isSelected = selectedGuestIds.has(g.id);
                return (
                  <div
                    key={g.id}
                    onClick={() => toggleGuestSelect(g.id)}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-green-950/20 border-green-500/30 text-white'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-700 bg-slate-800 text-green-600 focus:ring-0"
                      />
                      <div className="truncate">
                        <span className="font-semibold text-slate-200">{g.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono ml-2">{g.phone}</span>
                      </div>
                    </div>
                    <span className="capitalize text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                      {g.rsvpStatus}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Dispatch Action Button */}
          <div className="pt-2">
            <button
              disabled={isSending || selectedGuestIds.size === 0}
              onClick={handleExecuteDispatch}
              className="w-full py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-green-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-40"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Messages...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {hasMetaApiKeys
                      ? `Send WhatsApp to ${selectedGuestIds.size} Recipients`
                      : `Prepare Direct WhatsApp Links (${selectedGuestIds.size})`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Dynamic WhatsApp Message Preview */}
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center space-x-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>Personalized WhatsApp Preview</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              Template: {templateConfig.name}
            </span>
          </div>

          {/* WhatsApp Chat Bubble Mockup */}
          <div className="bg-[#0b141a] rounded-2xl p-4 border border-slate-800 shadow-inner relative overflow-hidden">
            <div className="text-[11px] text-slate-400 font-mono mb-2 pb-2 border-b border-slate-800 flex justify-between">
              <span>Previewing for: <strong>{sampleGuest.name}</strong></span>
              <span>{sampleGuest.phone}</span>
            </div>

            <div className="max-w-[85%] bg-[#005c4b] text-[#e9edef] rounded-xl rounded-tr-none p-3.5 text-xs shadow-md space-y-2 whitespace-pre-wrap leading-relaxed font-sans">
              {previewMessage}
              <div className="text-[9px] text-[#8696a0] text-right pt-1 font-mono flex items-center justify-end space-x-1">
                <span>10:42 AM</span>
                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
              </div>
            </div>
          </div>

          {/* Action Results / Generated WhatsApp Click-to-Chat Links */}
          {lastActionResult && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs space-y-2">
              <div className="font-bold text-emerald-300 flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{lastActionResult.status} ({lastActionResult.count} processed)</span>
              </div>

              {lastActionResult.waLinks && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] text-slate-400">
                    Click each link to open prefilled WhatsApp chat with the guest:
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    {lastActionResult.waLinks.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-[11px] text-indigo-400 hover:text-indigo-300 font-mono truncate bg-slate-900 px-2 py-1 rounded"
                      >
                        💬 Open Chat #{i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Communication Log History */}
      <div className="glass-panel rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white font-['Outfit']">
          Audited Communication History ({communications.length} entries)
        </h3>

        <div className="max-h-56 overflow-y-auto space-y-2 text-xs">
          {communications.length === 0 ? (
            <p className="text-slate-500 italic py-2">No messages dispatched yet.</p>
          ) : (
            communications.map(log => (
              <div key={log.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-200">{log.recipientName}</span>
                    <span className="font-mono text-slate-500 text-[11px]">{log.recipientPhone}</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {log.workflowType.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1 line-clamp-1">{log.messageContent}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    log.status === 'sent_via_api'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : log.status === 'manual_opened'
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'bg-rose-500/15 text-rose-400'
                  }`}>
                    {log.status.replace('_', ' ')}
                  </span>
                  {log.sentAt && (
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
