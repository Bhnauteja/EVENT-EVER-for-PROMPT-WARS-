import React, { useState } from 'react';
import {
  Settings,
  Database,
  Sparkles,
  MessageSquare,
  Download,
  Upload,
  RotateCcw,
  Check,
  Save,
  X,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { storage, AppSettings } from '../../services/storage';
import { SupabaseSyncService } from '../../services/supabaseClient';

interface SettingsModalProps {
  onClose: () => void;
  onUpdate: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onUpdate }) => {
  const currentSettings = storage.getSettings();

  const [supabaseUrl, setSupabaseUrl] = useState(currentSettings.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(currentSettings.supabaseAnonKey || '');
  const [geminiApiKey, setGeminiApiKey] = useState(currentSettings.geminiApiKey || '');
  const [openaiApiKey, setOpenaiApiKey] = useState(currentSettings.openaiApiKey || '');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState(currentSettings.whatsappPhoneNumberId || '');
  const [whatsappAccessToken, setWhatsappAccessToken] = useState(currentSettings.whatsappAccessToken || '');
  const [organizerPin, setOrganizerPin] = useState(currentSettings.organizerPin || '7989');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [connTestResult, setConnTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      ...currentSettings,
      supabaseUrl,
      supabaseAnonKey,
      geminiApiKey,
      openaiApiKey,
      whatsappPhoneNumberId,
      whatsappAccessToken,
      organizerPin: organizerPin.trim() || '7989'
    };
    storage.saveSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onUpdate();
      onClose();
    }, 1200);
  };

  const handleTestConnection = async () => {
    storage.saveSettings({
      ...currentSettings,
      supabaseUrl,
      supabaseAnonKey
    });
    setIsTestingConn(true);
    setConnTestResult(null);
    const res = await SupabaseSyncService.testConnection();
    setIsTestingConn(false);
    setConnTestResult(res);
  };

  const handlePushCurrentEvent = async () => {
    storage.saveSettings({
      ...currentSettings,
      supabaseUrl,
      supabaseAnonKey
    });
    const activeEventId = storage.getActiveEventId();
    const event = storage.getEventById(activeEventId);
    if (!event) return;

    setIsSyncing(true);
    setSyncResult(null);
    const res = await SupabaseSyncService.pushLocalEventToCloud(event);
    setIsSyncing(false);
    setSyncResult(res.message);
  };

  const handleExportBackup = () => {
    const backupJson = storage.exportFullBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planwise-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      const success = storage.importBackup(content);
      if (success) {
        alert('PlanWise database successfully restored from JSON backup!');
        onUpdate();
        onClose();
      } else {
        alert('Invalid PlanWise backup file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    if (confirm('Reset all data to default demo events (TechSprint 2026, Elena & Liam Wedding, Marcus 30th Birthday)? Any unexported custom changes will be replaced.')) {
      storage.resetToDemo();
      alert('Reset to demo data complete.');
      onUpdate();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white font-['Outfit']">
              Integrations & System Settings
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedSuccess && (
          <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Settings and API credentials updated securely!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 mt-4 text-xs">
          {/* Storage Mode Notice */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center space-x-2 font-bold text-slate-200">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Current Persistence Engine: Local Offline Database (Active)</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              All events, schedules, tasks, finances, and RSVPs persist locally in your browser. Complete Supabase PostgreSQL schema with Row Level Security is available in <code className="text-indigo-300 font-mono">supabase/schema.sql</code>.
            </p>
          </div>

          {/* Section 1: Supabase Configuration */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Supabase Cloud Database (Optional)</span>
            </h4>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Supabase Project URL</label>
              <input
                type="url"
                placeholder="https://your-project-ref.supabase.co"
                value={supabaseUrl}
                onChange={e => setSupabaseUrl(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Supabase Anon Public Key</label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseAnonKey}
                onChange={e => setSupabaseAnonKey(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={isTestingConn || !supabaseUrl || !supabaseAnonKey}
                onClick={handleTestConnection}
                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition disabled:opacity-40"
              >
                {isTestingConn ? 'Testing...' : '⚡ Test Supabase Connection'}
              </button>

              <button
                type="button"
                disabled={isSyncing || !supabaseUrl || !supabaseAnonKey}
                onClick={handlePushCurrentEvent}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition disabled:opacity-40"
              >
                {isSyncing ? 'Syncing...' : '☁️ Push Active Event to Cloud'}
              </button>
            </div>

            {connTestResult && (
              <div className={`p-2.5 rounded-lg text-[11px] leading-relaxed border ${
                connTestResult.success
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
              }`}>
                {connTestResult.message}
              </div>
            )}

            {syncResult && (
              <div className="p-2.5 rounded-lg text-[11px] bg-slate-950 text-slate-300 border border-slate-800">
                {syncResult}
              </div>
            )}
          </div>

          {/* Section 2: AI Provider Keys */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Provider API Keys (Optional)</span>
            </h4>
            <p className="text-slate-400 text-[11px]">
              If left blank, PlanWise automatically uses its built-in expert deterministic event architecture engine.
            </p>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Google Gemini API Key</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={e => setGeminiApiKey(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">OpenAI API Key</label>
              <input
                type="password"
                placeholder="sk-proj-..."
                value={openaiApiKey}
                onChange={e => setOpenaiApiKey(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          {/* Section 3: WhatsApp Cloud API */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-green-400" />
              <span>Official WhatsApp Business Cloud API (Optional)</span>
            </h4>
            <p className="text-slate-400 text-[11px]">
              If left blank, PlanWise operates with direct personalized Click-to-Chat (wa.me) links.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Phone Number ID</label>
                <input
                  type="text"
                  placeholder="10492817281928"
                  value={whatsappPhoneNumberId}
                  onChange={e => setWhatsappPhoneNumberId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Permanent Access Token</label>
                <input
                  type="password"
                  placeholder="EAAG..."
                  value={whatsappAccessToken}
                  onChange={e => setWhatsappAccessToken(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section: Security & Organizer Access PIN */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Organizer Security & Access PIN</span>
            </h4>
            <p className="text-slate-400 text-[11px]">
              Set the PIN required to unlock the Organizer Command Center from the Portal Gate or Guest view.
            </p>

            <div className="max-w-xs">
              <label className="block text-slate-300 font-medium mb-1">Organizer Access PIN</label>
              <input
                type="text"
                placeholder="7989"
                value={organizerPin}
                onChange={e => setOrganizerPin(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono tracking-widest text-sm"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Default PIN is 7989. You can change this to any custom passcode anytime.</span>
            </div>
          </div>

          {/* Section 4: Data Backup & Reset */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Data Management & Demo Tools
            </h4>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export JSON Backup</span>
              </button>

              <label className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Restore JSON Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleResetDemo}
                className="px-3 py-2 bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Events</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
