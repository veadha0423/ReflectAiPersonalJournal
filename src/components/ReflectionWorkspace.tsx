import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Lightbulb,
  FileCheck2,
  RefreshCw,
  Compass,
  Heart,
  Share2,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Tag,
  Wand2,
  HelpCircle,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Image as ImageIcon,
  Video,
  MapPin,
  Smile,
  X,
} from 'lucide-react';
import { LIFE_SECTORS, getSectorById, getAllCombinedSectors } from '../lib/sectors';
import type {
  JournalInteraction,
  JournalMessage,
  ReflectionMode,
  ModeOption,
  LifeSector,
  MediaAttachment,
  JournalLocation,
  CustomCategory,
  ContextData,
  NotificationSettings,
  NotificationLog,
} from '../types';
import { ExportModal } from './ExportModal';
import { ContextManagerModal } from './ContextManagerModal';
import { CloudSun, Activity, Calendar, Zap, Sliders, Layers, Mail, MessageSquare } from 'lucide-react';

const MODE_OPTIONS: ModeOption[] = [
  {
    id: 'reflection',
    label: 'Deep Reflection',
    description: 'Empathetic listening and thoughtful inquiry to deepen self-awareness.',
    iconName: 'Compass',
    placeholder: 'Write your thoughts, feelings, or what happened today...',
    accentColor: 'amber',
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm & Ideas',
    description: 'Creative exploration, fresh perspectives, and lateral thinking.',
    iconName: 'Lightbulb',
    placeholder: 'What challenge, project, or creative idea do you want to explore?',
    accentColor: 'sky',
  },
  {
    id: 'reframe',
    label: 'Cognitive Reframe',
    description: 'Constructive reframing of self-doubt, stress, and limiting beliefs.',
    iconName: 'Wand2',
    placeholder: 'Share a frustrating situation or negative thought you want to reframe...',
    accentColor: 'indigo',
  },
  {
    id: 'gratitude',
    label: 'Gratitude & Savoring',
    description: 'Celebrate small wins, appreciation, and anchoring positive moments.',
    iconName: 'Heart',
    placeholder: 'What are you grateful for today, or what brought you unexpected joy?',
    accentColor: 'rose',
  },
  {
    id: 'summary',
    label: 'Synthesizer',
    description: 'Structured recap of key takeaways and actionable insights.',
    iconName: 'FileCheck2',
    placeholder: 'Paste notes or reflect on past days to get a structured summary...',
    accentColor: 'emerald',
  },
];

const PROMPT_SUGGESTIONS: Record<ReflectionMode, string[]> = {
  reflection: [
    'What was the most energizing moment of my day, and why?',
    'I felt tension during a conversation earlier. Help me process what triggered it.',
    'I want to untangle my thoughts regarding a difficult decision.',
  ],
  brainstorm: [
    'Help me brainstorm 5 unique angles for my upcoming presentation/project.',
    'What are unconventional ways to solve this creative block?',
    'What questions should I be asking myself that I might be overlooking?',
  ],
  reframe: [
    'I made a mistake today and keep dwelling on it. Help me see the learning.',
    'I feel overwhelmed by my current workload. How can I regain grounded calm?',
    'Help me turn this unexpected setback into an opportunity for resilience.',
  ],
  gratitude: [
    'Who is someone who made my life easier recently, and what did they do?',
    'What is a simple sensory pleasure I enjoyed today?',
    'What is a personal strength I used recently that I often take for granted?',
  ],
  summary: [
    'Synthesize our discussion into 3 actionable bullet points.',
    'What patterns in my thinking or mood have emerged here?',
    'Generate a 2-minute executive summary of this reflection session.',
  ],
};

interface ReflectionWorkspaceProps {
  interaction: JournalInteraction;
  onUpdateInteraction: (updated: JournalInteraction) => Promise<void>;
  saveStatus: 'saved' | 'saving' | 'error';
  onRetrySave: () => void;
  onDeleteSession: () => void;
  onBackToDashboard?: () => void;
  customCategories?: CustomCategory[];
  onOpenCustomCategories?: () => void;
  notificationSettings?: NotificationSettings | null;
  onLogNotificationDispatch?: (log: NotificationLog) => Promise<void>;
  onShowToast?: (toast: { type: 'success' | 'error' | 'info'; title: string; description: string }) => void;
}

export const ReflectionWorkspace: React.FC<ReflectionWorkspaceProps> = ({
  interaction,
  onUpdateInteraction,
  saveStatus,
  onRetrySave,
  onDeleteSession,
  onBackToDashboard,
  customCategories = [],
  onOpenCustomCategories,
  notificationSettings = null,
  onLogNotificationDispatch,
  onShowToast,
}) => {
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isDispatchingSlack, setIsDispatchingSlack] = useState(false);
  const [isDispatchingEmail, setIsDispatchingEmail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);

  // Chat-level media and location attachment
  const [pendingAttachments, setPendingAttachments] = useState<MediaAttachment[]>([]);
  const [pendingLocation, setPendingLocation] = useState<JournalLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interaction.messages, isGenerating]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  const currentModeConfig =
    MODE_OPTIONS.find((m) => m.id === interaction.mode) || MODE_OPTIONS[0];
  const combinedCategories = getAllCombinedSectors(customCategories);
  const activeCategoryKey = interaction.customCategoryId || interaction.sector;
  const currentCategoryConfig = combinedCategories.find((c) => c.id === activeCategoryKey) || combinedCategories[0];

  const handleTitleChange = async (newTitle: string) => {
    const updated: JournalInteraction = {
      ...interaction,
      title: newTitle,
      updatedAt: new Date().toISOString(),
    };
    await onUpdateInteraction(updated);
  };

  const handleCategorySelect = async (catKey: string) => {
    const isCustom = catKey.startsWith('custom_');
    const updated: JournalInteraction = {
      ...interaction,
      sector: isCustom ? 'growth' : (catKey as LifeSector),
      customCategoryId: isCustom ? catKey : undefined,
      updatedAt: new Date().toISOString(),
    };
    await onUpdateInteraction(updated);
  };

  const handleModeChange = async (mode: ReflectionMode) => {
    const updated: JournalInteraction = {
      ...interaction,
      mode,
      updatedAt: new Date().toISOString(),
    };
    await onUpdateInteraction(updated);
  };

  // Location of the moment
  const handleFetchLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let placeName = `Coordinates (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`,
            { headers: { 'User-Agent': 'ReflectAI-Journal/1.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.suburb;
            const state = data.address?.state || data.address?.country;
            if (city) {
              placeName = `${city}, ${state || ''}`.trim().replace(/,\s*$/, '');
            }
          }
        } catch {}

        setPendingLocation({ latitude, longitude, placeName });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setPendingLocation({ placeName: 'Moment Location' });
      },
      { timeout: 8000 }
    );
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const att: MediaAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'image',
        mimeType: file.type,
        dataUrl,
        fileName: file.name,
        fileSize: file.size,
      };
      setPendingAttachments((prev) => [...prev, att]);

      // Gemini Vision background analysis
      try {
        const res = await fetch('/api/gemini/analyze-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, prompt: 'Analyze photo for journal reflection.' }),
        });
        if (res.ok) {
          const vData = await res.json();
          att.visionDescription = vData.description;
          setPendingAttachments((prev) =>
            prev.map((a) => (a.id === att.id ? { ...a, visionDescription: vData.description } : a))
          );
        }
      } catch {}
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend !== undefined ? textToSend : inputText).trim();
    if ((!content && pendingAttachments.length === 0) || isGenerating) return;

    setErrorMessage(null);
    const now = new Date().toISOString();
    const userMessage: JournalMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'user',
      content: content || `[Attached ${pendingAttachments.length} media file(s)]`,
      timestamp: now,
      mode: interaction.mode,
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
      location: pendingLocation || undefined,
    };

    // Auto-generate title if untitled
    let newTitle = interaction.title;
    if (!newTitle || newTitle === 'New Reflection Entry') {
      newTitle = content
        ? content.slice(0, 45) + (content.length > 45 ? '...' : '')
        : `${currentCategoryConfig.emoji} ${currentCategoryConfig.label} Reflection`;
    }

    const updatedMessages = [...interaction.messages, userMessage];

    // Maintain global interaction attachments list
    const combinedAttachments = [
      ...(interaction.attachments || []),
      ...pendingAttachments,
    ];

    const interimInteraction: JournalInteraction = {
      ...interaction,
      title: newTitle,
      messages: updatedMessages,
      attachments: combinedAttachments.length > 0 ? combinedAttachments : undefined,
      location: pendingLocation || interaction.location,
      updatedAt: now,
    };

    // Guaranteed Input-to-Save Completeness
    await onUpdateInteraction(interimInteraction);
    setInputText('');
    setPendingAttachments([]);
    setPendingLocation(null);
    setIsGenerating(true);

    try {
      // Call server-side Gemini API route with multimodal attachments and contextData
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          mode: interaction.mode,
          sector: currentCategoryConfig.label,
          location: interimInteraction.location,
          contextData: interimInteraction.contextData,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const result = await response.json();

      const assistantMessage: JournalMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: 'assistant',
        content: result.reply || 'I am listening with you. Tell me more.',
        timestamp: result.timestamp || new Date().toISOString(),
        mode: interaction.mode,
        modelUsed: result.modelUsed,
      };

      const finalInteraction: JournalInteraction = {
        ...interimInteraction,
        messages: [...updatedMessages, assistantMessage],
        updatedAt: new Date().toISOString(),
      };

      await onUpdateInteraction(finalInteraction);
    } catch (err: any) {
      console.error('Error receiving Gemini reflection:', err);
      setErrorMessage(
        err?.message || 'Unable to connect to Gemini API. Please verify your connection.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (interaction.messages.length === 0 || isSummarizing) return;

    setIsSummarizing(true);
    setErrorMessage(null);

    try {
      const threadText = interaction.messages
        .map((m) => `${m.role === 'user' ? 'Journaler' : 'Gemini'}: ${m.content}`)
        .join('\n\n');

      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadText,
          contextData: interaction.contextData,
          customCategories,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();

      const updated: JournalInteraction = {
        ...interaction,
        title: data.title || interaction.title,
        sector: interaction.customCategoryId ? interaction.sector : ((data.sector as LifeSector) || interaction.sector),
        summary: data.summary,
        keyInsights: data.keyInsights || [],
        tags: data.tags || interaction.tags || [],
        sentimentTone: data.sentimentTone,
        moodScore: data.moodScore || interaction.moodScore,
        updatedAt: new Date().toISOString(),
      };

      await onUpdateInteraction(updated);
      setIsSummaryExpanded(true);

      // Automated Slack Dispatch if configured
      if (
        notificationSettings?.slackEnabled &&
        notificationSettings?.slackWebhookUrl &&
        notificationSettings?.slackTriggers?.reflectionSummary
      ) {
        try {
          await fetch('/api/notifications/dispatch-slack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              webhookUrl: notificationSettings.slackWebhookUrl,
              channelName: notificationSettings.slackChannelName,
              botName: notificationSettings.slackBotName,
              title: updated.title,
              summary: updated.summary,
              keyInsights: updated.keyInsights,
              sector: updated.sector,
              moodScore: updated.moodScore,
              tags: updated.tags,
              triggerType: 'reflection_summary',
            }),
          });
          if (onLogNotificationDispatch) {
            await onLogNotificationDispatch({
              id: `log-${Date.now()}-slack`,
              userId: interaction.userId,
              channel: 'slack',
              triggerType: 'reflection_summary',
              title: updated.title,
              summary: updated.summary || '',
              status: 'sent',
              recipient: notificationSettings.slackChannelName || 'Slack',
              timestamp: new Date().toISOString(),
              entryId: interaction.id,
            });
          }
        } catch (slackErr) {
          console.error('Auto Slack broadcast error:', slackErr);
        }
      }

      // Automated Email Dispatch if configured
      if (
        notificationSettings?.emailEnabled &&
        notificationSettings?.recipientEmail &&
        notificationSettings?.emailTriggers?.reflectionSummary
      ) {
        try {
          await fetch('/api/notifications/dispatch-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientEmail: notificationSettings.recipientEmail,
              title: updated.title,
              summary: updated.summary,
              keyInsights: updated.keyInsights,
              sector: updated.sector,
              moodScore: updated.moodScore,
              tags: updated.tags,
              triggerType: 'reflection_summary',
            }),
          });
          if (onLogNotificationDispatch) {
            await onLogNotificationDispatch({
              id: `log-${Date.now()}-email`,
              userId: interaction.userId,
              channel: 'email',
              triggerType: 'reflection_summary',
              title: updated.title,
              summary: updated.summary || '',
              status: 'sent',
              recipient: notificationSettings.recipientEmail,
              timestamp: new Date().toISOString(),
              entryId: interaction.id,
            });
          }
        } catch (emailErr) {
          console.error('Auto Email dispatch error:', emailErr);
        }
      }
    } catch (err: any) {
      console.error('Error generating summary:', err);
      setErrorMessage('Could not generate synthesis summary. Please try again.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleShareToSlack = async () => {
    if (!notificationSettings?.slackWebhookUrl) {
      if (onShowToast) {
        onShowToast({
          type: 'info',
          title: 'Slack Not Configured',
          description: 'Please set your Slack Webhook URL in Notification Settings first.',
        });
      }
      return;
    }

    setIsDispatchingSlack(true);
    try {
      const res = await fetch('/api/notifications/dispatch-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: notificationSettings.slackWebhookUrl,
          channelName: notificationSettings.slackChannelName,
          botName: notificationSettings.slackBotName,
          title: interaction.title,
          summary: interaction.summary || interaction.messages[0]?.content || 'Reflection Entry',
          keyInsights: interaction.keyInsights,
          sector: interaction.sector,
          moodScore: interaction.moodScore,
          tags: interaction.tags,
          triggerType: 'reflection_summary',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to post to Slack');
      }

      if (onLogNotificationDispatch) {
        await onLogNotificationDispatch({
          id: `log-${Date.now()}`,
          userId: interaction.userId,
          channel: 'slack',
          triggerType: 'reflection_summary',
          title: interaction.title,
          summary: interaction.summary || 'Reflection Summary',
          status: 'sent',
          recipient: notificationSettings.slackChannelName || 'Slack Webhook',
          timestamp: new Date().toISOString(),
          entryId: interaction.id,
        });
      }

      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: 'Shared to Slack',
          description: `Summary posted to ${notificationSettings.slackChannelName || 'Slack'}.`,
        });
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Slack Post Failed',
          description: err.message || 'Could not post to Slack.',
        });
      }
    } finally {
      setIsDispatchingSlack(false);
    }
  };

  const handleEmailSummary = async () => {
    const targetEmail = notificationSettings?.recipientEmail;
    if (!targetEmail) {
      if (onShowToast) {
        onShowToast({
          type: 'info',
          title: 'Email Address Required',
          description: 'Please set your recipient email in Notification Settings.',
        });
      }
      return;
    }

    setIsDispatchingEmail(true);
    try {
      const res = await fetch('/api/notifications/dispatch-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: targetEmail,
          title: interaction.title,
          summary: interaction.summary || interaction.messages[0]?.content || 'Reflection Entry',
          keyInsights: interaction.keyInsights,
          sector: interaction.sector,
          moodScore: interaction.moodScore,
          tags: interaction.tags,
          triggerType: 'reflection_summary',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch email');
      }

      if (onLogNotificationDispatch) {
        await onLogNotificationDispatch({
          id: `log-${Date.now()}`,
          userId: interaction.userId,
          channel: 'email',
          triggerType: 'reflection_summary',
          title: interaction.title,
          summary: interaction.summary || 'Reflection Summary',
          status: 'sent',
          recipient: targetEmail,
          timestamp: new Date().toISOString(),
          entryId: interaction.id,
        });
      }

      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: 'Email Sent',
          description: `Reflection summary dispatched to ${targetEmail}.`,
        });
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Email Failed',
          description: err.message || 'Could not send email.',
        });
      }
    } finally {
      setIsDispatchingEmail(false);
    }
  };

  const copyMessageContent = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const suggestions = PROMPT_SUGGESTIONS[interaction.mode] || PROMPT_SUGGESTIONS.reflection;

  return (
    <div id="reflection-workspace" className="flex-1 flex flex-col h-full bg-slate-950/60 overflow-hidden relative">
      {/* Top Navigation & Settings Toolbar */}
      <div className="p-3 sm:p-4 border-b border-slate-800/90 bg-slate-900/80 backdrop-blur-md flex flex-col gap-2.5">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
          {/* Back button + Editable Title */}
          <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
            {onBackToDashboard && (
              <button
                id="workspace-back-btn"
                onClick={onBackToDashboard}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Back to Life Journal Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <input
                  id="reflection-title-input"
                  type="text"
                  value={interaction.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Give this reflection a title..."
                  className="w-full font-serif text-base sm:text-lg font-semibold text-slate-100 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none px-1 py-0.5 transition-colors truncate"
                />
              </div>

              {/* Sector selector and timestamps */}
              <div className="flex items-center gap-2 mt-0.5 px-1 text-[11px] text-slate-400 flex-wrap">
                {/* Category Selector Dropdown */}
                <select
                  id="workspace-sector-select"
                  value={activeCategoryKey}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  className="bg-slate-950 text-slate-200 border border-slate-700 rounded-md px-2 py-0.5 text-[10px] font-semibold cursor-pointer focus:outline-none focus:border-indigo-500"
                >
                  <optgroup label="Life Sectors">
                    {LIFE_SECTORS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.emoji} {s.label}
                      </option>
                    ))}
                  </optgroup>
                  {customCategories.length > 0 && (
                    <optgroup label="Custom Categories">
                      {customCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.emoji} {c.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {onOpenCustomCategories && (
                  <button
                    type="button"
                    onClick={onOpenCustomCategories}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    + Categories
                  </button>
                )}

                {interaction.location && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/50">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>{interaction.location.placeName}</span>
                  </span>
                )}

                {interaction.sentimentTone && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 text-[10px] font-sans font-medium">
                    {interaction.sentimentTone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-xs text-amber-300 font-medium px-2 py-1 bg-amber-950/60 border border-amber-800/60 rounded-lg">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                <span>Saving</span>
              </span>
            )}

            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-xs text-emerald-300 font-medium px-2 py-1 bg-emerald-950/60 border border-emerald-800/60 rounded-lg">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Saved</span>
              </span>
            )}

            {saveStatus === 'error' && (
              <button
                id="retry-save-btn"
                onClick={onRetrySave}
                className="flex items-center gap-1 text-xs text-rose-300 font-semibold px-2.5 py-1 bg-rose-950/80 border border-rose-800 hover:bg-rose-900 rounded-lg transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Retry Save</span>
              </button>
            )}

            <button
              id="workspace-context-sync-btn"
              type="button"
              onClick={() => setIsContextModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-indigo-800/60 bg-indigo-950/50 hover:bg-indigo-950 text-indigo-300 transition-colors cursor-pointer"
              title="Sync or view contextual health, weather & calendar data"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Context</span>
            </button>

            <button
              id="summarize-btn"
              onClick={handleGenerateSummary}
              disabled={isSummarizing || interaction.messages.length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
              title="Generate summary and key insights"
            >
              {isSummarizing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span>Summarize</span>
            </button>

            <button
              id="export-btn"
              onClick={() => setIsExportOpen(true)}
              className="p-2 rounded-xl border border-slate-700/80 text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Export entry"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              id="delete-session-btn"
              onClick={onDeleteSession}
              className="p-2 rounded-xl border border-transparent text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer"
              title="Delete session"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Context Telemetry Bar (if attached) */}
        {interaction.contextData && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            {interaction.contextData.weather && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300">
                <span>{interaction.contextData.weather.iconEmoji || '🌤️'}</span>
                <span>{interaction.contextData.weather.temperature}{interaction.contextData.weather.temperatureUnit}, {interaction.contextData.weather.condition}</span>
              </span>
            )}
            {interaction.contextData.health && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-emerald-300">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span>{interaction.contextData.health.workoutType || `${interaction.contextData.health.sleepHours}h Sleep`}</span>
              </span>
            )}
            {interaction.contextData.calendarEvents && interaction.contextData.calendarEvents.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-blue-300">
                <Calendar className="w-3 h-3 text-blue-400" />
                <span>{interaction.contextData.calendarEvents[0].title}</span>
              </span>
            )}
          </div>
        )}

        {/* Reflection Mode Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {MODE_OPTIONS.map((m) => {
            const isSelected = interaction.mode === m.id;
            return (
              <button
                key={m.id}
                id={`mode-tab-${m.id}`}
                onClick={() => handleModeChange(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                }`}
              >
                {m.id === 'reflection' && <Compass className="w-3.5 h-3.5 text-amber-400" />}
                {m.id === 'brainstorm' && <Lightbulb className="w-3.5 h-3.5 text-sky-400" />}
                {m.id === 'reframe' && <Wand2 className="w-3.5 h-3.5 text-purple-400" />}
                {m.id === 'gratitude' && <Heart className="w-3.5 h-3.5 text-rose-400" />}
                {m.id === 'summary' && <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Structured Summary & Insights Banner (if generated) */}
      {interaction.summary && (
        <div className="p-4 bg-indigo-950/40 border-b border-indigo-900/60 backdrop-blur-xs transition-all">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Executive Summary & Insights</span>
              </div>
              <button
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className="text-indigo-400 hover:text-indigo-200 p-1 rounded transition-colors text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>{isSummaryExpanded ? 'Collapse' : 'Expand'}</span>
                {isSummaryExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {isSummaryExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-serif italic">
                  "{interaction.summary}"
                </p>

                {interaction.keyInsights && interaction.keyInsights.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-indigo-300 block uppercase tracking-wide">
                      Key Takeaways:
                    </span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-300">
                      {interaction.keyInsights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-indigo-400 font-bold">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {interaction.tags && interaction.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {interaction.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-indigo-800/60 text-indigo-300 text-[10px] font-medium"
                      >
                        <Tag className="w-2.5 h-2.5 text-indigo-400" />
                        <span>{t}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Dispatch / Share Actions */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-indigo-900/40">
                  <button
                    id="btn-summary-share-slack"
                    type="button"
                    onClick={handleShareToSlack}
                    disabled={isDispatchingSlack}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-800/60 text-emerald-300 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    title="Post this summary directly to your Slack channel"
                  >
                    {isDispatchingSlack ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                    ) : (
                      <MessageSquare className="w-3 h-3 text-emerald-400" />
                    )}
                    <span>Share to Slack</span>
                  </button>

                  <button
                    id="btn-summary-dispatch-email"
                    type="button"
                    onClick={handleEmailSummary}
                    disabled={isDispatchingEmail}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-900/80 hover:bg-indigo-800/80 border border-indigo-700/60 text-indigo-200 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    title="Email a copy of this reflection summary"
                  >
                    {isDispatchingEmail ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                    ) : (
                      <Mail className="w-3 h-3 text-indigo-400" />
                    )}
                    <span>Email Summary</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
        {interaction.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 flex items-center justify-center mb-4 shadow-lg shadow-indigo-950/50">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-serif font-medium text-slate-100 mb-1">
              Begin your reflection
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {currentModeConfig.description}
            </p>

            {/* Quick Starters */}
            <div className="w-full space-y-2 text-left">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-1">
                Suggested Prompts
              </span>
              {suggestions.map((prompt, idx) => (
                <button
                  key={idx}
                  id={`quick-prompt-${idx}`}
                  onClick={() => handleSendMessage(prompt)}
                  className="w-full p-3 text-left rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-800/80 text-xs text-slate-300 hover:text-slate-100 transition-all group flex items-center justify-between gap-2 cursor-pointer shadow-xs"
                >
                  <span className="leading-snug">{prompt}</span>
                  <Send className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {interaction.messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  id={`message-${msg.id}`}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-500">
                    <span>{isUser ? 'You' : 'ReflectAI (Gemini)'}</span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`relative group max-w-2xl rounded-2xl p-4 sm:p-5 text-sm leading-relaxed transition-all shadow-md ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-xs'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-xs backdrop-blur-xs'
                    }`}
                  >
                    {/* Media attachments inside message */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-3 flex items-center gap-2 flex-wrap">
                        {msg.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="rounded-xl overflow-hidden border border-white/20 max-w-[200px]"
                          >
                            {att.type === 'image' ? (
                              <img
                                src={att.dataUrl}
                                alt={att.fileName}
                                className="w-40 h-32 object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <video
                                src={att.dataUrl}
                                controls
                                className="w-48 h-32 object-cover bg-black"
                              />
                            )}
                            {att.visionDescription && (
                              <p className="p-1.5 text-[10px] bg-black/60 text-indigo-200 italic line-clamp-2">
                                {att.visionDescription}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Location badge inside message */}
                    {msg.location && (
                      <div className="mb-2 inline-flex items-center gap-1 text-[10px] bg-black/20 px-2 py-0.5 rounded text-white/90">
                        <MapPin className="w-2.5 h-2.5" />
                        <span>{msg.location.placeName}</span>
                      </div>
                    )}

                    {isUser ? (
                      <p className="whitespace-pre-wrap font-sans">{msg.content}</p>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none text-slate-200">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    )}

                    {/* Copy and helper footer */}
                    {!isUser && (
                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-mono text-slate-400">
                          {msg.modelUsed || 'gemini-3.6-flash'}
                        </span>
                        <button
                          id={`copy-btn-${msg.id}`}
                          onClick={() => copyMessageContent(msg.id, msg.content)}
                          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors p-1 rounded cursor-pointer"
                          title="Copy response"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Live Generating Animation */}
            {isGenerating && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-500">
                  <span>Gemini is reflecting...</span>
                </div>
                <div className="p-4 rounded-2xl rounded-tl-xs bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-3 shadow-md">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse [animation-delay:200ms]" />
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse [animation-delay:400ms]" />
                  </div>
                  <span className="text-xs italic text-slate-400">Synthesizing thoughtful perspectives...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Bottom Floating Composer with Multimodal Buttons */}
      <div className="p-3 sm:p-5 bg-slate-950/90 border-t border-slate-800/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          {/* Hidden inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleImageUpload}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                setPendingAttachments((prev) => [
                  ...prev,
                  {
                    id: `att-${Date.now()}`,
                    type: 'video',
                    mimeType: file.type,
                    dataUrl: reader.result as string,
                    fileName: file.name,
                    fileSize: file.size,
                  },
                ]);
              };
              reader.readAsDataURL(file);
            }}
          />

          {/* Pending Attachments Strip */}
          {pendingAttachments.length > 0 && (
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              {pendingAttachments.map((att) => (
                <div
                  key={att.id}
                  className="relative group rounded-lg overflow-hidden border border-indigo-700 bg-slate-950"
                >
                  {att.type === 'image' ? (
                    <img src={att.dataUrl} alt={att.fileName} className="w-16 h-14 object-cover" />
                  ) : (
                    <div className="w-16 h-14 flex items-center justify-center text-indigo-400">
                      <Video className="w-5 h-5" />
                    </div>
                  )}
                  <button
                    onClick={() =>
                      setPendingAttachments((prev) => prev.filter((a) => a.id !== att.id))
                    }
                    className="absolute top-1 right-1 p-0.5 bg-black/70 text-white rounded-full hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pending Location Pill */}
          {pendingLocation && (
            <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs">
              <MapPin className="w-3 h-3 text-indigo-400" />
              <span>📍 {pendingLocation.placeName}</span>
              <button
                onClick={() => setPendingLocation(null)}
                className="text-slate-400 hover:text-rose-400 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mb-3 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-rose-200 text-xs font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Suggestion Chips when in conversation */}
          {interaction.messages.length > 0 && !isGenerating && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar text-[11px]">
              <span className="text-slate-500 text-[10px] uppercase font-bold shrink-0">Ask next:</span>
              {suggestions.map((prompt, idx) => (
                <button
                  key={idx}
                  id={`prompt-chip-${idx}`}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-indigo-950/80 hover:text-indigo-200 border border-slate-800 hover:border-indigo-700/60 text-slate-300 whitespace-nowrap transition-colors shrink-0 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Composer Input Box */}
          <div className="relative flex items-end gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-inner">
            <textarea
              ref={textareaRef}
              id="reflection-composer-textarea"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={currentModeConfig.placeholder}
              rows={2}
              disabled={isGenerating}
              className="w-full bg-transparent resize-none text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none p-2 leading-relaxed max-h-56 overflow-y-auto"
            />

            <div className="flex items-center gap-1 pb-1 pr-1">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors"
                title="Attach photo"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-sky-400 rounded-lg hover:bg-slate-800 transition-colors"
                title="Attach video"
              >
                <Video className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleFetchLocation}
                disabled={isLocating}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                title="Tag location"
              >
                <MapPin className="w-4 h-4" />
              </button>

              <button
                id="send-message-btn"
                onClick={() => handleSendMessage()}
                disabled={(!inputText.trim() && pendingAttachments.length === 0) || isGenerating}
                className="w-9 h-9 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 flex items-center justify-center transition-all active:scale-95 shadow-md shadow-indigo-600/30 cursor-pointer ml-1"
                aria-label="Send reflection"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        interaction={interaction}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* Context Manager Modal */}
      <ContextManagerModal
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        currentContext={interaction.contextData}
        onApplyContext={async (ctx) => {
          const updated: JournalInteraction = {
            ...interaction,
            contextData: ctx,
            location: ctx.location ? {
              latitude: ctx.location.latitude,
              longitude: ctx.location.longitude,
              placeName: ctx.location.placeName,
            } : interaction.location,
            updatedAt: new Date().toISOString(),
          };
          await onUpdateInteraction(updated);
        }}
      />
    </div>
  );
};
