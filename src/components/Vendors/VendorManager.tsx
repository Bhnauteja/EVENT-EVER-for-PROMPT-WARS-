import React, { useState } from 'react';
import {
  Store,
  Plus,
  Trash2,
  Edit2,
  Phone,
  Mail,
  Globe,
  CheckCircle,
  Clock,
  DollarSign,
  AlertCircle,
  Columns,
  Save,
  X
} from 'lucide-react';
import { EventDetails, Vendor, ExpenseCategory, PaymentStatus } from '../../types';
import { ALL_EXPENSE_CATEGORIES } from '../../services/budgetCalculator';
import { storage } from '../../services/storage';

interface VendorManagerProps {
  event: EventDetails;
  vendors: Vendor[];
  onUpdate: () => void;
}

export const VendorManager: React.FC<VendorManagerProps> = ({ event, vendors, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareCategory, setCompareCategory] = useState<string>('Food & Catering');

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food & Catering');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [quotedCost, setQuotedCost] = useState<number>(0);
  const [agreedCost, setAgreedCost] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [bookingStatus, setBookingStatus] = useState<Vendor['bookingStatus']>('inquiry');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');

  const openCreateModal = () => {
    setName('');
    setCategory('Food & Catering');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setWebsite('');
    setQuotedCost(0);
    setAgreedCost(0);
    setPaidAmount(0);
    setBookingStatus('inquiry');
    setDeliveryDate('');
    setNotes('');
    setEditingVendor(null);
    setIsModalOpen(true);
  };

  const openEditModal = (v: Vendor) => {
    setName(v.name);
    setCategory(v.category);
    setContactPerson(v.contactPerson || '');
    setEmail(v.email || '');
    setPhone(v.phone || '');
    setWebsite(v.website || '');
    setQuotedCost(v.quotedCost);
    setAgreedCost(v.agreedCost);
    setPaidAmount(v.paidAmount);
    setBookingStatus(v.bookingStatus);
    setDeliveryDate(v.deliveryDate || '');
    setNotes(v.notes || '');
    setEditingVendor(v);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let paymentStatus: PaymentStatus = 'unpaid';
    if (paidAmount >= agreedCost && agreedCost > 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partially_paid';
    }

    if (editingVendor) {
      const updated: Vendor = {
        ...editingVendor,
        name,
        category,
        contactPerson,
        email,
        phone,
        website,
        quotedCost,
        agreedCost,
        paidAmount,
        bookingStatus,
        paymentStatus,
        deliveryDate,
        notes
      };
      storage.saveVendor(updated);
    } else {
      const newVendor: Vendor = {
        id: 'ven-' + Date.now(),
        eventId: event.id,
        name,
        category,
        contactPerson,
        email,
        phone,
        website,
        quotedCost,
        agreedCost,
        paidAmount,
        bookingStatus,
        paymentStatus,
        deliveryDate,
        notes
      };
      storage.saveVendor(newVendor);
    }

    setIsModalOpen(false);
    setEditingVendor(null);
    onUpdate();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this vendor record?')) {
      storage.deleteVendor(id);
      onUpdate();
    }
  };

  // Compare mode vendors
  const compareVendors = vendors.filter(v => v.category === compareCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Store className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white font-['Outfit']">
              Vendor Contracts & Quotation Tracker
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Compare service quotes side by side, track agreed balances, and maintain organizer-only contact notes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCompareMode(!isCompareMode)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
              isCompareMode
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Columns className="w-4 h-4" />
            <span>{isCompareMode ? 'List View' : 'Side-by-Side Compare'}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-600/30 flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vendor</span>
          </button>
        </div>
      </div>

      {/* SIDE-BY-SIDE COMPARISON VIEW */}
      {isCompareMode ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Compare Category:</span>
            <select
              value={compareCategory}
              onChange={e => setCompareCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200"
            >
              {ALL_EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span className="text-slate-500 font-mono">({compareVendors.length} options found)</span>
          </div>

          {compareVendors.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
              <Store className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm">No vendors entered under "{compareCategory}".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {compareVendors.map(v => (
                <div key={v.id} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                      {v.category}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {v.bookingStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{v.name}</h3>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Quoted Price:</span>
                      <span className="font-mono text-slate-200 font-bold">{event.currency} {v.quotedCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Agreed Contract:</span>
                      <span className="font-mono text-indigo-300 font-bold">{event.currency} {v.agreedCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Paid Cash:</span>
                      <span className="font-mono text-emerald-400 font-bold">{event.currency} {v.paidAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {v.notes && (
                    <p className="text-xs text-slate-400 italic pt-2 border-t border-slate-800/80">{v.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* STANDARD VENDOR LIST */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendors.length === 0 ? (
            <div className="col-span-2 glass-panel rounded-2xl p-8 text-center text-slate-400">
              <Store className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm">No vendors recorded yet.</p>
            </div>
          ) : (
            vendors.map(v => {
              const balanceDue = Math.max(0, v.agreedCost - v.paidAmount);

              return (
                <div key={v.id} className="glass-panel rounded-xl p-4 space-y-3 hover:border-slate-700 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">{v.category}</span>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                          v.bookingStatus === 'confirmed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {v.bookingStatus.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">{v.name}</h3>
                      {v.contactPerson && (
                        <div className="text-xs text-slate-400 mt-0.5">Contact: {v.contactPerson}</div>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => openEditModal(v)}
                        className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Financial Overview */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase">Quoted</span>
                      <div className="font-mono text-slate-300 font-bold">{event.currency} {v.quotedCost.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase">Agreed</span>
                      <div className="font-mono text-indigo-300 font-bold">{event.currency} {v.agreedCost.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase">Balance Due</span>
                      <div className={`font-mono font-bold ${balanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {event.currency} {balanceDue.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Contact Methods */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                    {v.phone && (
                      <a href={`tel:${v.phone}`} className="flex items-center space-x-1 hover:text-slate-200">
                        <Phone className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{v.phone}</span>
                      </a>
                    )}
                    {v.email && (
                      <a href={`mailto:${v.email}`} className="flex items-center space-x-1 hover:text-slate-200">
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        <span>{v.email}</span>
                      </a>
                    )}
                  </div>

                  {v.notes && (
                    <p className="text-xs text-slate-400 italic pt-1 border-t border-slate-800/80">{v.notes}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white font-['Outfit']">
                {editingVendor ? 'Edit Vendor Record' : 'Record New Vendor'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Vendor / Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metropolitan Catering Co., SoundPro Boston"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Service Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {ALL_EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Booking Status</label>
                  <select
                    value={bookingStatus}
                    onChange={e => setBookingStatus(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="inquiry">Initial Inquiry</option>
                    <option value="quote_received">Quote Received</option>
                    <option value="negotiating">Negotiating Terms</option>
                    <option value="confirmed">Confirmed Contract</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Quoted Cost ({event.currency})</label>
                  <input
                    type="number"
                    min={0}
                    value={quotedCost}
                    onChange={e => setQuotedCost(Number(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Agreed Cost ({event.currency})</label>
                  <input
                    type="number"
                    min={0}
                    value={agreedCost}
                    onChange={e => setAgreedCost(Number(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Paid Amount ({event.currency})</label>
                  <input
                    type="number"
                    min={0}
                    value={paidAmount}
                    onChange={e => setPaidAmount(Number(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Derrick O'Connor"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 617-555-0143"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notes / Organizer-Only Details</label>
                <textarea
                  rows={2}
                  placeholder="Service inclusions, arrival time, setup instructions..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
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
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl transition flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Vendor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
