import React from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Briefcase,
  DollarSign,
  Heart,
  GraduationCap,
  Palette,
  Plane,
  Sun,
  Home,
  Gamepad2,
  Sparkles,
  Plus,
  Tag,
} from 'lucide-react';
import { LIFE_SECTORS, getAllCombinedSectors } from '../lib/sectors';
import type { LifeSector, JournalInteraction, CustomCategory } from '../types';

interface SectorCardsProps {
  interactions: JournalInteraction[];
  selectedSector: LifeSector | 'all';
  onSelectSector: (sector: LifeSector | 'all') => void;
  customCategories?: CustomCategory[];
  onOpenCustomCategories?: () => void;
}

export const SectorCards: React.FC<SectorCardsProps> = ({
  interactions,
  selectedSector,
  onSelectSector,
  customCategories = [],
  onOpenCustomCategories,
}) => {
  const combinedSectors = getAllCombinedSectors(customCategories);

  // Count entries per sector or custom category
  const counts = React.useMemo(() => {
    const map: Record<string, number> = {};
    combinedSectors.forEach((s) => {
      map[s.id] = 0;
    });
    interactions.forEach((item) => {
      const catKey = item.customCategoryId || item.sector;
      if (catKey && map[catKey] !== undefined) {
        map[catKey] += 1;
      } else if (item.sector && map[item.sector] !== undefined) {
        map[item.sector] += 1;
      } else {
        map['health'] = (map['health'] || 0) + 1;
      }
    });
    return map;
  }, [interactions, combinedSectors]);

  return (
    <div id="sector-cards-section" className="w-full space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <span>Life Sectors & Categories</span>
          <span className="text-[10px] text-slate-500 font-mono">({interactions.length} total entries)</span>
        </span>

        <div className="flex items-center gap-3">
          {onOpenCustomCategories && (
            <button
              id="manage-custom-categories-btn"
              onClick={onOpenCustomCategories}
              className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Custom Categories</span>
            </button>
          )}

          {selectedSector !== 'all' && (
            <button
              id="clear-sector-filter-btn"
              onClick={() => onSelectSector('all')}
              className="text-[11px] text-slate-400 hover:text-slate-200 font-medium transition-colors cursor-pointer"
            >
              Show All
            </button>
          )}
        </div>
      </div>

      {/* Horizontally scrollable / wrapped sector pills */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-1 px-1">
        {/* All Sectors Tab */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          id="sector-card-all"
          onClick={() => onSelectSector('all')}
          className={`shrink-0 flex flex-col p-3 rounded-2xl min-w-[110px] border transition-all text-left cursor-pointer shadow-sm ${
            selectedSector === 'all'
              ? 'bg-indigo-600/90 text-white border-indigo-400 shadow-indigo-600/20'
              : 'bg-slate-900/80 hover:bg-slate-800/80 text-slate-200 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-base">🌟</span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                selectedSector === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {interactions.length}
            </span>
          </div>
          <span className="text-xs font-semibold tracking-tight">All Sectors</span>
          <span
            className={`text-[10px] truncate ${
              selectedSector === 'all' ? 'text-indigo-100' : 'text-slate-500'
            }`}
          >
            Full Life View
          </span>
        </motion.button>

        {/* Combined Sectors & Custom Categories */}
        {combinedSectors.map((sector) => {
          const isSelected = selectedSector === sector.id;
          const count = counts[sector.id] || 0;

          return (
            <motion.button
              key={sector.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id={`sector-card-${sector.id}`}
              onClick={() => onSelectSector(sector.id)}
              className={`shrink-0 flex flex-col p-3 rounded-2xl min-w-[125px] border transition-all text-left cursor-pointer shadow-sm ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-500/30 shadow-indigo-600/30'
                  : `${sector.colorTheme.bg} hover:brightness-110 ${sector.colorTheme.border} text-slate-200`
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-base">{sector.emoji}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-900/80 text-slate-300 border border-slate-700/50'
                  }`}
                >
                  {count} {count === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              <span className="text-xs font-bold tracking-tight line-clamp-1">{sector.label}</span>
              <span
                className={`text-[10px] truncate ${
                  isSelected ? 'text-indigo-100' : 'text-slate-400'
                }`}
              >
                {sector.isCustom ? 'Custom Category' : sector.keywords.slice(0, 2).join(', ')}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

