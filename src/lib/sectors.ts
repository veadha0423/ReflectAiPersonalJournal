import { LifeSector, SectorDefinition, CustomCategory } from '../types';

export const CATEGORY_COLORS: Record<string, {
  bg: string;
  border: string;
  text: string;
  pillBg: string;
  gradient: string;
}> = {
  emerald: {
    bg: 'bg-emerald-950/70',
    border: 'border-emerald-700/60',
    text: 'text-emerald-300',
    pillBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-800/80',
    gradient: 'from-emerald-600 to-teal-700',
  },
  blue: {
    bg: 'bg-blue-950/70',
    border: 'border-blue-700/60',
    text: 'text-blue-300',
    pillBg: 'bg-blue-950/90 text-blue-300 border-blue-800/80',
    gradient: 'from-blue-600 to-indigo-700',
  },
  indigo: {
    bg: 'bg-indigo-950/70',
    border: 'border-indigo-700/60',
    text: 'text-indigo-300',
    pillBg: 'bg-indigo-950/90 text-indigo-300 border-indigo-800/80',
    gradient: 'from-indigo-600 to-blue-700',
  },
  violet: {
    bg: 'bg-violet-950/70',
    border: 'border-violet-700/60',
    text: 'text-violet-300',
    pillBg: 'bg-violet-950/90 text-violet-300 border-violet-800/80',
    gradient: 'from-violet-600 to-purple-700',
  },
  purple: {
    bg: 'bg-purple-950/70',
    border: 'border-purple-700/60',
    text: 'text-purple-300',
    pillBg: 'bg-purple-950/90 text-purple-300 border-purple-800/80',
    gradient: 'from-purple-600 to-pink-700',
  },
  fuchsia: {
    bg: 'bg-fuchsia-950/70',
    border: 'border-fuchsia-700/60',
    text: 'text-fuchsia-300',
    pillBg: 'bg-fuchsia-950/90 text-fuchsia-300 border-fuchsia-800/80',
    gradient: 'from-fuchsia-600 to-pink-700',
  },
  rose: {
    bg: 'bg-rose-950/70',
    border: 'border-rose-700/60',
    text: 'text-rose-300',
    pillBg: 'bg-rose-950/90 text-rose-300 border-rose-800/80',
    gradient: 'from-rose-600 to-pink-700',
  },
  amber: {
    bg: 'bg-amber-950/70',
    border: 'border-amber-700/60',
    text: 'text-amber-300',
    pillBg: 'bg-amber-950/90 text-amber-300 border-amber-800/80',
    gradient: 'from-amber-600 to-yellow-700',
  },
  orange: {
    bg: 'bg-orange-950/70',
    border: 'border-orange-700/60',
    text: 'text-orange-300',
    pillBg: 'bg-orange-950/90 text-orange-300 border-orange-800/80',
    gradient: 'from-orange-600 to-amber-700',
  },
  teal: {
    bg: 'bg-teal-950/70',
    border: 'border-teal-700/60',
    text: 'text-teal-300',
    pillBg: 'bg-teal-950/90 text-teal-300 border-teal-800/80',
    gradient: 'from-teal-600 to-emerald-700',
  },
  cyan: {
    bg: 'bg-cyan-950/70',
    border: 'border-cyan-700/60',
    text: 'text-cyan-300',
    pillBg: 'bg-cyan-950/90 text-cyan-300 border-cyan-800/80',
    gradient: 'from-cyan-600 to-sky-700',
  },
  sky: {
    bg: 'bg-sky-950/70',
    border: 'border-sky-700/60',
    text: 'text-sky-300',
    pillBg: 'bg-sky-950/90 text-sky-300 border-sky-800/80',
    gradient: 'from-sky-600 to-blue-700',
  },
  lime: {
    bg: 'bg-lime-950/70',
    border: 'border-lime-700/60',
    text: 'text-lime-300',
    pillBg: 'bg-lime-950/90 text-lime-300 border-lime-800/80',
    gradient: 'from-lime-600 to-emerald-700',
  },
};

export const LIFE_SECTORS: SectorDefinition[] = [
  {
    id: 'health',
    label: 'Health & Wellness',
    emoji: '🏥',
    iconName: 'Activity',
    description: 'Exercise, food, sleep, mental health, symptoms, weight, nutrition',
    keywords: ['exercise', 'workout', 'run', 'gym', 'food', 'diet', 'sleep', 'mental health', 'symptoms', 'weight', 'nutrition', 'wellness', 'doctor', 'walk', 'yoga'],
    colorTheme: CATEGORY_COLORS.emerald,
  },
  {
    id: 'career',
    label: 'Career & Professional',
    emoji: '💼',
    iconName: 'Briefcase',
    description: 'Work, promotion, skills, interview, project, leadership, clients',
    keywords: ['work', 'job', 'promotion', 'career', 'skills', 'interview', 'project', 'leadership', 'clients', 'meeting', 'office', 'colleague', 'boss', 'presentation'],
    colorTheme: CATEGORY_COLORS.blue,
  },
  {
    id: 'finance',
    label: 'Finance',
    emoji: '💰',
    iconName: 'DollarSign',
    description: 'Income, savings, investment, budget, debt, goals, expenses',
    keywords: ['money', 'income', 'savings', 'investment', 'budget', 'debt', 'goals', 'expenses', 'salary', 'stocks', 'crypto', 'bills', 'purchase', 'crypto', 'funds'],
    colorTheme: CATEGORY_COLORS.amber,
  },
  {
    id: 'relationships',
    label: 'Relationships',
    emoji: '❤️',
    iconName: 'Heart',
    description: 'Family, friends, partner, communication, marriage, parenting',
    keywords: ['family', 'friends', 'partner', 'boyfriend', 'girlfriend', 'husband', 'wife', 'communication', 'marriage', 'parenting', 'love', 'date', 'mom', 'dad', 'kids'],
    colorTheme: CATEGORY_COLORS.rose,
  },
  {
    id: 'growth',
    label: 'Personal Growth',
    emoji: '📚',
    iconName: 'GraduationCap',
    description: 'Learning, reading, courses, habits, goals, achievements',
    keywords: ['learning', 'reading', 'book', 'courses', 'habits', 'goals', 'achievements', 'study', 'mindset', 'discipline', 'reflection', 'skill'],
    colorTheme: CATEGORY_COLORS.violet,
  },
  {
    id: 'creative',
    label: 'Creative',
    emoji: '🎨',
    iconName: 'Palette',
    description: 'Art, music, writing, photography, design, inspiration',
    keywords: ['art', 'music', 'writing', 'photography', 'design', 'inspiration', 'poem', 'sketch', 'creative', 'novel', 'craft', 'idea', 'video editing'],
    colorTheme: CATEGORY_COLORS.fuchsia,
  },
  {
    id: 'travel',
    label: 'Travel & Adventure',
    emoji: '🌍',
    iconName: 'Plane',
    description: 'Trips, exploration, new places, experiences, culture',
    keywords: ['trip', 'travel', 'flight', 'exploration', 'new places', 'experiences', 'culture', 'vacation', 'hiking', 'nature', 'road trip', 'hotel', 'city'],
    colorTheme: CATEGORY_COLORS.cyan,
  },
  {
    id: 'spiritual',
    label: 'Spiritual',
    emoji: '🧘',
    iconName: 'Sun',
    description: 'Meditation, mindfulness, gratitude, purpose, faith',
    keywords: ['meditation', 'mindfulness', 'gratitude', 'purpose', 'faith', 'prayer', 'soul', 'peace', 'zen', 'inner peace', 'universe', 'values'],
    colorTheme: CATEGORY_COLORS.teal,
  },
  {
    id: 'home',
    label: 'Home & Lifestyle',
    emoji: '🏠',
    iconName: 'Home',
    description: 'Living space, decoration, routines, pets, neighborhood',
    keywords: ['home', 'apartment', 'house', 'living space', 'decoration', 'routines', 'pets', 'dog', 'cat', 'neighborhood', 'cooking', 'cleaning', 'garden'],
    colorTheme: CATEGORY_COLORS.orange,
  },
  {
    id: 'leisure',
    label: 'Leisure & Fun',
    emoji: '🎮',
    iconName: 'Gamepad2',
    description: 'Hobbies, gaming, entertainment, sports, social events',
    keywords: ['hobbies', 'gaming', 'entertainment', 'sports', 'social events', 'game', 'party', 'concert', 'movie', 'show', 'relax', 'fun', 'weekend'],
    colorTheme: CATEGORY_COLORS.indigo,
  },
];

export function getSectorById(sectorId?: string, customCategories?: CustomCategory[]): SectorDefinition {
  if (!sectorId) return LIFE_SECTORS[0];

  // 1. Check built-in sectors
  const builtIn = LIFE_SECTORS.find((s) => s.id === sectorId);
  if (builtIn) return builtIn;

  // 2. Check custom categories
  if (customCategories && customCategories.length > 0) {
    const custom = customCategories.find((c) => c.id === sectorId || c.name.toLowerCase() === sectorId.toLowerCase());
    if (custom) {
      const theme = CATEGORY_COLORS[custom.color] || CATEGORY_COLORS.indigo;
      return {
        id: custom.id,
        label: custom.name,
        emoji: custom.emoji,
        iconName: 'Tag',
        description: custom.description || 'Custom user category',
        keywords: [custom.name.toLowerCase()],
        isCustom: true,
        colorTheme: theme,
      };
    }
  }

  // Fallback
  return {
    id: sectorId,
    label: sectorId.charAt(0).toUpperCase() + sectorId.slice(1),
    emoji: '🏷️',
    iconName: 'Tag',
    description: 'Custom category',
    keywords: [sectorId.toLowerCase()],
    isCustom: true,
    colorTheme: CATEGORY_COLORS.indigo,
  };
}

export function getAllCombinedSectors(customCategories: CustomCategory[] = []): SectorDefinition[] {
  const customDefs: SectorDefinition[] = customCategories.map((custom) => ({
    id: custom.id,
    label: custom.name,
    emoji: custom.emoji,
    iconName: 'Tag',
    description: custom.description || 'Custom user category',
    keywords: [custom.name.toLowerCase()],
    isCustom: true,
    colorTheme: CATEGORY_COLORS[custom.color] || CATEGORY_COLORS.indigo,
  }));

  return [...LIFE_SECTORS, ...customDefs];
}

/**
 * Fast client-side keyword heuristic classifier when offline or prior to Gemini categorization
 */
export function classifyTextSectorHeuristic(text: string, customCategories?: CustomCategory[]): LifeSector {
  const lower = text.toLowerCase();
  const allSectors = getAllCombinedSectors(customCategories || []);
  let bestSector: LifeSector = 'health';
  let maxScore = 0;

  for (const sector of allSectors) {
    let score = 0;
    for (const kw of sector.keywords) {
      if (lower.includes(kw)) {
        score += 1;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestSector = sector.id;
    }
  }

  return bestSector;
}
