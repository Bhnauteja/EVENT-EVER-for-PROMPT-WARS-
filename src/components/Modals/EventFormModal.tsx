import React, { useState } from 'react';
import { Calendar, MapPin, DollarSign, Users, Globe, X, Save } from 'lucide-react';
import { EventDetails, EventType } from '../../types';
import { storage } from '../../services/storage';

interface EventFormModalProps {
  initialEvent?: EventDetails;
  onClose: () => void;
  onSaved: (event: EventDetails) => void;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({ initialEvent, onClose, onSaved }) => {
  const [name, setName] = useState(initialEvent ? initialEvent.name : '');
  const [type, setType] = useState<EventType>(initialEvent ? initialEvent.type : 'hackathon');
  const [description, setDescription] = useState(initialEvent ? initialEvent.description : '');
  const [startDate, setStartDate] = useState(
    initialEvent ? initialEvent.startDate.slice(0, 16) : '2026-11-20T10:00'
  );
  const [endDate, setEndDate] = useState(
    initialEvent ? initialEvent.endDate.slice(0, 16) : '2026-11-21T18:00'
  );
  const [timezone, setTimezone] = useState(initialEvent ? initialEvent.timezone : 'America/New_York');
  const [venueName, setVenueName] = useState(initialEvent ? initialEvent.venueName : '');
  const [venueAddress, setVenueAddress] = useState(initialEvent ? initialEvent.venueAddress : '');
  const [directionsUrl, setDirectionsUrl] = useState(initialEvent ? initialEvent.directionsUrl || '' : '');
  const [estimatedGuests, setEstimatedGuests] = useState<number>(initialEvent ? initialEvent.estimatedGuests : 150);
  const [totalPlannedBudget, setTotalPlannedBudget] = useState<number>(initialEvent ? initialEvent.totalPlannedBudget : 15000);
  const [currency, setCurrency] = useState(initialEvent ? initialEvent.currency : 'USD');
  const [dressCode, setDressCode] = useState(initialEvent ? initialEvent.dressCode || '' : '');
  const [parkingInfo, setParkingInfo] = useState(initialEvent ? initialEvent.parkingInfo || '' : '');
  const [specialInstructions, setSpecialInstructions] = useState(initialEvent ? initialEvent.specialInstructions || '' : '');
  const [isPublished, setIsPublished] = useState(initialEvent ? initialEvent.isPublished : true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !venueName.trim()) return;

    const slug = initialEvent?.publicSlug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substr(2, 4);

    const savedEvent: EventDetails = {
      id: initialEvent ? initialEvent.id : 'event-' + Date.now(),
      name,
      type,
      description,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      timezone,
      venueName,
      venueAddress,
      directionsUrl: directionsUrl || undefined,
      estimatedGuests,
      totalPlannedBudget,
      currency,
      dressCode: dressCode || undefined,
      parkingInfo: parkingInfo || undefined,
      specialInstructions: specialInstructions || undefined,
      organizerLanguage: 'en',
      isPublished,
      publicSlug: slug,
      createdAt: initialEvent ? initialEvent.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storage.saveEvent(savedEvent);
    storage.setActiveEventId(savedEvent.id);
    onSaved(savedEvent);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white font-['Outfit']">
              {initialEvent ? 'Edit Event Details' : 'Create New Event'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Event Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. NextGen AI Summit, Elena & Liam Wedding, Sarah's 25th Birthday"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Event Category</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as EventType)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="hackathon">Hackathon / College Event</option>
                <option value="wedding">Wedding Celebration</option>
                <option value="birthday">Birthday Party</option>
                <option value="conference">Conference / Summit</option>
                <option value="community">Community Gathering</option>
                <option value="dinner">Private Dinner / Banquet</option>
                <option value="custom">Custom Event</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Timezone</label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Start Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">End Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Estimated Guests</label>
              <input
                type="number"
                min={1}
                value={estimatedGuests}
                onChange={e => setEstimatedGuests(Number(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Total Budget Target</label>
              <input
                type="number"
                min={0}
                value={totalPlannedBudget}
                onChange={e => setTotalPlannedBudget(Number(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Venue Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Innovation Hall, St. Helena Estate"
                value={venueName}
                onChange={e => setVenueName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Venue Physical Street Address *</label>
              <input
                type="text"
                required
                placeholder="e.g. 450 Technology Square, Cambridge, MA"
                value={venueAddress}
                onChange={e => setVenueAddress(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Google Maps / Directions Link</label>
            <input
              type="url"
              placeholder="https://maps.google.com/?q=..."
              value={directionsUrl}
              onChange={e => setDirectionsUrl(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Dress Code</label>
              <input
                type="text"
                placeholder="e.g. Cocktail Attire, Hackathon Casual, Black Tie"
                value={dressCode}
                onChange={e => setDressCode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Parking Instructions</label>
              <input
                type="text"
                placeholder="e.g. Free parking in East Garage code TECH26, Valet"
                value={parkingInfo}
                onChange={e => setParkingInfo(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Special Instructions for Guests</label>
            <textarea
              rows={2}
              placeholder="e.g. Bring laptop, chargers, photo ID. WiFi vouchers provided upon arrival."
              value={specialInstructions}
              onChange={e => setSpecialInstructions(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isPub"
              checked={isPublished}
              onChange={e => setIsPublished(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
            />
            <label htmlFor="isPub" className="text-slate-300 font-medium cursor-pointer">
              Publish Event Information to Public Guest Hub
            </label>
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
              <span>{initialEvent ? 'Save Changes' : 'Create Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
