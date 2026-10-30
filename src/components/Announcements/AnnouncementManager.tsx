import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  AlertTriangle,
  Clock,
  Send,
  Eye,
  EyeOff,
  Zap,
  Info,
  CheckCircle,
  X,
  Save,
  ArrowRight
} from 'lucide-react';
import {
  EventDetails,
  Announcement,
  ScheduleItem,
  Vendor,
  EventTask,
  ExpenseItem
} from '../../types';
import { storage } from '../../services/storage';
import { RiskAndImpactAnalyzer, ImpactAnalysisReport } from '../../services/riskAndImpactAnalyzer';

interface AnnouncementManagerProps {
  event: EventDetails;
  announcements: Announcement[];
  schedules: ScheduleItem[];
  vendors: Vendor[];
  tasks: EventTask[];
  expenses: ExpenseItem[];
  onUpdate: () => void;
}

export const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({
  event,
  announcements,
  schedules,
  vendors,
  tasks,
  expenses,
  onUpdate
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [urgency, setUrgency] = useState<Announcement['urgency']>('normal');
  const [targetAudience, setTargetAudience] = useState<Announcement['targetAudience']>('all');
  const [isPublished, setIsPublished] = useState(true);

  // Plan-Change Impact Simulator state
  const [isImpactSimulatorOpen, setIsImpactSimulatorOpen] = useState(false);
  const [simulatedDate, setSimulatedDate] = useState(event.startDate);
  const [simulatedVenue, setSimulatedVenue] = useState(event.venueName);
  const [simulatedGuests, setSimulatedGuests] = useState(event.estimatedGuests);
  const [simulatedBudget, setSimulatedBudget] = useState(event.totalPlannedBudget);
  const [impactReport, setImpactReport] = useState<ImpactAnalysisReport | null>(null);

  const openCreateModal = () => {
    setTitle('');
    setContent('');
    setUrgency('normal');
    setTargetAudience('all');
    setIsPublished(true);
    setEditingAnn(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ann: Announcement) => {
    setTitle(ann.title);
    setContent(ann.content);
    setUrgency(ann.urgency);
    setTargetAudience(ann.targetAudience);
    setIsPublished(ann.isPublished);
    setEditingAnn(ann);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (editingAnn) {
      const updated: Announcement = {
        ...editingAnn,
        title,
        content,
        urgency,
        targetAudience,
        isPublished,
        publishedAt: isPublished ? (editingAnn.publishedAt || new Date().toISOString()) : undefined
      };
      storage.saveAnnouncement(updated);
    } else {
      const newAnn: Announcement = {
        id: 'ann-' + Date.now(),
        eventId: event.id,
        title,
        content,
        urgency,
        targetAudience,
        isPublished,
        publishedAt: isPublished ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString()
      };
      storage.saveAnnouncement(newAnn);
    }

    setIsModalOpen(false);
    setEditingAnn(null);
    onUpdate();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this announcement?')) {
      storage.deleteAnnouncement(id);
      onUpdate();
    }
  };

  const handleTogglePublish = (ann: Announcement) => {
    storage.saveAnnouncement({
      ...ann,
      isPublished: !ann.isPublished,
      publishedAt: !ann.isPublished ? new Date().toISOString() : ann.publishedAt
    });
    onUpdate();
  };

  // Run impact analysis
  const handleAnalyzeImpact = () => {
    const draft: Partial<EventDetails> = {
      startDate: simulatedDate,
      venueName: simulatedVenue,
      estimatedGuests: simulatedGuests,
      totalPlannedBudget: simulatedBudget
    };

    const report = RiskAndImpactAnalyzer.analyzePlanChangeImpact(
      event,
      draft,
      schedules,
      vendors,
      tasks,
      expenses
    );
    setImpactReport(report);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <Megaphone className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white font-['Outfit']">
              Announcements & Plan-Change Impact Analysis
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Publish live notices to guests and simulate cascade dependencies before changing event dates, venues, or budgets.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setIsImpactSimulatorOpen(!isImpactSimulatorOpen);
              if (!impactReport) handleAnalyzeImpact();
            }}
            className="px-3.5 py-2 bg-purple-950/40 hover:bg-purple-950/60 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Zap className="w-4 h-4 text-purple-400" />
            <span>{isImpactSimulatorOpen ? 'Hide Impact Tool' : 'Plan-Change Impact Analysis'}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Announcement</span>
          </button>
        </div>
      </div>

      {/* PLAN-CHANGE IMPACT ANALYSIS TOOL */}
      {isImpactSimulatorOpen && (
        <div className="glass-panel rounded-2xl p-6 border-purple-500/30 space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white font-['Outfit']">
                Plan-Change Dependency & Cascade Analyzer
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Simulate parameter shifts to discover affected vendors, tasks, and reminders before saving.
            </span>
          </div>

          {/* Hypothetical parameter inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Simulated Date / Time</label>
              <input
                type="datetime-local"
                value={simulatedDate.slice(0, 16)}
                onChange={e => {
                  setSimulatedDate(new Date(e.target.value).toISOString());
                  handleAnalyzeImpact();
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Simulated Venue Name</label>
              <input
                type="text"
                value={simulatedVenue}
                onChange={e => {
                  setSimulatedVenue(e.target.value);
                  handleAnalyzeImpact();
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Simulated Guest Count</label>
              <input
                type="number"
                value={simulatedGuests}
                onChange={e => {
                  setSimulatedGuests(Number(e.target.value) || 0);
                  handleAnalyzeImpact();
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Simulated Budget ({event.currency})</label>
              <input
                type="number"
                value={simulatedBudget}
                onChange={e => {
                  setSimulatedBudget(Number(e.target.value) || 0);
                  handleAnalyzeImpact();
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
          </div>

          {/* Impact Results */}
          {impactReport && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-300">{impactReport.summaryMessage}</span>
                <span className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] ${
                  impactReport.overallSeverity === 'critical'
                    ? 'bg-rose-500/20 text-rose-300'
                    : impactReport.overallSeverity === 'high'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  Severity: {impactReport.overallSeverity}
                </span>
              </div>

              {impactReport.diffs.map((diff, i) => (
                <div key={i} className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{diff.description}</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                      {diff.field}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400">Directly Affected Components:</span>
                    <ul className="list-disc list-inside text-slate-300 mt-0.5 space-y-0.5">
                      {diff.affectedComponents.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-1 text-slate-400 font-mono text-[11px]">
                    <strong className="text-emerald-400">Recommended Next Steps:</strong> {diff.suggestedActions.join(' • ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
            <Megaphone className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm">No announcements published yet.</p>
          </div>
        ) : (
          announcements.map(ann => {
            const isUrgent = ann.urgency === 'urgent';
            const isImportant = ann.urgency === 'important';

            return (
              <div
                key={ann.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isUrgent
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : isImportant
                    ? 'bg-amber-950/15 border-amber-500/30'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white truncate">{ann.title}</h3>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                      isUrgent
                        ? 'bg-rose-500/20 text-rose-300'
                        : isImportant
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {ann.urgency}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 px-1.5 py-0.2 rounded bg-slate-800">
                      Audience: {ann.targetAudience}
                    </span>
                    {ann.isPublished ? (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                        ● Public on Hub
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-800 px-1.5 py-0.2 rounded">
                        ○ Draft
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{ann.content}</p>

                  <div className="text-[11px] text-slate-500 font-mono">
                    Created: {new Date(ann.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleTogglePublish(ann)}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
                    title={ann.isPublished ? 'Unpublish from Hub' : 'Publish to Hub'}
                  >
                    {ann.isPublished ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                  </button>
                  <button
                    onClick={() => openEditModal(ann)}
                    className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Announcement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white font-['Outfit']">
                {editingAnn ? 'Edit Announcement' : 'New Announcement'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Announcement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule Update, Parking Directions, Weather Contingency"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Urgency Level</label>
                  <select
                    value={urgency}
                    onChange={e => setUrgency(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Audience</label>
                  <select
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="all">All Guests</option>
                    <option value="attending">Confirmed Attending Only</option>
                    <option value="unconfirmed">Unconfirmed / Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Announcement Message *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Details for your attendees..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white leading-relaxed"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="annPublish"
                  checked={isPublished}
                  onChange={e => setIsPublished(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-rose-600 focus:ring-0"
                />
                <label htmlFor="annPublish" className="text-slate-300 font-medium cursor-pointer">
                  Publish immediately to Public Guest Hub
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl transition flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Announcement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
