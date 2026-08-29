import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Activity,
  Calendar,
  MapPin,
  RefreshCw,
  X,
  Check,
  Zap,
  Moon,
  Flame,
  Footprints,
  Heart,
  Plus,
  Trash2,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { ContextData, WeatherContext, HealthContext, CalendarEventContext, JournalLocation } from '../types';
import {
  fetchLiveWeather,
  getDeviceLocation,
  getSavedHealthContext,
  saveHealthContext,
  getSavedCalendarEvents,
  saveCalendarEvents,
  getAutoContextEnabled,
  setAutoContextEnabled,
} from '../lib/contextService';

interface ContextManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentContext?: ContextData;
  onApplyContext: (context: ContextData) => void;
}

export const ContextManagerModal: React.FC<ContextManagerModalProps> = ({
  isOpen,
  onClose,
  currentContext,
  onApplyContext,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'weather' | 'health' | 'calendar' | 'location'>('all');
  const [autoEnrich, setAutoEnrich] = useState<boolean>(getAutoContextEnabled());
  
  // Local state for context sections
  const [weather, setWeather] = useState<WeatherContext | undefined>(currentContext?.weather);
  const [health, setHealth] = useState<HealthContext>(currentContext?.health || getSavedHealthContext());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventContext[]>(currentContext?.calendarEvents || getSavedCalendarEvents());
  const [location, setLocation] = useState<JournalLocation | undefined>(currentContext?.location);
  
  const [cityInput, setCityInput] = useState('');
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  
  // New calendar event form
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventCategory, setNewEventCategory] = useState<'work' | 'personal' | 'health'>('work');

  useEffect(() => {
    if (isOpen) {
      setAutoEnrich(getAutoContextEnabled());
      if (currentContext?.weather) setWeather(currentContext.weather);
      if (currentContext?.health) setHealth(currentContext.health);
      if (currentContext?.calendarEvents) setCalendarEvents(currentContext.calendarEvents);
      if (currentContext?.location) setLocation(currentContext.location);
      
      // Auto-load weather if empty
      if (!currentContext?.weather) {
        handleRefreshWeather();
      }
    }
  }, [isOpen, currentContext]);

  if (!isOpen) return null;

  const handleRefreshWeather = async (customCity?: string) => {
    setIsLoadingWeather(true);
    try {
      const cityToUse = customCity || cityInput || (location?.placeName !== 'Current Location' ? location?.placeName : undefined);
      const data = await fetchLiveWeather(location?.latitude, location?.longitude, cityToUse);
      if (data) {
        setWeather(data);
      }
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const handleDetectLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const loc = await getDeviceLocation();
      setLocation(loc);
      // Auto fetch weather for detected location
      const wData = await fetchLiveWeather(loc.latitude, loc.longitude, loc.placeName);
      if (wData) setWeather(wData);
    } catch (err: any) {
      console.warn('Geolocation detection failed:', err);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleAddCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    const newEvent: CalendarEventContext = {
      id: `cal-${Date.now()}`,
      title: newEventTitle.trim(),
      startTime: newEventTime.trim() || 'Scheduled',
      category: newEventCategory,
      isCompleted: false,
    };
    const updated = [...calendarEvents, newEvent];
    setCalendarEvents(updated);
    saveCalendarEvents(updated);
    setNewEventTitle('');
    setNewEventTime('');
  };

  const handleRemoveCalendarEvent = (id: string) => {
    const updated = calendarEvents.filter((e) => e.id !== id);
    setCalendarEvents(updated);
    saveCalendarEvents(updated);
  };

  const handleSaveHealthTelemetry = () => {
    saveHealthContext(health);
  };

  const handleToggleAutoEnrich = (enabled: boolean) => {
    setAutoEnrich(enabled);
    setAutoContextEnabled(enabled);
  };

  const handleApply = () => {
    handleSaveHealthTelemetry();
    saveCalendarEvents(calendarEvents);
    
    const aggregated: ContextData = {
      weather,
      health,
      calendarEvents,
      location,
      syncedAt: new Date().toISOString(),
    };
    onApplyContext(aggregated);
    onClose();
  };

  return (
    <div
      id="context-manager-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="context-manager-modal-card"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Contextual Enrichment Engine
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-950 border border-indigo-800/80 text-indigo-300">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Automatically pull health, weather, schedule, and location data into your journal
              </p>
            </div>
          </div>
          <button
            id="close-context-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-Enrich Banner */}
        <div className="px-6 py-2.5 bg-indigo-950/40 border-b border-indigo-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-indigo-200">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Auto-pull real-time context for every new journal reflection</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[11px] text-slate-300 font-medium">{autoEnrich ? 'Enabled' : 'Disabled'}</span>
            <input
              type="checkbox"
              checked={autoEnrich}
              onChange={(e) => handleToggleAutoEnrich(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 relative"></div>
          </label>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800/60 bg-slate-900/50">
          {[
            { id: 'all', label: 'All Services', icon: Sliders },
            { id: 'weather', label: 'Weather', icon: CloudSun },
            { id: 'health', label: 'Health & Workouts', icon: Activity },
            { id: 'calendar', label: 'Calendar Agenda', icon: Calendar },
            { id: 'location', label: 'Location', icon: MapPin },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? 'text-indigo-300 border-indigo-500 bg-slate-800/60'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Weather Section */}
          {(activeTab === 'all' || activeTab === 'weather') && (
            <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{weather?.iconEmoji || '🌤️'}</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      Live Weather & Environment
                      <span className="text-[10px] text-slate-400 font-normal">via Open-Meteo</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      {weather ? `${weather.locationName} • ${weather.temperature}${weather.temperatureUnit}, ${weather.condition}` : 'Fetching current conditions...'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRefreshWeather()}
                  disabled={isLoadingWeather}
                  className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-all cursor-pointer"
                  title="Refresh weather"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWeather ? 'animate-spin text-indigo-400' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {weather && (
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 block">Temperature</span>
                    <span className="text-sm font-bold text-slate-100">{weather.temperature}{weather.temperatureUnit}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 block">Humidity</span>
                    <span className="text-sm font-bold text-slate-100">{weather.humidity || 52}%</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 block">Wind Speed</span>
                    <span className="text-sm font-bold text-slate-100">{weather.windSpeed || 10} km/h</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="Or search another city (e.g., Tokyo, London, Paris)..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleRefreshWeather(cityInput)}
                  disabled={!cityInput.trim() || isLoadingWeather}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                >
                  Fetch City
                </button>
              </div>
            </div>
          )}

          {/* Health & Fitness Telemetry */}
          {(activeTab === 'all' || activeTab === 'health') && (
            <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Health & Physical Telemetry</h3>
                    <p className="text-xs text-slate-400">Sleep, activity, steps, and heart rate integration</p>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800">
                  Synced: {health.syncedFrom || 'Device'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Sleep */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
                    <Moon className="w-3.5 h-3.5" />
                    <span>Sleep (hrs)</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="24"
                    value={health.sleepHours || 7.5}
                    onChange={(e) => setHealth({ ...health, sleepHours: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={health.sleepQuality || 'restorative'}
                    onChange={(e) => setHealth({ ...health, sleepQuality: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1 text-[11px] text-slate-300"
                  >
                    <option value="poor">Poor</option>
                    <option value="fair">Fair</option>
                    <option value="good">Good</option>
                    <option value="restorative">Restorative</option>
                  </select>
                </div>

                {/* Workout */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Calories (kcal)</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={health.caloriesBurned || 340}
                    onChange={(e) => setHealth({ ...health, caloriesBurned: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 block truncate">Active burn today</span>
                </div>

                {/* Steps */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-teal-400 font-medium">
                    <Footprints className="w-3.5 h-3.5" />
                    <span>Steps Count</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={health.stepCount || 8420}
                    onChange={(e) => setHealth({ ...health, stepCount: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 block">Daily pedometer</span>
                </div>

                {/* Heart Rate */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-pink-400 font-medium">
                    <Heart className="w-3.5 h-3.5" />
                    <span>Resting HR</span>
                  </div>
                  <input
                    type="number"
                    min="40"
                    max="180"
                    value={health.heartRateBpm || 62}
                    onChange={(e) => setHealth({ ...health, heartRateBpm: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 block">bpm avg</span>
                </div>
              </div>

              {/* Workout Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Workout / Activity Label</label>
                <input
                  type="text"
                  value={health.workoutType || ''}
                  onChange={(e) => setHealth({ ...health, workoutType: e.target.value })}
                  placeholder="e.g., Morning 5km Run, Crossfit, 45min Yoga, Evening Bike Ride"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Calendar Agenda Section */}
          {(activeTab === 'all' || activeTab === 'calendar') && (
            <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-950/80 border border-blue-700/60 flex items-center justify-center text-blue-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Calendar Agenda & Schedule</h3>
                    <p className="text-xs text-slate-400">Syncs today's appointments and activities for AI context</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {calendarEvents.length} events logged
                </span>
              </div>

              {/* Events List */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {calendarEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/90 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded-md bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono text-[10px]">
                        {evt.startTime}
                      </span>
                      <span className="font-semibold text-slate-200">{evt.title}</span>
                      {evt.location && (
                        <span className="text-slate-400 text-[11px]">({evt.location})</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCalendarEvent(evt.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      title="Remove event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add event row */}
              <form onSubmit={handleAddCalendarEvent} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  placeholder="Time (e.g., 3:00 PM)"
                  className="w-28 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Meeting / Event title..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newEventTitle.trim()}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Event</span>
                </button>
              </form>
            </div>
          )}

          {/* Location Section */}
          {(activeTab === 'all' || activeTab === 'location') && (
            <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Location of the Moment</h3>
                    <p className="text-xs text-slate-400">
                      {location ? location.placeName : 'No location detected'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isLoadingLocation}
                  className="px-3 py-1.5 rounded-lg border border-cyan-800/60 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MapPin className={`w-3.5 h-3.5 ${isLoadingLocation ? 'animate-bounce' : ''}`} />
                  <span>{isLoadingLocation ? 'Detecting GPS...' : 'Detect Location'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={location?.placeName || ''}
                  onChange={(e) => setLocation({ placeName: e.target.value })}
                  placeholder="Or enter custom place name (e.g. Central Park, NY)..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            id="apply-context-modal-btn"
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Apply Context to Entry</span>
          </button>
        </div>
      </div>
    </div>
  );
};
