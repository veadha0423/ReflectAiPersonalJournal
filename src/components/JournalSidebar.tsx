import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  BookOpen,
  Trash2,
  Tag,
  Clock,
  Sparkles,
  ChevronRight,
  Pin,
  Calendar,
  Layers,
  X,
  Smile,
} from 'lucide-react';
import { getSectorById } from '../lib/sectors';
import type { JournalInteraction, ReflectionMode } from '../types';

interface JournalSidebarProps {
  interactions: JournalInteraction[];
  activeInteractionId: string | null;
  onSelectInteraction: (id: string) => void;
  onNewInteraction: () => void;
  onDeleteInteraction: (id: string, e: React.MouseEvent) => void;
  isLoading: boolean;
  onCloseMobile?: () => void;
}

export const JournalSidebar: React.FC<JournalSidebarProps> = ({
  interactions,
  activeInteractionId,
  onSelectInteraction,
  onNewInteraction,
  onDeleteInteraction,
  isLoading,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    interactions.forEach((item) => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((t) => tagSet.add(t));
      }
    });
    return Array.from(tagSet);
  }, [interactions]);

  // Filtered interactions
  const filteredInteractions = useMemo(() => {
    return interactions.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.summary && item.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag = !selectedTag || (item.tags && item.tags.includes(selectedTag));

      return matchesSearch && matchesTag;
    });
  }, [interactions, searchQuery, selectedTag]);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getModeBadge = (mode: ReflectionMode) => {
    switch (mode) {
      case 'brainstorm':
        return { label: 'Brainstorm', color: 'bg-sky-950/80 text-sky-300 border border-sky-800/60' };
      case 'reframe':
        return { label: 'Reframe', color: 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60' };
      case 'gratitude':
        return { label: 'Gratitude', color: 'bg-rose-950/80 text-rose-300 border border-rose-800/60' };
      case 'summary':
        return { label: 'Summary', color: 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' };
      default:
        return { label: 'Reflect', color: 'bg-slate-800/80 text-slate-300 border border-slate-700/60' };
    }
  };

  return (
    <aside
      id="journal-history-sidebar"
      className="w-full lg:w-80 shrink-0 flex flex-col h-full bg-slate-900/90 border-r border-slate-800 select-none backdrop-blur-md"
    >
      {/* Top Header & New Button */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <h2 className="font-semibold text-sm text-slate-100 tracking-tight">Journal History</h2>
            <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700/60">
              {interactions.length}
            </span>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-200"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          id="sidebar-new-entry-btn"
          onClick={() => {
            onNewInteraction();
            onCloseMobile?.();
          }}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 active:scale-[0.99] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Journal Reflection</span>
        </button>

        {/* Search bar */}
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="history-search-input"
            type="text"
            placeholder="Search entries, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px]">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2 py-0.5 rounded-md font-medium shrink-0 transition-colors ${
                selectedTag === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2 py-0.5 rounded-md font-medium shrink-0 flex items-center gap-1 transition-colors ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Interactions List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading && interactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <div className="w-5 h-5 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
            <span>Loading entries from Firestore...</span>
          </div>
        ) : filteredInteractions.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-400">
            <BookOpen className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-xs font-medium text-slate-300">No reflections found</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {searchQuery ? 'Try a different search query' : 'Start your first journal entry above'}
            </p>
          </div>
        ) : (
          filteredInteractions.map((item) => {
            const isActive = activeInteractionId === item.id;
            const badge = getModeBadge(item.mode);

            return (
              <div
                key={item.id}
                id={`journal-item-${item.id}`}
                onClick={() => {
                  onSelectInteraction(item.id);
                  onCloseMobile?.();
                }}
                className={`group relative flex flex-col p-3 rounded-xl cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-slate-800/90 border-indigo-500/50 shadow-sm shadow-indigo-500/10'
                    : 'bg-slate-900/40 hover:bg-slate-800/50 border-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-xs text-slate-100 line-clamp-1 flex-1">
                    {item.title || 'Untitled Reflection'}
                  </span>

                  <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                    {formatDate(item.updatedAt || item.createdAt)}
                  </span>
                </div>

                {item.summary ? (
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-normal font-sans">
                    {item.summary}
                  </p>
                ) : item.messages.length > 0 ? (
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-1 font-sans">
                    {item.messages[0].content}
                  </p>
                ) : null}

                <div className="flex items-center justify-between gap-2 mt-2 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.sector && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-700">
                        {getSectorById(item.sector).emoji} {getSectorById(item.sector).label.split(' ')[0]}
                      </span>
                    )}
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {item.messages.length} msg{item.messages.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <button
                    id={`delete-entry-${item.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDeleteInteraction(item.id, e);
                    }}
                    className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 rounded-lg transition-all cursor-pointer"
                    title="Delete reflection"
                    aria-label="Delete reflection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Footer Details */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1 font-mono">
          <Layers className="w-3 h-3 text-indigo-400" /> Firestore Synced
        </span>
        <span className="text-slate-500">Real-time Listener</span>
      </div>
    </aside>
  );
};
