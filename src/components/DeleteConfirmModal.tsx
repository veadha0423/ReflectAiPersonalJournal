import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { getSectorById } from '../lib/sectors';
import type { JournalInteraction } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  entry: JournalInteraction | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  entry,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !entry) return null;

  const sectorObj = entry.sector ? getSectorById(entry.sector) : null;

  return (
    <AnimatePresence>
      <div
        id="delete-confirmation-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isDeleting ? onCancel : undefined}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 z-10 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header with warning icon */}
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/60 text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="font-semibold text-base text-slate-100">
                Delete Reflection Entry?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This action cannot be undone. It will permanently remove this journal entry and its conversation history from your database.
              </p>
            </div>
          </div>

          {/* Entry Preview box */}
          <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {sectorObj && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  {sectorObj.emoji} {sectorObj.label}
                </span>
              )}
              <span className="font-semibold text-xs text-slate-200 truncate max-w-[220px]">
                {entry.title || 'Untitled Reflection'}
              </span>
            </div>

            {entry.summary ? (
              <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                "{entry.summary}"
              </p>
            ) : entry.messages.length > 0 ? (
              <p className="text-[11px] text-slate-500 line-clamp-1">
                {entry.messages[0].content}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Empty entry ({entry.messages.length} messages)
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80">
            <button
              id="cancel-delete-btn"
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              id="confirm-delete-btn"
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Entry</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
