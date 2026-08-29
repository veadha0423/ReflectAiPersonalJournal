import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Image as ImageIcon,
  Video,
  MapPin,
  Smile,
  Sparkles,
  Send,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sliders,
  ChevronDown,
  CloudSun,
  Activity,
  Calendar,
  Zap,
  Tag,
  Plus,
} from 'lucide-react';
import { LIFE_SECTORS, classifyTextSectorHeuristic, getSectorById, getAllCombinedSectors } from '../lib/sectors';
import type {
  JournalInteraction,
  JournalMessage,
  LifeSector,
  MediaAttachment,
  JournalLocation,
  ReflectionMode,
  ContextData,
  CustomCategory,
} from '../types';
import { TagInput } from './TagInput';
import { ContextManagerModal } from './ContextManagerModal';
import { autoGatherCurrentContext, getAutoContextEnabled } from '../lib/contextService';

interface QuickComposerProps {
  userId: string;
  onSaveEntry: (interaction: JournalInteraction) => Promise<void>;
  onOpenWorkspace: (interaction: JournalInteraction) => void;
  defaultSector?: LifeSector | 'all';
  customCategories?: CustomCategory[];
  onOpenCustomCategories?: () => void;
}

const MOOD_EMOJIS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '😫', label: 'Overwhelmed' },
  2: { emoji: '😔', label: 'Down' },
  3: { emoji: '😕', label: 'Uneasy' },
  4: { emoji: '😐', label: 'Neutral' },
  5: { emoji: '🙂', label: 'Steady' },
  6: { emoji: '😊', label: 'Good' },
  7: { emoji: '😌', label: 'Calm & Happy' },
  8: { emoji: '😃', label: 'Energized' },
  9: { emoji: '🥳', label: 'Thriving' },
  10: { emoji: '✨', label: 'Peak Joy' },
};

export const QuickComposer: React.FC<QuickComposerProps> = ({
  userId,
  onSaveEntry,
  onOpenWorkspace,
  defaultSector,
  customCategories = [],
  onOpenCustomCategories,
}) => {
  const [content, setContent] = useState('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>(
    defaultSector && defaultSector !== 'all' ? defaultSector : 'health'
  );
  const [isAutoSector, setIsAutoSector] = useState(true);
  const [mode, setMode] = useState<ReflectionMode>('reflection');
  const [moodScore, setMoodScore] = useState<number>(7.5);
  const [showMoodSlider, setShowMoodSlider] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  
  // Contextual Data
  const [contextData, setContextData] = useState<ContextData | null>(null);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  // Location
  const [location, setLocation] = useState<JournalLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isLocationEditorOpen, setIsLocationEditorOpen] = useState(false);
  const [customLocationName, setCustomLocationName] = useState('');

  // Media attachments
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [isAnalyzingMedia, setIsAnalyzingMedia] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Automatically pull contextual data if enabled on mount
  useEffect(() => {
    if (getAutoContextEnabled()) {
      setIsLoadingContext(true);
      autoGatherCurrentContext()
        .then((ctx) => {
          setContextData(ctx);
          if (ctx.location) {
            setLocation(ctx.location);
          }
        })
        .catch((err) => console.warn('Auto context pull error:', err))
        .finally(() => setIsLoadingContext(false));
    }
  }, []);

  const combinedCategories = getAllCombinedSectors(customCategories);

  // Auto-classify sector as user types if isAutoSector is enabled
  const handleContentChange = (val: string) => {
    setContent(val);
    if (isAutoSector && val.trim().length > 5) {
      const predicted = classifyTextSectorHeuristic(val, customCategories);
      setSelectedCategoryKey(predicted);
    }
  };

  // Location of the moment
  const handleFetchLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let placeName = `Coordinates (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`,
            { headers: { 'User-Agent': 'ReflectAI-Journal/1.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.suburb ||
              data.address?.county;
            const state = data.address?.state || data.address?.country;
            if (city) {
              placeName = `${city}, ${state || ''}`.trim().replace(/,\s*$/, '');
            } else if (data.display_name) {
              placeName = data.display_name.split(',').slice(0, 2).join(',');
            }
          }
        } catch {
          // Fallback to coordinates
        }

        const newLoc = { latitude, longitude, placeName };
        setLocation(newLoc);
        setCustomLocationName(placeName);
        if (contextData) {
          setContextData({ ...contextData, location: newLoc });
        }
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        const fallbackLoc = { placeName: 'My Journal Spot' };
        setLocation(fallbackLoc);
        setCustomLocationName('My Journal Spot');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Handle Image Upload (JPEG, PNG, GIF, WebP <= 5MB)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validFormats.includes(file.type)) {
      setErrorMessage('Unsupported image format. Please upload JPEG, PNG, GIF, or WebP.');
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage('Image size exceeds 5MB limit. Please upload a smaller file.');
      return;
    }

    setErrorMessage(null);
    setIsAnalyzingMedia(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const newAttachment: MediaAttachment = {
        id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'image',
        mimeType: file.type,
        dataUrl,
        fileName: file.name,
        fileSize: file.size,
      };

      setAttachments((prev) => [...prev, newAttachment]);

      // Call Gemini Vision to analyze image
      try {
        const visionRes = await fetch('/api/gemini/analyze-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, prompt: 'Analyze this photo for my journal.' }),
        });

        if (visionRes.ok) {
          const visionData = await visionRes.json();
          newAttachment.visionDescription = visionData.description;

          if (visionData.suggestedSector && isAutoSector) {
            setSelectedCategoryKey(visionData.suggestedSector);
          }

          if (Array.isArray(visionData.visualTags)) {
            setTags((prev) => Array.from(new Set([...prev, ...visionData.visualTags])));
          }

          setAttachments((prev) =>
            prev.map((a) => (a.id === newAttachment.id ? newAttachment : a))
          );
        }
      } catch (err) {
        console.warn('Vision analysis optional warning:', err);
      } finally {
        setIsAnalyzingMedia(false);
      }
    };
    reader.readAsDataURL(file);

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // Handle Video Upload (MP4, WebM <= 25MB)
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validVideoFormats = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validVideoFormats.includes(file.type)) {
      setErrorMessage('Unsupported video format. Please upload MP4 or WebM.');
      return;
    }

    const MAX_VIDEO_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_VIDEO_SIZE) {
      setErrorMessage('Video size exceeds 25MB limit.');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newAttachment: MediaAttachment = {
        id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'video',
        mimeType: file.type,
        dataUrl,
        fileName: file.name,
        fileSize: file.size,
      };
      setAttachments((prev) => [...prev, newAttachment]);
    };
    reader.readAsDataURL(file);

    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Submit and Create Journal Entry - navigates user to chatbot
  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) {
      setErrorMessage('Please write a thought or attach media before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const now = new Date().toISOString();
    const entryId = `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Determine sector vs custom category
    const isCustom = selectedCategoryKey.startsWith('custom_');
    const matchedSector = isCustom ? 'growth' : (selectedCategoryKey as LifeSector);
    const customCatId = isCustom ? selectedCategoryKey : undefined;

    const matchedConfig = combinedCategories.find((c) => c.id === selectedCategoryKey);
    let autoTitle = trimmed.slice(0, 45) + (trimmed.length > 45 ? '...' : '');
    if (!autoTitle) {
      autoTitle = `${matchedConfig?.emoji || '✨'} ${matchedConfig?.label || 'Life'} Moment`;
    }

    const userMessage: JournalMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      role: 'user',
      content: trimmed || `[Attached ${attachments.length} moment media file(s)]`,
      timestamp: now,
      mode,
      attachments: attachments.length > 0 ? attachments : undefined,
      location: location || undefined,
    };

    const initialTags = Array.from(new Set([
      ...(tags.length > 0 ? tags : []),
      matchedConfig?.label || 'Reflection',
    ]));

    const newInteraction: JournalInteraction = {
      id: entryId,
      userId,
      title: autoTitle,
      createdAt: now,
      updatedAt: now,
      mode,
      sector: matchedSector,
      customCategoryId: customCatId,
      moodScore,
      location: location || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      messages: [userMessage],
      tags: initialTags,
      contextData: contextData || undefined,
    };

    try {
      // 1. Persist to Firestore
      await onSaveEntry(newInteraction);

      // 2. Immediately navigate the user to the chatbot workspace
      onOpenWorkspace(newInteraction);

      // 3. Reset composer fields
      setContent('');
      setAttachments([]);
      setTags([]);
      setShowMoodSlider(false);

      // 4. Call server-side Gemini reflection with contextData & custom categories
      try {
        const reflectRes = await fetch('/api/gemini/reflect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [userMessage],
            mode,
            sector: matchedConfig?.label || matchedSector,
            location,
            contextData: contextData || undefined,
          }),
        });

        if (reflectRes.ok) {
          const reflectData = await reflectRes.json();
          const assistantMsg: JournalMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            role: 'assistant',
            content: reflectData.reply,
            timestamp: reflectData.timestamp || new Date().toISOString(),
            mode,
            modelUsed: reflectData.modelUsed,
          };

          const fullInteraction: JournalInteraction = {
            ...newInteraction,
            messages: [userMessage, assistantMsg],
            updatedAt: new Date().toISOString(),
          };

          await onSaveEntry(fullInteraction);

          // Trigger structured categorization & summary in background
          fetch('/api/gemini/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              threadText: `User: ${userMessage.content}\nGemini: ${reflectData.reply}`,
              contextData: contextData || undefined,
              customCategories,
            }),
          })
            .then((r) => r.json())
            .then((sumData) => {
              if (sumData.title || sumData.summary) {
                onSaveEntry({
                  ...fullInteraction,
                  title: sumData.title || fullInteraction.title,
                  sector: isCustom ? fullInteraction.sector : ((sumData.sector as LifeSector) || fullInteraction.sector),
                  summary: sumData.summary,
                  keyInsights: sumData.keyInsights || [],
                  tags: sumData.tags || fullInteraction.tags,
                  sentimentTone: sumData.sentimentTone,
                  moodScore: sumData.moodScore || fullInteraction.moodScore,
                });
              }
            })
            .catch(() => {});
        }
      } catch (aiErr) {
        console.warn('Gemini reflection connection fallback:', aiErr);
      }
    } catch (err: any) {
      console.error('Failed to submit journal entry:', err);
      setErrorMessage(err?.message || 'Could not save entry. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCategoryObj = combinedCategories.find((c) => c.id === selectedCategoryKey) || combinedCategories[0];
  const moodInfo = MOOD_EMOJIS[Math.round(moodScore)] || MOOD_EMOJIS[7];

  return (
    <div
      id="quick-journal-composer"
      className="w-full bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md relative overflow-hidden space-y-3"
    >
      {/* Top Header & Category Selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg">✍️</span>
          <h3 className="font-serif font-semibold text-sm sm:text-base text-slate-100">
            What's on your mind today?
          </h3>
        </div>

        {/* Category Tag Dropdown / Manage */}
        <div className="flex items-center gap-2">
          <div className="relative group">
            <select
              id="composer-sector-select"
              value={selectedCategoryKey}
              onChange={(e) => {
                setSelectedCategoryKey(e.target.value);
                setIsAutoSector(false);
              }}
              className="appearance-none text-xs font-semibold px-3 py-1.5 pr-7 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
            >
              <optgroup label="Life Sectors">
                {LIFE_SECTORS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.emoji} {s.label}
                  </option>
                ))}
              </optgroup>
              {customCategories.length > 0 && (
                <optgroup label="Custom Categories">
                  {customCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {onOpenCustomCategories && (
            <button
              type="button"
              onClick={onOpenCustomCategories}
              className="p-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="Create or manage custom categories"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Category</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Contextual Data Telemetry Bar */}
      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Zap className="w-3 h-3 text-indigo-400" />
            <span>Context:</span>
          </span>

          {/* Weather pill */}
          {contextData?.weather ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
              <span>{contextData.weather.iconEmoji || '🌤️'}</span>
              <span>{contextData.weather.temperature}{contextData.weather.temperatureUnit}, {contextData.weather.condition}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-500 text-[11px]">
              <CloudSun className="w-3 h-3" />
              <span>Weather</span>
            </span>
          )}

          {/* Health pill */}
          {contextData?.health ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-emerald-300 text-[11px]">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>{contextData.health.workoutType || `${contextData.health.sleepHours}h Sleep`}</span>
            </span>
          ) : null}

          {/* Location pill */}
          {location?.placeName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-cyan-300 text-[11px]">
              <MapPin className="w-3 h-3 text-cyan-400" />
              <span className="max-w-[140px] truncate">{location.placeName}</span>
            </span>
          )}

          {/* Next Calendar Event */}
          {contextData?.calendarEvents && contextData.calendarEvents.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-blue-300 text-[11px]">
              <Calendar className="w-3 h-3 text-blue-400" />
              <span className="max-w-[140px] truncate">{contextData.calendarEvents[0].title}</span>
            </span>
          )}
        </div>

        <button
          id="open-context-settings-btn"
          type="button"
          onClick={() => setIsContextModalOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg bg-indigo-950/60 border border-indigo-800/60 transition-colors cursor-pointer"
        >
          <Sliders className="w-3 h-3" />
          <span>Sync Context</span>
        </button>
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          id="composer-thought-textarea"
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Reflect on your day, describe a breakthrough, track your workout, or dump your thoughts..."
          rows={3}
          className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-y min-h-[90px] shadow-inner"
        />
      </div>

      {/* Tag Input Engine */}
      <TagInput
        tags={tags}
        onChange={setTags}
        journalText={content}
        sector={currentCategoryObj.label}
        disabled={isSubmitting}
      />

      {/* Attached Media Previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2.5 pt-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center"
            >
              {att.type === 'image' ? (
                <img
                  src={att.dataUrl}
                  alt={att.fileName || 'Moment photo'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={att.dataUrl}
                  className="w-full h-full object-cover"
                  controls={false}
                />
              )}

              <button
                type="button"
                onClick={() => handleRemoveAttachment(att.id)}
                className="absolute top-1.5 right-1.5 p-1 bg-slate-950/80 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer shadow-md"
                title="Remove attachment"
              >
                <X className="w-3 h-3" />
              </button>

              {att.visionDescription && (
                <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 p-1 text-[9px] text-slate-300 truncate">
                  {att.visionDescription}
                </div>
              )}
            </div>
          ))}

          {isAnalyzingMedia && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-300 px-3 py-2 bg-indigo-950/50 border border-indigo-800/50 rounded-xl">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Gemini Vision analyzing...</span>
            </div>
          )}
        </div>
      )}

      {/* Location Badge & Editor */}
      {location && (
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-xs font-medium">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span>📍 {location.placeName}</span>
            <button
              type="button"
              onClick={() => setIsLocationEditorOpen(true)}
              className="text-[10px] text-slate-400 hover:text-indigo-200 ml-1 underline cursor-pointer"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setLocation(null)}
              className="text-slate-400 hover:text-rose-400 ml-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {isLocationEditorOpen && (
        <div className="p-2 bg-slate-950 border border-slate-700 rounded-xl flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <input
            type="text"
            value={customLocationName}
            onChange={(e) => setCustomLocationName(e.target.value)}
            placeholder="E.g. Central Park, NY or Home Studio"
            className="flex-1 text-xs bg-transparent border-none text-slate-100 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (customLocationName.trim()) {
                const updatedLoc = {
                  ...location,
                  placeName: customLocationName.trim(),
                };
                setLocation(updatedLoc);
                if (contextData) {
                  setContextData({ ...contextData, location: updatedLoc });
                }
              }
              setIsLocationEditorOpen(false);
            }}
            className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 cursor-pointer"
          >
            Save Place
          </button>
          <button
            type="button"
            onClick={() => setIsLocationEditorOpen(false)}
            className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Mood Slider */}
      <AnimatePresence>
        {showMoodSlider && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-amber-400" />
                <span>How are you feeling right now?</span>
              </span>
              <span className="font-bold text-amber-300 font-mono">
                {moodInfo.emoji} {moodScore.toFixed(1)}/10 — {moodInfo.label}
              </span>
            </div>
            <input
              id="composer-mood-slider"
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={moodScore}
              onChange={(e) => setMoodScore(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1 (Low)</span>
              <span>5 (Neutral)</span>
              <span>10 (Peak)</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      {errorMessage && (
        <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
        <input
          ref={imageInputRef}
          id="composer-image-file-input"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleImageFileChange}
        />
        <input
          ref={videoInputRef}
          id="composer-video-file-input"
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={handleVideoFileChange}
        />

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            id="composer-upload-image-btn"
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            title="Upload photo (JPEG, PNG, GIF, WebP up to 5MB)"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Photo</span>
          </button>

          <button
            id="composer-upload-video-btn"
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            title="Upload video (MP4, WebM)"
          >
            <Video className="w-3.5 h-3.5 text-sky-400" />
            <span>Video</span>
          </button>

          <button
            id="composer-add-location-btn"
            type="button"
            onClick={handleFetchLocation}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Add location of the moment"
          >
            {isLocating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>{location ? 'Location' : 'Location'}</span>
          </button>

          <button
            id="composer-mood-toggle-btn"
            type="button"
            onClick={() => setShowMoodSlider(!showMoodSlider)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shadow-xs ${
              showMoodSlider
                ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                : 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
            }`}
            title="Log your current mood"
          >
            <Smile className="w-3.5 h-3.5 text-amber-400" />
            <span>Mood {moodScore.toFixed(0)}/10</span>
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            id="composer-submit-btn"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (!content.trim() && attachments.length === 0)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 active:scale-95 disabled:opacity-40 cursor-pointer"
            title="Save entry and converse with Gemini in Reflect Chat"
          >
            {isSubmitting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            )}
            <span>{isSubmitting ? 'Opening Chat...' : 'Save & Reflect in Chat'}</span>
          </button>
        </div>
      </div>

      {/* Context Manager Modal */}
      <ContextManagerModal
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        currentContext={contextData || undefined}
        onApplyContext={(ctx) => {
          setContextData(ctx);
          if (ctx.location) setLocation(ctx.location);
        }}
      />
    </div>
  );
};
