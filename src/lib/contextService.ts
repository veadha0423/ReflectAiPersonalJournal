import { ContextData, WeatherContext, HealthContext, CalendarEventContext, JournalLocation } from '../types';

/**
 * Fetch live current weather from the server endpoint (proxied to Open-Meteo)
 */
export async function fetchLiveWeather(lat?: number, lon?: number, city?: string): Promise<WeatherContext | null> {
  try {
    const params = new URLSearchParams();
    if (lat !== undefined && !isNaN(lat)) params.set('lat', String(lat));
    if (lon !== undefined && !isNaN(lon)) params.set('lon', String(lon));
    if (city) params.set('city', city);

    const res = await fetch(`/api/context/weather?${params.toString()}`);
    if (!res.ok) throw new Error(`Weather fetch failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn('Weather service lookup error:', err);
    return null;
  }
}

/**
 * Get device location with GPS coordinates and reverse geocoding
 */
export function getDeviceLocation(): Promise<JournalLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let placeName = 'Current Location';

        try {
          // Reverse geocode with Open-Meteo or BigDataCloud client lookup
          const geoRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const city = geoData.city || geoData.locality || geoData.principalSubdivision;
            const country = geoData.countryCode || geoData.countryName;
            if (city) {
              placeName = country ? `${city}, ${country}` : city;
            }
          }
        } catch {
          placeName = `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`;
        }

        resolve({
          placeName,
          latitude,
          longitude,
        });
      },
      (error) => {
        reject(error);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  });
}

/**
 * Default sample health context telemetry presets or saved user health status
 */
const SAVED_HEALTH_KEY = 'reflectai_saved_health_telemetry';
const SAVED_CALENDAR_KEY = 'reflectai_saved_calendar_events';
const AUTO_CONTEXT_KEY = 'reflectai_auto_context_enabled';

export function getAutoContextEnabled(): boolean {
  try {
    const val = localStorage.getItem(AUTO_CONTEXT_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setAutoContextEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_CONTEXT_KEY, String(enabled));
  } catch {
    // Ignore storage error
  }
}

export function getSavedHealthContext(): HealthContext {
  try {
    const stored = localStorage.getItem(SAVED_HEALTH_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore
  }

  // Default realistic baseline health snapshot
  return {
    sleepHours: 7.5,
    sleepQuality: 'restorative',
    workoutType: 'Morning 5km Run',
    workoutDurationMins: 32,
    caloriesBurned: 340,
    stepCount: 8420,
    heartRateBpm: 62,
    syncedFrom: 'device',
    notes: 'Feeling energized after morning run',
  };
}

export function saveHealthContext(health: HealthContext): void {
  try {
    localStorage.setItem(SAVED_HEALTH_KEY, JSON.stringify(health));
  } catch {
    // Ignore
  }
}

export function getSavedCalendarEvents(): CalendarEventContext[] {
  try {
    const stored = localStorage.getItem(SAVED_CALENDAR_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore
  }

  const now = new Date();
  const todayStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return [
    {
      id: 'cal-1',
      title: 'Sprint Retrospective & Team Sync',
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      location: 'Virtual / Meet',
      category: 'work',
      attendeesCount: 6,
      isCompleted: true,
    },
    {
      id: 'cal-2',
      title: 'Design Review & Architecture Planning',
      startTime: '02:30 PM',
      endTime: '03:30 PM',
      location: 'Studio Room B',
      category: 'work',
      attendeesCount: 4,
      isCompleted: false,
    },
    {
      id: 'cal-3',
      title: 'Evening Vinyasa Yoga Session',
      startTime: '06:30 PM',
      endTime: '07:30 PM',
      location: 'Wellness Center',
      category: 'health',
      attendeesCount: 1,
      isCompleted: false,
    },
  ];
}

export function saveCalendarEvents(events: CalendarEventContext[]): void {
  try {
    localStorage.setItem(SAVED_CALENDAR_KEY, JSON.stringify(events));
  } catch {
    // Ignore
  }
}

/**
 * Automatically gather all active real-time context (weather, health, calendar, location)
 */
export async function autoGatherCurrentContext(): Promise<ContextData> {
  const result: ContextData = {
    syncedAt: new Date().toISOString(),
  };

  // 1. Try gathering location
  try {
    const loc = await getDeviceLocation();
    result.location = loc;
    // 2. Fetch live weather using real coordinates
    const weather = await fetchLiveWeather(loc.latitude, loc.longitude, loc.placeName);
    if (weather) result.weather = weather;
  } catch {
    // Fallback weather with standard city
    try {
      const weather = await fetchLiveWeather(undefined, undefined, 'San Francisco');
      if (weather) result.weather = weather;
    } catch {
      // Ignore
    }
  }

  // 3. Attach current health snapshot
  result.health = getSavedHealthContext();

  // 4. Attach today's calendar events
  result.calendarEvents = getSavedCalendarEvents();

  return result;
}
