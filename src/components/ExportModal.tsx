import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText, Share2 } from 'lucide-react';
import type { JournalInteraction } from '../types';

interface ExportModalProps {
  interaction: JournalInteraction;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  interaction,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateMarkdown = () => {
    let md = `# ${interaction.title || 'Journal Reflection'}\n`;
    md += `*Date: ${new Date(interaction.createdAt).toLocaleString()}*\n`;
    md += `*Mode: ${interaction.mode.toUpperCase()}*\n\n`;

    if (interaction.summary) {
      md += `## Summary\n${interaction.summary}\n\n`;
    }

    if (interaction.keyInsights && interaction.keyInsights.length > 0) {
      md += `## Key Insights\n`;
      interaction.keyInsights.forEach((insight) => {
        md += `- ${insight}\n`;
      });
      md += `\n`;
    }

    if (interaction.tags && interaction.tags.length > 0) {
      md += `**Tags**: ${interaction.tags.map((t) => `#${t}`).join(' ')}\n\n`;
    }

    md += `## Conversation & Journal Entries\n\n`;
    interaction.messages.forEach((msg) => {
      const speaker = msg.role === 'user' ? '👤 My Journal Entry' : '✨ Gemini Reflection';
      md += `### ${speaker} (${new Date(msg.timestamp).toLocaleTimeString()})\n\n${msg.content}\n\n---\n\n`;
    });

    return md;
  };

  const handleCopy = async () => {
    const text = generateMarkdown();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = generateMarkdown();
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = (interaction.title || 'reflection')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `${safeTitle}-${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div
        id="export-modal-card"
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-sm text-slate-100">
              Export Reflection Entry
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview Content */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
          {generateMarkdown()}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">Standard Markdown (.md)</span>

          <div className="flex items-center gap-2">
            <button
              id="export-copy-btn"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            <button
              id="export-download-btn"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-semibold transition-colors shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
