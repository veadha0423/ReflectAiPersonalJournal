import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  MapPin,
  Clock,
  Sparkles,
  ChevronRight,
  Trash2,
  Share2,
  Image as ImageIcon,
  Video,
  Smile,
  Tag,
  Activity,
  Calendar,
  CloudSun,
  Zap,
} from 'lucide-react';
import { getSectorById } from '../lib/sectors';
import type {
  JournalInteraction,
  LifeSector,
  MediaAttachment,
  CustomCategory,
  SearchFilterState,
} from '../types';
import { FilterBar } from './FilterBar';
import { applyJournalFilters } from '../lib/filterUtils';

interface RecentEntriesFeedProps {
  interactions: JournalInteraction[];
  onSelectEntry: (interaction: JournalInteraction) => void;
  onDeleteEntry: (id: string, e: React.MouseEvent) => void;
  selectedSector: LifeSector | 'all';
  onOpenMediaModal: (media: MediaAttachment, title: string) => void;
  customCategories?: CustomCategory[];
  onOpenCustomCategories?: () => void;
}

export const RecentEntriesFeed: React.FC<RecentEntriesFeedProps> = ({
  interactions,
  onSelectEntry,
  onDeleteEntry,
  selectedSector,
  onOpenMediaModal,
  customCategories = [],
  onOpenCustomCategories = () => {},
}) => {
  const [filterState, setFilterState] = useState<SearchFilterState>({
    searchQuery: '',
    datePreset: 'all',
    selectedSectors: selectedSector !== 'all' ? [selectedSector] : [],
    selectedTags: [],
    mediaType: 'all',
    minMood: null,
    sortBy: 'newest',
  });

  // Sync selectedSector from props when user clicks top carousel cards
  React.useEffect(() => {
    if (selectedSector !== 'all') {
      setFilterState((prev) => ({
        ...prev,
        selectedSectors: [selectedSector],
      }));
    } else {
      setFilterState((prev) => ({
        ...prev,
        selectedSectors: [],
      }));
    }
  }, [selectedSector]);

  // Apply rich search, date, tag, context, and custom category filters
  const filtered = useMemo(() => {
    return applyJournalFilters(interactions, filterState, customCategories);
  }, [interactions, filterState, customCategories]);

  // Helper for humanized relative time
  const formatTimeAgo = (isoString: string) => {
    try {
      const now = new Date();
      const past = new Date(isoString);
      const diffMs = now.getTime() - past.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSec < 60) return 'just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return '1d ago';
      if (diffDays < 7) return `${diffDays}d ago`;
      return past.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div id="recent-entries-feed" className="w-full space-y-4">
      {/* Search & Advanced Filter Bar */}
      <FilterBar
        filterState={filterState}
        onFilterChange={setFilterState}
        interactions={interactions}
        customCategories={customCategories}
        onOpenCustomCategories={onOpenCustomCategories}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-serif font-semibold text-sm sm:text-base text-slate-100">
            Journal Entries
          </h3>
          <span className="text-[11px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
            {filtered.length} found
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/50 border border-slate-800/80 rounded-2xl">
          <p className="text-xs font-medium text-slate-400">No journal entries matched your filters.</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Try adjusting your search keywords, clearing tags, or changing date ranges.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((entry) => {
            const sectorObj = getSectorById(entry.customCategoryId || entry.sector, customCategories);
            const firstMsg = entry.messages[0];
            const hasAttachments = (entry.attachments && entry.attachments.length > 0) || (firstMsg?.attachments && firstMsg.attachments.length > 0);
            const mediaList = entry.attachments || firstMsg?.attachments || [];
            const loc = entry.location || firstMsg?.location || entry.contextData?.location;
            const ctx = entry.contextData;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                id={`recent-entry-${entry.id}`}
                onClick={() => onSelectEntry(entry)}
                className="group relative bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-4 transition-all cursor-pointer shadow-md hover:shadow-indigo-950/20"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Main Title & Sector line matching: 📍 Morning run - 5km - 🏥 Health | 2h ago */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {loc && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400 font-medium bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-800/50">
                          <MapPin className="w-3 h-3" />
                          <span>{loc.placeName}</span>
                        </span>
                      )}

                      <span className="font-serif font-semibold text-sm text-slate-100 tracking-tight group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {entry.title || 'Untitled Entry'}
                      </span>

                      {/* Sector / Custom Category Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${sectorObj.colorTheme.pillBg}`}
                      >
                        <span>{sectorObj.emoji}</span>
                        <span>{sectorObj.label}</span>
                      </span>

                      {/* Mood Tag */}
                      {entry.moodScore !== undefined && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-300 bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-800/50">
                          <Smile className="w-2.5 h-2.5 text-amber-400" />
                          <span>{entry.moodScore.toFixed(1)}/10</span>
                        </span>
                      )}
                    </div>

                    {/* Context Telemetry Pills (Weather, Health, Calendar) */}
                    {ctx && (
                      <div className="flex items-center gap-1.5 flex-wrap my-1 text-[10px]">
                        {ctx.weather && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                            <span>{ctx.weather.iconEmoji || '🌤️'}</span>
                            <span>{ctx.weather.temperature}{ctx.weather.temperatureUnit}, {ctx.weather.condition}</span>
                          </span>
                        )}
                        {ctx.health && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-emerald-300">
                            <Activity className="w-2.5 h-2.5 text-emerald-400" />
                            <span>{ctx.health.workoutType || `${ctx.health.sleepHours}h Sleep`}</span>
                          </span>
                        )}
                        {ctx.calendarEvents && ctx.calendarEvents.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-blue-300">
                            <Calendar className="w-2.5 h-2.5 text-blue-400" />
                            <span>{ctx.calendarEvents[0].title}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Entry Excerpt / Summary */}
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans mt-1">
                      {entry.summary || firstMsg?.content || 'No journal text recorded.'}
                    </p>

                    {/* Tags List */}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {entry.tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 text-[10px]"
                          >
                            <Tag className="w-2.5 h-2.5 text-indigo-400" />
                            <span>{t}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Media attachments thumbnails */}
                    {hasAttachments && mediaList.length > 0 && (
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                        {mediaList.map((media) => (
                          <button
                            key={media.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenMediaModal(media, entry.title);
                            }}
                            className="relative group/thumb rounded-lg overflow-hidden border border-slate-700 hover:border-indigo-500 transition-colors"
                          >
                            {media.type === 'image' ? (
                              <img
                                src={media.dataUrl}
                                alt={media.fileName}
                                className="w-14 h-12 object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-14 h-12 bg-slate-950 flex flex-col items-center justify-center text-indigo-400">
                                <Video className="w-4 h-4" />
                                <span className="text-[8px] text-slate-400">Video</span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right side: Time Ago and Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs font-mono text-slate-500 font-medium">
                      {formatTimeAgo(entry.updatedAt || entry.createdAt)}
                    </span>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        id={`delete-recent-entry-${entry.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onDeleteEntry(entry.id, e);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                        title="Delete entry"
                        aria-label={`Delete ${entry.title || 'entry'}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="p-1.5 text-slate-500 group-hover:text-indigo-400 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
