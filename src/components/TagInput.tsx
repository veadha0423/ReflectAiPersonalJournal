import React, { useState } from 'react';
import { Tag, Sparkles, X, Plus } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  journalText?: string;
  sector?: string;
  disabled?: boolean;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  journalText = '',
  sector = '',
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().replace(/^#/, '');
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      handleRemoveTag(tags[tags.length - 1]);
    }
  };

  const handleAutoSuggestTags = async () => {
    if (!journalText.trim() && !sector) return;
    setIsSuggesting(true);
    try {
      const res = await fetch('/api/gemini/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: journalText,
          sector,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tags)) {
          const merged = Array.from(new Set([...tags, ...data.tags]));
          onChange(merged);
        }
      }
    } catch (err) {
      console.warn('Failed to auto-suggest tags:', err);
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div id="tag-input-container" className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-indigo-400" />
          <span>Tags & Categorization</span>
        </label>
        
        {journalText.trim().length > 10 && (
          <button
            id="tag-auto-suggest-btn"
            type="button"
            onClick={handleAutoSuggestTags}
            disabled={isSuggesting || disabled}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Auto-extract smart tags using Gemini AI"
          >
            <Sparkles className={`w-3 h-3 ${isSuggesting ? 'animate-spin' : ''}`} />
            <span>{isSuggesting ? 'Analyzing...' : 'AI Auto-Tag'}</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-950/70 border border-slate-800/80 rounded-xl min-h-[38px] focus-within:border-indigo-500/60 transition-colors">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-950/80 border border-indigo-800/70 text-indigo-300 text-xs font-medium"
          >
            <span>#{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="text-indigo-400 hover:text-rose-400 transition-colors cursor-pointer"
                title={`Remove ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}

        {!disabled && (
          <div className="flex items-center gap-1 flex-1 min-w-[120px]">
            <input
              id="tag-text-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={tags.length === 0 ? "Add tags (e.g. #deepwork, #running)..." : "Add another tag..."}
              className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
            />
            {inputValue.trim() && (
              <button
                type="button"
                onClick={() => handleAddTag(inputValue)}
                className="p-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                title="Add tag"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
