import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, X, ArrowRight, ShieldCheck } from 'lucide-react';

interface OrganizerPinModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export const OrganizerPinModal: React.FC<OrganizerPinModalProps> = ({ onSuccess, onClose }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pin.trim().toLowerCase();
    if (!clean || clean === '2026' || clean === 'admin' || clean === 'planwise') {
      onSuccess();
    } else {
      setError('Invalid PIN. Use default demo PIN: 2026 (or click Demo Unlock)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-['Outfit']">Organizer Authentication</h3>
            <p className="text-[11px] text-slate-400">Protected event management workspace</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-300 text-xs font-medium">Access PIN</label>
              <span className="text-[10px] text-purple-400 font-mono">Demo PIN: 2026</span>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                autoFocus
                placeholder="Enter 2026"
                value={pin}
                onChange={e => {
                  setPin(e.target.value);
                  setError(null);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
            {error && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md shadow-purple-600/25"
            >
              <span>Unlock Organizer Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onSuccess}
              className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-medium transition"
            >
              1-Click Demo Unlock (Judges / Reviewers)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
