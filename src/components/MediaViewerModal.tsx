import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Download, Video, Image as ImageIcon } from 'lucide-react';
import type { MediaAttachment } from '../types';

interface MediaViewerModalProps {
  media: MediaAttachment | null;
  entryTitle?: string;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  media,
  entryTitle,
  onClose,
}) => {
  if (!media) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-2 min-w-0">
              {media.type === 'image' ? (
                <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Video className="w-4 h-4 text-sky-400 shrink-0" />
              )}
              <h4 className="text-xs font-semibold text-slate-200 truncate">
                {media.fileName || entryTitle || 'Media Attachment'}
              </h4>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Media Player / Image */}
          <div className="flex-1 bg-black/80 flex items-center justify-center p-2 min-h-[300px] overflow-auto">
            {media.type === 'image' ? (
              <img
                src={media.dataUrl}
                alt={media.fileName}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
                referrerPolicy="no-referrer"
              />
            ) : (
              <video
                src={media.dataUrl}
                controls
                autoPlay
                className="max-h-[60vh] max-w-full rounded-lg shadow-lg"
              />
            )}
          </div>

          {/* Gemini Vision Analysis footer if present */}
          {media.visionDescription && (
            <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gemini Vision Reflection</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">{media.visionDescription}</p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
