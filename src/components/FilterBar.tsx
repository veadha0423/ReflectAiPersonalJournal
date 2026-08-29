import React, { useState } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Tag,
  MapPin,
  Image as ImageIcon,
  Smile,
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  CloudSun,
  Layers,
} from 'lucide-react';
import { SearchFilterState, CustomCategory, JournalInteraction } from '../types';
import { getAllCombinedSectors } from '../lib/sectors';

interface FilterBarProps {
  filterState: SearchFilterState;
  onFilterChange: (newState: SearchFilterState) => void;
  interactions: JournalInteraction[];
  customCategories: CustomCategory[];
  onOpenCustomCategories: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filterState,
  onFilterChange,
  interactions,
  customCategories,
  onOpenCustomCategories,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract all unique tags with frequencies
  const tagCounts: Record<string, number> = {};
  const locationsSet = new Set<string>();

  interactions.forEach((item) => {
    if (Array.isArray(item.tags)) {
      item.tags.forEach((tag) => {
        const clean = tag.trim().replace(/^#/, '');
        if (clean) tagCounts[clean] = (tagCounts[clean] || 0) + 1;
      });
    }
    if (item.location?.placeName) {
      locationsSet.add(item.location.placeName);
    }
  });

  const allTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
  const allLocations = Array.from(locationsSet).sort();
  const allSectors = getAllCombinedSectors(customCategories);

  // Check how many active filters are applied
  let activeFilterCount = 0;
  if (filterState.searchQuery.trim()) activeFilterCount++;
  if (filterState.datePreset !== 'all') activeFilterCount++;
  if (filterState.selectedSectors.length > 0) activeFilterCount += filterState.selectedSectors.length;
  if (filterState.selectedTags.length > 0) activeFilterCount += filterState.selectedTags.length;
  if (filterState.selectedLocation) activeFilterCount++;
  if (filterState.mediaType !== 'all') activeFilterCount++;
  if (filterState.minMood !== null && filterState.minMood !== undefined) activeFilterCount++;

  const handleResetFilters = () => {
    onFilterChange({
      searchQuery: '',
      datePreset: 'all',
      customStartDate: undefined,
      customEndDate: undefined,
      selectedSectors: [],
      selectedTags: [],
      selectedLocation: undefined,
      mediaType: 'all',
      minMood: null,
      sortBy: 'newest',
    });
  };

  const handleToggleSector = (sectorId: string) => {
    const current = filterState.selectedSectors;
    if (current.includes(sectorId)) {
      onFilterChange({ ...filterState, selectedSectors: current.filter((s) => s !== sectorId) });
    } else {
      onFilterChange({ ...filterState, selectedSectors: [...current, sectorId] });
    }
  };

  const handleToggleTag = (tag: string) => {
    const current = filterState.selectedTags;
    if (current.includes(tag)) {
      onFilterChange({ ...filterState, selectedTags: current.filter((t) => t !== tag) });
    } else {
      onFilterChange({ ...filterState, selectedTags: [...current, tag] });
    }
  };

  return (
    <div id="advanced-filter-bar-container" className="space-y-3">
      {/* Search Input and Primary Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="journal-search-input"
            type="text"
            value={filterState.searchQuery}
            onChange={(e) => onFilterChange({ ...filterState, searchQuery: e.target.value })}
            placeholder="Search entries, keywords, thoughts, locations, insights..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9.5 pr-8 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-inner transition-all"
          />
          {filterState.searchQuery && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filterState, searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Toggle & Sort Dropdown */}
        <div className="flex items-center gap-2">
          <button
            id="toggle-filter-panel-btn"
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              activeFilterCount > 0 || isExpanded
                ? 'bg-indigo-950/80 border-indigo-600/60 text-indigo-300 shadow-xs'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          {/* Sort selector */}
          <select
            id="journal-sort-select"
            value={filterState.sortBy}
            onChange={(e) => onFilterChange({ ...filterState, sortBy: e.target.value as any })}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest_mood">Highest Mood</option>
            <option value="lowest_mood">Lowest Mood</option>
          </select>

          {activeFilterCount > 0 && (
            <button
              id="clear-all-filters-btn"
              type="button"
              onClick={handleResetFilters}
              className="p-2.5 rounded-xl border border-rose-900/60 bg-rose-950/40 text-rose-300 hover:bg-rose-950/70 text-xs flex items-center gap-1 transition-all cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Date presets row */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-slate-500" />
          <span>Date:</span>
        </span>
        {[
          { id: 'all', label: 'All Time' },
          { id: 'today', label: 'Today' },
          { id: 'yesterday', label: 'Yesterday' },
          { id: 'this_week', label: 'This Week' },
          { id: 'this_month', label: 'This Month' },
          { id: 'custom', label: 'Custom Range' },
        ].map((preset) => {
          const isSelected = filterState.datePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onFilterChange({ ...filterState, datePreset: preset.id as any })}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {preset.label}
            </button>
          );
        })}

        {filterState.datePreset === 'custom' && (
          <div className="flex items-center gap-1.5 ml-2">
            <input
              type="date"
              value={filterState.customStartDate || ''}
              onChange={(e) => onFilterChange({ ...filterState, customStartDate: e.target.value })}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={filterState.customEndDate || ''}
              onChange={(e) => onFilterChange({ ...filterState, customEndDate: e.target.value })}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="p-4 bg-slate-900/95 border border-slate-800 rounded-2xl space-y-4 shadow-xl animate-in slide-in-from-top-2 duration-150">
          {/* Categories & Sectors Multi-Select */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Life Sectors & Custom Categories</span>
              </label>
              <button
                type="button"
                onClick={onOpenCustomCategories}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>+ Manage Custom Categories</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {allSectors.map((sector) => {
                const isSelected = filterState.selectedSectors.includes(sector.id);
                return (
                  <button
                    key={sector.id}
                    type="button"
                    onClick={() => handleToggleSector(sector.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? `${sector.colorTheme.pillBg} border-current ring-1 ring-current shadow-xs`
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                    }`}
                  >
                    <span>{sector.emoji}</span>
                    <span>{sector.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags Cloud Multi-Select */}
          {allTags.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                <span>Smart Categorical Tags ({allTags.length})</span>
              </label>
              <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto">
                {allTags.map((tag) => {
                  const isSelected = filterState.selectedTags.includes(tag);
                  const count = tagCounts[tag];
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                          : 'bg-slate-950/70 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span>#{tag}</span>
                      <span className={`text-[10px] px-1 rounded-full ${isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Location & Media & Mood Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-800/60">
            {/* Location Selector */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1.5">
                <MapPin className="w-3 h-3 text-cyan-400" />
                <span>Location Filter</span>
              </label>
              <select
                value={filterState.selectedLocation || ''}
                onChange={(e) => onFilterChange({ ...filterState, selectedLocation: e.target.value || undefined })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Locations</option>
                {allLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    📍 {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Media Type Filter */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1.5">
                <ImageIcon className="w-3 h-3 text-fuchsia-400" />
                <span>Media & Context Type</span>
              </label>
              <select
                value={filterState.mediaType}
                onChange={(e) => onFilterChange({ ...filterState, mediaType: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Entries</option>
                <option value="with_photos">📷 With Photos</option>
                <option value="with_videos">🎥 With Videos</option>
                <option value="with_context">🌤️ With Health/Weather Context</option>
                <option value="text_only">📝 Text Only</option>
              </select>
            </div>

            {/* Min Mood Score */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Smile className="w-3 h-3 text-amber-400" />
                  <span>Min Mood Rating</span>
                </label>
                <span className="text-xs font-bold text-amber-400">
                  {filterState.minMood !== null && filterState.minMood !== undefined ? `${filterState.minMood.toFixed(1)}/10` : 'Any'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={filterState.minMood ?? 1}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onFilterChange({ ...filterState, minMood: val === 1 ? null : val });
                }}
                className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
