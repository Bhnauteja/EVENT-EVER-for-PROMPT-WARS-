import React, { useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Download,
  Copy,
  Check,
  Phone,
  Mail,
  ExternalLink,
  Search,
  Filter,
  Save,
  X,
  UserCheck,
  UserX,
  HelpCircle,
  Clock
} from 'lucide-react';
import { EventDetails, Guest, RSVPStatus, InvitationStatus } from '../../types';
import { storage } from '../../services/storage';
import { CommunicationService } from '../../services/communicationService';

interface GuestManagerProps {
  event: EventDetails;
  guests: Guest[];
  onUpdate: () => void;
}

export const GuestManager: React.FC<GuestManagerProps> = ({ event, guests, onUpdate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<Array<{ name: string; phone: string; email: string }>>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus>('awaiting');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [plusOneAllowed, setPlusOneAllowed] = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [organizerNotes, setOrganizerNotes] = useState('');

  const openCreateModal = () => {
    setName('');
    setEmail('');
    setPhone('');
    setRsvpStatus('awaiting');
    setPreferredLanguage(event.organizerLanguage || 'en');
    setPlusOneAllowed(false);
    setDietaryRestrictions('');
    setTableNumber('');
    setOrganizerNotes('');
    setEditingGuest(null);
    setIsModalOpen(true);
  };

  const openEditModal = (g: Guest) => {
    setName(g.name);
    setEmail(g.email || '');
    setPhone(g.phone || '');
    setRsvpStatus(g.rsvpStatus);
    setPreferredLanguage(g.preferredLanguage || 'en');
    setPlusOneAllowed(g.plusOneAllowed);
    setDietaryRestrictions(g.dietaryRestrictions || '');
    setTableNumber(g.tableNumber || '');
    setOrganizerNotes(g.organizerNotes || '');
    setEditingGuest(g);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingGuest) {
      const updated: Guest = {
        ...editingGuest,
        name,
        email,
        phone,
        rsvpStatus,
        preferredLanguage,
        plusOneAllowed,
        dietaryRestrictions,
        tableNumber,
        organizerNotes
      };
      storage.saveGuest(updated);
    } else {
      // Generate unguessable secure token
      const token = 'gst_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      const newGuest: Guest = {
        id: 'gst-' + Date.now(),
        eventId: event.id,
        name,
        email,
        phone,
        rsvpStatus,
        invitationStatus: 'not_sent',
        preferredLanguage,
        secureToken: token,
        plusOneAllowed,
        plusOneCount: 0,
        dietaryRestrictions,
        tableNumber,
        organizerNotes
      };
      storage.saveGuest(newGuest);
    }

    setIsModalOpen(false);
    setEditingGuest(null);
    onUpdate();
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this guest from the invitation roster?')) {
      storage.deleteGuest(id);
      onUpdate();
    }
  };

  const handleCopyLink = (guest: Guest) => {
    const url = CommunicationService.getGuestEventUrl(event, guest);
    navigator.clipboard.writeText(url);
    setCopiedToken(guest.id);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // CSV Parsing
  const handleCsvChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCsvText(val);

    const lines = val.split('\n').filter(l => l.trim().length > 0);
    const parsed: Array<{ name: string; phone: string; email: string }> = [];

    lines.forEach((line, index) => {
      // Skip header if line includes 'name' and 'phone'
      if (index === 0 && line.toLowerCase().includes('name')) return;

      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols[0]) {
        parsed.push({
          name: cols[0],
          phone: cols[1] || '',
          email: cols[2] || ''
        });
      }
    });

    setCsvPreview(parsed);
  };

  const handleConfirmCsvImport = () => {
    if (csvPreview.length === 0) return;

    const newGuests: Guest[] = csvPreview.map((item, idx) => ({
      id: 'gst-' + Date.now() + '-' + idx,
      eventId: event.id,
      name: item.name,
      phone: item.phone,
      email: item.email,
      rsvpStatus: 'awaiting',
      invitationStatus: 'not_sent',
      preferredLanguage: event.organizerLanguage || 'en',
      secureToken: 'gst_' + Math.random().toString(36).substr(2, 9),
      plusOneAllowed: false,
      plusOneCount: 0
    }));

    storage.saveBulkGuests(newGuests);
    setIsCsvImportOpen(false);
    setCsvText('');
    setCsvPreview([]);
    alert(`Successfully imported ${newGuests.length} guests with personalized RSVP tokens!`);
    onUpdate();
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = 'Name,RSVP Status,Phone,Email,Plus One Allowed,Dietary Restrictions,Table,Token\n';
    const rows = guests.map(g => 
      `"${g.name}","${g.rsvpStatus}","${g.phone || ''}","${g.email || ''}","${g.plusOneAllowed}","${g.dietaryRestrictions || ''}","${g.tableNumber || ''}","${g.secureToken}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.publicSlug}-guest-list.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Metrics
  const attending = guests.filter(g => g.rsvpStatus === 'attending');
  const attendingHeadcount = attending.reduce((sum, g) => sum + 1 + (g.plusOneCount || 0), 0);
  const declined = guests.filter(g => g.rsvpStatus === 'declined').length;
  const tentative = guests.filter(g => g.rsvpStatus === 'tentative').length;
  const awaiting = guests.filter(g => g.rsvpStatus === 'awaiting').length;

  const filteredGuests = guests.filter(g => {
    if (statusFilter !== 'all' && g.rsvpStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = g.name.toLowerCase().includes(q);
      const matchEmail = g.email?.toLowerCase().includes(q);
      const matchPhone = g.phone?.includes(q);
      return matchName || matchEmail || matchPhone;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white font-['Outfit']">
              Guest Roster & RSVP Attendance
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Manage invitees, monitor real-time RSVP confirmations, and issue secure one-click guest response tokens.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCsvImportOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Guest</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white font-mono">{attendingHeadcount} Attending</div>
            <span className="text-[10px] text-slate-400">{attending.length} primary + plus-ones</span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white font-mono">{declined} Declined</div>
            <span className="text-[10px] text-slate-400">Unable to attend</span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white font-mono">{tentative} Not Sure</div>
            <span className="text-[10px] text-slate-400">Tentative responses</span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-slate-800 text-slate-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white font-mono">{awaiting} Awaiting</div>
            <span className="text-[10px] text-slate-400">Pending response</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex space-x-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'all' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Guests ({guests.length})
          </button>
          <button
            onClick={() => setStatusFilter('attending')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'attending' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Confirmed ({attending.length})
          </button>
          <button
            onClick={() => setStatusFilter('awaiting')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'awaiting' ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'text-slate-400 hover:text-white'
            }`}
          >
            Awaiting ({awaiting})
          </button>
          <button
            onClick={() => setStatusFilter('declined')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'declined' ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Declined ({declined})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search name, phone, email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-slate-200 text-xs focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Guest Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Guest Name</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">RSVP Status</th>
                <th className="py-3 px-3">Dietary / Notes</th>
                <th className="py-3 px-3">Personal RSVP Link</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No guests matching current filter.
                  </td>
                </tr>
              ) : (
                filteredGuests.map(g => {
                  const isCopied = copiedToken === g.id;

                  return (
                    <tr key={g.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{g.name}</div>
                        {g.tableNumber && (
                          <div className="text-[10px] text-indigo-400 mt-0.5">Seating: {g.tableNumber}</div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        {g.phone && <div className="font-mono text-[11px]">{g.phone}</div>}
                        {g.email && <div className="text-[11px] text-slate-400">{g.email}</div>}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          g.rsvpStatus === 'attending'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : g.rsvpStatus === 'declined'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : g.rsvpStatus === 'tentative'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {g.rsvpStatus === 'attending' ? 'Attending' : g.rsvpStatus === 'declined' ? 'Declined' : g.rsvpStatus === 'tentative' ? 'Not Sure' : 'Awaiting'}
                        </span>
                        {g.plusOneCount > 0 && (
                          <span className="ml-1 text-[10px] text-slate-400">(+{g.plusOneCount})</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-300 max-w-xs">
                        {g.dietaryRestrictions && (
                          <div className="text-amber-400 text-[11px]">🍽️ {g.dietaryRestrictions}</div>
                        )}
                        {g.guestNotes && (
                          <div className="text-slate-400 italic text-[11px] truncate">"{g.guestNotes}"</div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleCopyLink(g)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded text-[11px] font-medium flex items-center space-x-1 transition"
                            title="Copy Secure Direct RSVP Link"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => openEditModal(g)}
                            className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(g.id)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Import Modal */}
      {isCsvImportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white font-['Outfit']">
                Import Guests via CSV Roster
              </h3>
              <button onClick={() => setIsCsvImportOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <p className="text-slate-300">
                Paste comma-separated rows in the format: <br />
                <code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded font-mono">
                  Full Name, Phone Number, Email
                </code>
              </p>

              <textarea
                rows={5}
                placeholder="Jordan Morales, +1 617-555-8901, jordan@mit.edu
Priya Sharma, +1 617-555-4321, priya@gmail.com
David Chen, +1 617-555-7711, dchen@harvard.edu"
                value={csvText}
                onChange={handleCsvChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white font-mono text-xs"
              />

              {csvPreview.length > 0 && (
                <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800 max-h-36 overflow-y-auto">
                  <div className="font-bold text-indigo-400 mb-1">Preview ({csvPreview.length} guests parsed):</div>
                  {csvPreview.map((item, i) => (
                    <div key={i} className="text-[11px] text-slate-300 flex justify-between py-0.5 border-b border-slate-800/50">
                      <span className="font-semibold">{item.name}</span>
                      <span className="text-slate-500 font-mono">{item.phone}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCsvImportOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={csvPreview.length === 0}
                  onClick={handleConfirmCsvImport}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg disabled:opacity-40"
                >
                  Confirm Import ({csvPreview.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Guest Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white font-['Outfit']">
                {editingGuest ? 'Edit Guest' : 'Add Guest to Roster'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Morales"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">WhatsApp / Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 617-555-8901"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="jordan@mit.edu"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">RSVP Status</label>
                  <select
                    value={rsvpStatus}
                    onChange={e => setRsvpStatus(e.target.value as RSVPStatus)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="awaiting">Awaiting Response</option>
                    <option value="attending">Attending (Confirmed)</option>
                    <option value="declined">Unable to Attend</option>
                    <option value="tentative">Not Sure Yet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Table / Seating Group</label>
                  <input
                    type="text"
                    placeholder="e.g. Table 4B, VIP Lounge"
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Dietary Restrictions</label>
                <input
                  type="text"
                  placeholder="e.g. Vegetarian, Halal, Gluten-Free, Nut Allergy"
                  value={dietaryRestrictions}
                  onChange={e => setDietaryRestrictions(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="plusOne"
                  checked={plusOneAllowed}
                  onChange={e => setPlusOneAllowed(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="plusOne" className="text-slate-300 font-medium cursor-pointer">
                  Allow Plus-One Guest (+1)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Guest</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
