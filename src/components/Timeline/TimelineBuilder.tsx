import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  AlertTriangle,
  MoveUp,
  MoveDown,
  CheckCircle,
  MapPin,
  User,
  Radio,
  FileText,
  Save,
  X
} from 'lucide-react';
import { EventDetails, ScheduleItem, ScheduleStatus } from '../../types';
import { storage } from '../../services/storage';

interface TimelineBuilderProps {
  event: EventDetails;
  schedules: ScheduleItem[];
  onUpdate: () => void;
}

export const TimelineBuilder: React.FC<TimelineBuilderProps> = ({ event, schedules, onUpdate }) => {
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'guest_visible' | 'internal'>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [location, setLocation] = useState(event.venueName || 'Main Hall');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [isGuestVisible, setIsGuestVisible] = useState(true);
  const [prepNotes, setPrepNotes] = useState('');
  const [status, setStatus] = useState<ScheduleStatus>('scheduled');

  const openCreateModal = () => {
    setTitle('');
    setDescription('');
    setStartTime('12:00');
    setEndTime('13:00');
    setLocation(event.venueName || 'Main Hall');
    setResponsiblePerson('');
    setIsGuestVisible(true);
    setPrepNotes('');
    setStatus('scheduled');
    setEditingItem(null);
    setIsCreating(true);
  };

  const openEditModal = (item: ScheduleItem) => {
    setTitle(item.title);
    setDescription(item.description || '');
    setStartTime(item.startTime);
    setEndTime(item.endTime);
    setLocation(item.location);
    setResponsiblePerson(item.responsiblePerson || '');
    setIsGuestVisible(item.isGuestVisible);
    setPrepNotes(item.prepNotes || '');
    setStatus(item.status);
    setEditingItem(item);
    setIsCreating(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingItem) {
      const updated: ScheduleItem = {
        ...editingItem,
        title,
        description,
        startTime,
        endTime,
        location,
        responsiblePerson,
        isGuestVisible,
        prepNotes,
        status
      };
      storage.saveScheduleItem(updated);
    } else {
      const newItem: ScheduleItem = {
        id: 'sch-' + Date.now(),
        eventId: event.id,
        title,
        description,
        startTime,
        endTime,
        location,
        responsiblePerson,
        isGuestVisible,
        prepNotes,
        status,
        orderIndex: schedules.length
      };
      storage.saveScheduleItem(newItem);
    }

    setIsCreating(false);
    setEditingItem(null);
    onUpdate();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this schedule item?')) {
      storage.deleteScheduleItem(id);
      onUpdate();
    }
  };

  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= schedules.length) return;

    const copy = [...schedules];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    // re-assign orderIndex
    copy.forEach((item, idx) => {
      item.orderIndex = idx;
    });

    storage.saveBulkSchedules(copy);
    onUpdate();
  };

  const handleToggleVisibility = (item: ScheduleItem) => {
    storage.saveScheduleItem({
      ...item,
      isGuestVisible: !item.isGuestVisible
    });
    onUpdate();
  };

  // Check for overlaps in the schedule
  const sorted = [...schedules].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const overlapSet = new Set<string>();
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    if (curr.endTime > next.startTime && curr.location === next.location) {
      overlapSet.add(curr.id);
      overlapSet.add(next.id);
    }
  }

  // Filter items
  const filtered = schedules.filter(item => {
    if (selectedFilter === 'guest_visible') return item.isGuestVisible;
    if (selectedFilter === 'internal') return !item.isGuestVisible;
    return true;
  });

  // Event day "Happening Now" check
  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;

  const currentItem = schedules.find(s => s.startTime <= currentTimeStr && s.endTime >= currentTimeStr);
  const nextItem = schedules.find(s => s.startTime > currentTimeStr);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Clock className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white font-['Outfit']">
              Timeline Builder & Event-Day Coordination
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Build and sequence your event itinerary. Control guest visibility and monitor live transitions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Schedule Item</span>
          </button>
        </div>
      </div>

      {/* Live "Happening Now" Event-Day Simulation Bar */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            <Radio className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
            <span>Event Clock ({currentTimeStr} {event.timezone})</span>
          </div>
          <div className="text-xs text-slate-300">
            {currentItem ? (
              <span><strong>Happening Now:</strong> {currentItem.title} ({currentItem.startTime} - {currentItem.endTime}) at {currentItem.location}</span>
            ) : (
              <span><strong>Status:</strong> Standby / Pre-event preparation</span>
            )}
          </div>
        </div>

        {nextItem && (
          <div className="text-xs text-slate-400 font-mono">
            <strong>Up Next:</strong> {nextItem.title} @ {nextItem.startTime}
          </div>
        )}
      </div>

      {/* Filters and Counters */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              selectedFilter === 'all' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Items ({schedules.length})
          </button>
          <button
            onClick={() => setSelectedFilter('guest_visible')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              selectedFilter === 'guest_visible' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Public to Guests ({schedules.filter(s => s.isGuestVisible).length})
          </button>
          <button
            onClick={() => setSelectedFilter('internal')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              selectedFilter === 'internal' ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'text-slate-400 hover:text-white'
            }`}
          >
            Internal Crew Only ({schedules.filter(s => !s.isGuestVisible).length})
          </button>
        </div>

        {overlapSet.size > 0 && (
          <div className="flex items-center space-x-1.5 text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{overlapSet.size} Overlapping Items Detected!</span>
          </div>
        )}
      </div>

      {/* Schedule Items List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm">No items in this view.</p>
          </div>
        ) : (
          filtered.map((item, index) => {
            const hasOverlap = overlapSet.has(item.id);

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  hasOverlap
                    ? 'bg-amber-950/15 border-amber-500/40 hover:border-amber-500/60'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Time & Title info */}
                <div className="flex items-start space-x-4 min-w-0">
                  <div className="text-center shrink-0">
                    <div className="px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm font-mono font-extrabold text-indigo-300">
                      {item.startTime}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">to {item.endTime}</div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-white truncate">{item.title}</h3>
                      {item.isGuestVisible ? (
                        <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
                          Public
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                          Internal Only
                        </span>
                      )}
                      {hasOverlap && (
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Overlap</span>
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>{item.location}</span>
                      </span>
                      {item.responsiblePerson && (
                        <span className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-blue-400" />
                          <span>Lead: {item.responsiblePerson}</span>
                        </span>
                      )}
                      {item.prepNotes && (
                        <span className="flex items-center space-x-1 text-slate-400 italic">
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          <span className="truncate max-w-[200px]">Notes: {item.prepNotes}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Reorder & Edit & Delete */}
                <div className="flex items-center space-x-1.5 self-end md:self-center shrink-0">
                  <button
                    onClick={() => handleToggleVisibility(item)}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition"
                    title={item.isGuestVisible ? 'Hide from Guest Hub' : 'Make Public on Guest Hub'}
                  >
                    {item.isGuestVisible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                  </button>

                  <button
                    disabled={index === 0}
                    onClick={() => handleMoveOrder(index, 'up')}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition disabled:opacity-30"
                    title="Move earlier"
                  >
                    <MoveUp className="w-4 h-4" />
                  </button>

                  <button
                    disabled={index === schedules.length - 1}
                    onClick={() => handleMoveOrder(index, 'down')}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition disabled:opacity-30"
                    title="Move later"
                  >
                    <MoveDown className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition"
                    title="Edit item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white font-['Outfit']">
                {editingItem ? 'Edit Schedule Item' : 'New Schedule Item'}
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Session / Activity Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Welcome Keynote, Cake Cutting, Hackathon Pitch"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Time (HH:MM)</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Time (HH:MM)</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Venue Area / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Main Hall, Stage A, Lawn, Dining Pavilion"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Responsible Lead / Host</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Chen, DJ Marcus, Catering Staff"
                  value={responsiblePerson}
                  onChange={e => setResponsiblePerson(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description (Guest Viewable if Public)</label>
                <textarea
                  rows={2}
                  placeholder="Brief details about what will happen..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Internal Preparation Notes (Organizer Only)</label>
                <input
                  type="text"
                  placeholder="e.g. Cue microphone at 10:15, test projector switch"
                  value={prepNotes}
                  onChange={e => setPrepNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="guestVisible"
                  checked={isGuestVisible}
                  onChange={e => setIsGuestVisible(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="guestVisible" className="text-slate-300 font-medium cursor-pointer">
                  Publish to Public Guest Event Hub
                </label>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
