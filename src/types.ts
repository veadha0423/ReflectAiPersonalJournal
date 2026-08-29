export type ReflectionMode = 'reflection' | 'brainstorm' | 'summary' | 'reframe' | 'gratitude';

export type BuiltInLifeSector =
  | 'health'
  | 'career'
  | 'finance'
  | 'relationships'
  | 'growth'
  | 'creative'
  | 'travel'
  | 'spiritual'
  | 'home'
  | 'leisure';

export type LifeSector = BuiltInLifeSector | string;

export interface SectorDefinition {
  id: LifeSector;
  label: string;
  emoji: string;
  iconName: string;
  description: string;
  keywords: string[];
  isCustom?: boolean;
  colorTheme: {
    bg: string;
    border: string;
    text: string;
    pillBg: string;
    gradient: string;
  };
}

export interface CustomCategory {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  description?: string;
  color: string; // Tailwind color accent, e.g., 'indigo', 'emerald', 'amber', 'rose', 'cyan', 'purple', 'teal'
  createdAt: string;
  updatedAt?: string;
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video';
  mimeType: string;
  dataUrl: string; // Base64 data URL
  fileName: string;
  fileSize: number;
  visionDescription?: string;
}

export interface JournalLocation {
  placeName: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
}

export interface WeatherContext {
  temperature: number; // in Celsius or Fahrenheit
  temperatureUnit: '°C' | '°F';
  condition: string; // e.g. "Sunny", "Partly Cloudy", "Rainy"
  weatherCode?: number;
  iconEmoji: string; // e.g. "☀️", "⛅", "🌧️", "❄️"
  locationName?: string;
  humidity?: number; // percentage
  windSpeed?: number; // km/h
  recordedAt: string;
}

export interface HealthContext {
  sleepHours?: number; // e.g., 7.5
  sleepQuality?: 'poor' | 'fair' | 'good' | 'restorative' | string;
  workoutType?: string; // e.g. "Morning 5km Run", "Strength Training", "Yoga"
  workoutDurationMins?: number; // e.g. 45
  caloriesBurned?: number; // e.g. 380
  stepCount?: number; // e.g. 8450
  heartRateBpm?: number; // e.g. 64
  syncedFrom?: 'manual' | 'device' | 'apple_health' | 'google_fit' | 'fitbit' | string;
  notes?: string;
}

export interface CalendarEventContext {
  id: string;
  title: string;
  startTime: string; // e.g., "09:30 AM" or ISO
  endTime?: string;
  location?: string;
  category?: 'work' | 'personal' | 'health' | 'social' | string;
  attendeesCount?: number;
  isCompleted?: boolean;
}

export interface ContextData {
  weather?: WeatherContext;
  health?: HealthContext;
  calendarEvents?: CalendarEventContext[];
  location?: JournalLocation;
  syncedAt?: string;
}

export interface JournalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: ReflectionMode;
  modelUsed?: string;
  attachments?: MediaAttachment[];
  location?: JournalLocation;
  contextData?: ContextData;
}

export interface JournalInteraction {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  mode: ReflectionMode;
  messages: JournalMessage[];
  sector?: LifeSector;
  customCategoryId?: string;
  moodScore?: number; // 1 to 10
  location?: JournalLocation;
  attachments?: MediaAttachment[];
  contextData?: ContextData;
  summary?: string;
  keyInsights?: string[];
  tags?: string[];
  sentimentTone?: string;
  isPinned?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

export interface ModeOption {
  id: ReflectionMode;
  label: string;
  description: string;
  iconName: string;
  placeholder: string;
  accentColor: string;
}

export interface SearchFilterState {
  searchQuery: string;
  datePreset: 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  selectedSectors: string[]; // Sector IDs (built-in or custom)
  selectedTags: string[];
  selectedLocation?: string;
  mediaType: 'all' | 'with_photos' | 'with_videos' | 'with_context' | 'text_only';
  minMood?: number | null;
  sortBy: 'newest' | 'oldest' | 'highest_mood' | 'lowest_mood';
}

export type NotificationChannel = 'email' | 'slack';

export type NotificationTriggerType =
  | 'weekly_digest'
  | 'reflection_summary'
  | 'daily_reminder'
  | 'streak_milestone'
  | 'mood_alert'
  | 'manual_share'
  | 'test_notification';

export interface NotificationTriggersConfig {
  weeklyDigest: boolean;
  dailyReminder: boolean;
  reflectionSummary: boolean;
  milestoneAlerts: boolean;
}

export interface NotificationSettings {
  userId: string;
  emailEnabled: boolean;
  recipientEmail: string;
  emailTriggers: NotificationTriggersConfig;
  slackEnabled: boolean;
  slackWebhookUrl: string;
  slackChannelName: string;
  slackBotName: string;
  slackTriggers: NotificationTriggersConfig;
  reminderTime?: string; // e.g. "20:00"
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  userId: string;
  channel: NotificationChannel;
  triggerType: NotificationTriggerType;
  title: string;
  summary: string;
  status: 'sent' | 'failed' | 'simulated';
  recipient: string; // email address or slack channel
  timestamp: string;
  error?: string;
  entryId?: string;
  metadata?: Record<string, any>;
}

