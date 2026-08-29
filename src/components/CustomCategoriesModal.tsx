import React, { useState } from 'react';
import {
  FolderPlus,
  Tag,
  Trash2,
  X,
  Plus,
  Check,
  Sparkles,
  Layers,
} from 'lucide-react';
import { CustomCategory } from '../types';
import { CATEGORY_COLORS } from '../lib/sectors';

interface CustomCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  customCategories: CustomCategory[];
  onSaveCategory: (category: CustomCategory) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onSelectCategory?: (categoryId: string) => void;
}

const COLOR_OPTIONS = [
  { id: 'indigo', label: 'Indigo', class: 'bg-indigo-600' },
  { id: 'emerald', label: 'Emerald', class: 'bg-emerald-600' },
  { id: 'amber', label: 'Amber', class: 'bg-amber-600' },
  { id: 'rose', label: 'Rose', class: 'bg-rose-600' },
  { id: 'violet', label: 'Violet', class: 'bg-violet-600' },
  { id: 'purple', label: 'Purple', class: 'bg-purple-600' },
  { id: 'fuchsia', label: 'Fuchsia', class: 'bg-fuchsia-600' },
  { id: 'teal', label: 'Teal', class: 'bg-teal-600' },
  { id: 'cyan', label: 'Cyan', class: 'bg-cyan-600' },
  { id: 'sky', label: 'Sky', class: 'bg-sky-600' },
  { id: 'orange', label: 'Orange', class: 'bg-orange-600' },
  { id: 'lime', label: 'Lime', class: 'bg-lime-600' },
];

const POPULAR_EMOJIS = ['🚀', '💡', '🍳', '🎸', '🌱', '📖', '💻', '👶', '🚴', '☕', '🎯', '🐾', '🧘', '🏖️', '🎬', '🏆', '🌿', '🎨'];

export const CustomCategoriesModal: React.FC<CustomCategoriesModalProps> = ({
  isOpen,
  onClose,
  userId,
  customCategories,
  onSaveCategory,
  onDeleteCategory,
  onSelectCategory,
}) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💡');
  const [color, setColor] = useState('indigo');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const newCat: CustomCategory = {
        id: `custom_${Date.now()}_${name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        userId,
        name: name.trim(),
        emoji: emoji || '🏷️',
        color,
        description: description.trim(),
        createdAt: new Date().toISOString(),
      };
      await onSaveCategory(newCat);
      setName('');
      setDescription('');
      if (onSelectCategory) {
        onSelectCategory(newCat.id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save custom category.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (catId: string) => {
    try {
      await onDeleteCategory(catId);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete category.');
    }
  };

  return (
    <div
      id="custom-categories-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="custom-categories-modal-card"
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Custom Journal Categories</h2>
              <p className="text-xs text-slate-400">
                Organize your life into tailored domains beyond standard sectors
              </p>
            </div>
          </div>
          <button
            id="close-custom-categories-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Form to Create New Category */}
          <form onSubmit={handleCreateCategory} className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-3.5">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Create New Category</span>
            </h3>

            {/* Name and Emoji Input */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="w-12 h-10 text-center text-lg bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                  maxLength={3}
                />
              </div>
              <input
                id="new-category-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category Name (e.g. Side Hustle, Parenting, Cooking)..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Quick Emoji Picker */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] text-slate-400 mr-1">Suggested:</span>
              {POPULAR_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                    emoji === e ? 'bg-indigo-600/30 border border-indigo-500' : 'bg-slate-900 border border-slate-800/80 hover:bg-slate-800'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            {/* Color Palette */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Color Accent</label>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`w-6 h-6 rounded-full ${c.class} transition-all cursor-pointer flex items-center justify-center ${
                      color === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    title={c.label}
                  >
                    {color === c.id && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description (e.g., Milestones, ideas, and sprint updates)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              id="save-new-category-btn"
              type="submit"
              disabled={isSaving || !name.trim()}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Creating...' : 'Create Category'}
            </button>
          </form>

          {/* Existing Custom Categories List */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Your Custom Categories ({customCategories.length})
            </h3>

            {customCategories.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
                No custom categories yet. Create your first custom category above to organize your journals!
              </div>
            ) : (
              <div className="space-y-2">
                {customCategories.map((cat) => {
                  const theme = CATEGORY_COLORS[cat.color] || CATEGORY_COLORS.indigo;
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{cat.emoji}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-100">{cat.name}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${theme.pillBg}`}>
                              {cat.color}
                            </span>
                          </div>
                          {cat.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{cat.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onSelectCategory && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCategory(cat.id);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold cursor-pointer"
                          >
                            Select
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
