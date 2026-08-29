import { JournalInteraction, SearchFilterState, CustomCategory } from '../types';

export function applyJournalFilters(
  interactions: JournalInteraction[],
  filterState: SearchFilterState,
  customCategories: CustomCategory[] = []
): JournalInteraction[] {
  const filtered = interactions.filter((item) => {
    // 1. Text Search Query across title, summary, messages, tags, location, context & insights
    if (filterState.searchQuery.trim()) {
      const q = filterState.searchQuery.toLowerCase();
      const matchesTitle = item.title?.toLowerCase().includes(q);
      const matchesSummary = item.summary?.toLowerCase().includes(q);
      const matchesPlace =
        item.location?.placeName?.toLowerCase().includes(q) ||
        item.contextData?.location?.placeName?.toLowerCase().includes(q);
      const matchesSentiment = item.sentimentTone?.toLowerCase().includes(q);
      const matchesTags = item.tags?.some((t) => t.toLowerCase().includes(q));
      const matchesMessages = item.messages?.some((m) => m.content?.toLowerCase().includes(q));
      const matchesKeyInsights = item.keyInsights?.some((ki) => ki.toLowerCase().includes(q));
      const matchesHealth =
        item.contextData?.health?.workoutType?.toLowerCase().includes(q) ||
        item.contextData?.health?.notes?.toLowerCase().includes(q);
      const matchesCalendar = item.contextData?.calendarEvents?.some(
        (ev) => ev.title?.toLowerCase().includes(q) || ev.location?.toLowerCase().includes(q)
      );
      const matchesWeather = item.contextData?.weather?.condition?.toLowerCase().includes(q);

      if (
        !matchesTitle &&
        !matchesSummary &&
        !matchesPlace &&
        !matchesSentiment &&
        !matchesTags &&
        !matchesMessages &&
        !matchesKeyInsights &&
        !matchesHealth &&
        !matchesCalendar &&
        !matchesWeather
      ) {
        return false;
      }
    }

    // 2. Date Preset / Custom Range
    const itemDate = new Date(item.createdAt || item.updatedAt);
    const now = new Date();

    if (filterState.datePreset === 'today') {
      const isToday =
        itemDate.getDate() === now.getDate() &&
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getFullYear() === now.getFullYear();
      if (!isToday) return false;
    } else if (filterState.datePreset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        itemDate.getDate() === yesterday.getDate() &&
        itemDate.getMonth() === yesterday.getMonth() &&
        itemDate.getFullYear() === yesterday.getFullYear();
      if (!isYesterday) return false;
    } else if (filterState.datePreset === 'this_week') {
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      if (itemDate < oneWeekAgo) return false;
    } else if (filterState.datePreset === 'this_month') {
      const isThisMonth =
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getFullYear() === now.getFullYear();
      if (!isThisMonth) return false;
    } else if (filterState.datePreset === 'custom') {
      if (filterState.customStartDate) {
        const start = new Date(filterState.customStartDate);
        start.setHours(0, 0, 0, 0);
        if (itemDate < start) return false;
      }
      if (filterState.customEndDate) {
        const end = new Date(filterState.customEndDate);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }
    }

    // 3. Sector and Custom Categories
    if (filterState.selectedSectors.length > 0) {
      const itemCategoryKey = item.customCategoryId || item.sector;
      if (!filterState.selectedSectors.includes(itemCategoryKey as string)) {
        return false;
      }
    }

    // 4. Tags
    if (filterState.selectedTags.length > 0) {
      if (!item.tags || item.tags.length === 0) return false;
      const normalizedItemTags = item.tags.map((t) => t.trim().toLowerCase().replace(/^#/, ''));
      const hasAllSelectedTags = filterState.selectedTags.every((st) =>
        normalizedItemTags.includes(st.trim().toLowerCase().replace(/^#/, ''))
      );
      if (!hasAllSelectedTags) return false;
    }

    // 5. Location
    if (filterState.selectedLocation) {
      const itemLoc = item.location?.placeName || item.contextData?.location?.placeName;
      if (!itemLoc || !itemLoc.toLowerCase().includes(filterState.selectedLocation.toLowerCase())) {
        return false;
      }
    }

    // 6. Media Type Filter
    const hasPhotos =
      item.attachments?.some((a) => a.type === 'image') ||
      item.messages?.some((m) => m.attachments?.some((a) => a.type === 'image'));
    const hasVideos =
      item.attachments?.some((a) => a.type === 'video') ||
      item.messages?.some((m) => m.attachments?.some((a) => a.type === 'video'));
    const hasContext = !!(
      item.contextData &&
      (item.contextData.weather ||
        item.contextData.health ||
        (item.contextData.calendarEvents && item.contextData.calendarEvents.length > 0) ||
        item.contextData.location)
    );

    if (filterState.mediaType === 'with_photos' && !hasPhotos) return false;
    if (filterState.mediaType === 'with_videos' && !hasVideos) return false;
    if (filterState.mediaType === 'with_context' && !hasContext) return false;
    if (filterState.mediaType === 'text_only' && (hasPhotos || hasVideos)) return false;

    // 7. Mood Score Filter
    if (filterState.minMood !== null && filterState.minMood !== undefined) {
      if (item.moodScore === undefined || item.moodScore < filterState.minMood) {
        return false;
      }
    }

    return true;
  });

  // Sort results
  return [...filtered].sort((a, b) => {
    if (filterState.sortBy === 'newest') {
      return new Date(b.createdAt || b.updatedAt).getTime() - new Date(a.createdAt || a.updatedAt).getTime();
    }
    if (filterState.sortBy === 'oldest') {
      return new Date(a.createdAt || a.updatedAt).getTime() - new Date(b.createdAt || b.updatedAt).getTime();
    }
    if (filterState.sortBy === 'highest_mood') {
      return (b.moodScore || 0) - (a.moodScore || 0);
    }
    if (filterState.sortBy === 'lowest_mood') {
      return (a.moodScore || 0) - (b.moodScore || 0);
    }
    return 0;
  });
}
