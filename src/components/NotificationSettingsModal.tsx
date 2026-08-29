import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  History,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  X,
  Sparkles,
  Shield,
  Clock,
  Trash2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type {
  NotificationSettings,
  NotificationLog,
  NotificationChannel,
  NotificationTriggerType,
} from '../types';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../lib/firebase';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail?: string | null;
  settings: NotificationSettings | null;
  logs: NotificationLog[];
  onSaveSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  onClearLogs: () => Promise<void>;
  onLogDispatch: (log: NotificationLog) => Promise<void>;
  onShowToast: (toast: { type: 'success' | 'error' | 'info'; title: string; description: string }) => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  settings,
  logs,
  onSaveSettings,
  onClearLogs,
  onLogDispatch,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'email' | 'slack' | 'history'>('email');

  // Form states
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailTriggers, setEmailTriggers] = useState({
    weeklyDigest: true,
    dailyReminder: false,
    reflectionSummary: true,
    milestoneAlerts: true,
  });

  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [slackChannelName, setSlackChannelName] = useState('#daily-journal');
  const [slackBotName, setSlackBotName] = useState('ReflectAI Life Journal');
  const [slackTriggers, setSlackTriggers] = useState({
    weeklyDigest: true,
    dailyReminder: false,
    reflectionSummary: true,
    milestoneAlerts: true,
  });

  const [reminderTime, setReminderTime] = useState('20:00');

  const [isSaving, setIsSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isTestingSlack, setIsTestingSlack] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);

  // Sync settings when opened or updated
  useEffect(() => {
    if (settings) {
      setEmailEnabled(settings.emailEnabled ?? true);
      setRecipientEmail(settings.recipientEmail || userEmail || '');
      setEmailTriggers(settings.emailTriggers || DEFAULT_NOTIFICATION_SETTINGS.emailTriggers);
      setSlackEnabled(settings.slackEnabled ?? false);
      setSlackWebhookUrl(settings.slackWebhookUrl || '');
      setSlackChannelName(settings.slackChannelName || '#daily-journal');
      setSlackBotName(settings.slackBotName || 'ReflectAI Life Journal');
      setSlackTriggers(settings.slackTriggers || DEFAULT_NOTIFICATION_SETTINGS.slackTriggers);
      setReminderTime(settings.reminderTime || '20:00');
    } else {
      setRecipientEmail(userEmail || '');
    }
  }, [settings, userEmail, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        emailEnabled,
        recipientEmail: recipientEmail.trim(),
        emailTriggers,
        slackEnabled,
        slackWebhookUrl: slackWebhookUrl.trim(),
        slackChannelName: slackChannelName.trim(),
        slackBotName: slackBotName.trim(),
        slackTriggers,
        reminderTime,
      });
      onShowToast({
        type: 'success',
        title: 'Preferences Saved',
        description: 'Your notification channels and triggers have been updated.',
      });
    } catch (err: any) {
      onShowToast({
        type: 'error',
        title: 'Save Failed',
        description: err.message || 'Could not save notification settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    const emailToUse = recipientEmail.trim() || userEmail || '';
    if (!emailToUse) {
      onShowToast({
        type: 'error',
        title: 'Recipient Email Required',
        description: 'Please enter a valid email address to send a test notification.',
      });
      return;
    }

    setIsTestingEmail(true);
    try {
      const res = await fetch('/api/notifications/dispatch-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: emailToUse,
          title: '✨ Welcome to ReflectAI Intelligence Updates',
          summary:
            'This is a verified test dispatch from your ReflectAI multi-sector personal reflection system. Your automated executive summaries and daily insights will arrive formatted in this format.',
          keyInsights: [
            'Owner-bound Zero-Trust encryption keeps your personal reflections private',
            'Cross-sector tracking visualizes momentum across health, career, finance & growth',
            'Automated AI executive takeaways synthesize multi-turn reflection conversations',
          ],
          sector: 'growth',
          moodScore: 8.5,
          tags: ['#ReflectAI', '#Milestone', '#Mindfulness'],
          authorName: userEmail?.split('@')[0] || 'ReflectAI User',
          triggerType: 'test_notification',
          weeklyStats: {
            totalEntries: 5,
            topSector: 'Personal Growth',
            averageMood: '8.2',
            activeStreak: 4,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch email.');
      }

      // Log dispatch to Firestore
      const newLog: NotificationLog = {
        id: `log-${Date.now()}`,
        userId,
        channel: 'email',
        triggerType: 'test_notification',
        title: '✨ Welcome to ReflectAI Intelligence Updates',
        summary: `Verified test email delivered to ${emailToUse}`,
        status: 'sent',
        recipient: emailToUse,
        timestamp: new Date().toISOString(),
      };
      await onLogDispatch(newLog);

      onShowToast({
        type: 'success',
        title: 'Test Email Delivered',
        description: `Test reflection summary prepared for ${emailToUse}.`,
      });
    } catch (err: any) {
      // Log failed dispatch
      const failLog: NotificationLog = {
        id: `log-${Date.now()}`,
        userId,
        channel: 'email',
        triggerType: 'test_notification',
        title: 'Email Dispatch Attempt Failed',
        summary: err.message || 'Failed test email dispatch.',
        status: 'failed',
        recipient: emailToUse,
        error: err.message,
        timestamp: new Date().toISOString(),
      };
      await onLogDispatch(failLog);

      onShowToast({
        type: 'error',
        title: 'Email Dispatch Error',
        description: err.message || 'Could not send test email.',
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleTestSlack = async () => {
    if (!slackWebhookUrl.trim()) {
      onShowToast({
        type: 'error',
        title: 'Slack Webhook Required',
        description: 'Please paste your Slack Incoming Webhook URL before testing.',
      });
      return;
    }

    setIsTestingSlack(true);
    try {
      const res = await fetch('/api/notifications/dispatch-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: slackWebhookUrl.trim(),
          channelName: slackChannelName.trim() || '#daily-journal',
          botName: slackBotName.trim() || 'ReflectAI Life Journal',
          title: '🚀 ReflectAI Slack Webhook Verified',
          summary:
            'Your Slack workspace is successfully connected to ReflectAI! Automated executive summaries, weekly synthesis reports, and reflection milestones will post directly here.',
          keyInsights: [
            'Instant rich Slack Block formatting with life sector emojis',
            'Contextual health, weather, and mood telemetry summaries',
            'Configurable trigger frequencies for daily reminders & weekly reviews',
          ],
          sector: 'growth',
          moodScore: 9.0,
          tags: ['#ReflectAI', '#SlackIntegration', '#PersonalGrowth'],
          authorName: userEmail?.split('@')[0] || 'ReflectAI User',
          triggerType: 'test_notification',
          contextInfo: 'Cloud Run Asian Region • Verified Security Boundaries',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch Slack message.');
      }

      // Log dispatch to Firestore
      const newLog: NotificationLog = {
        id: `log-${Date.now()}`,
        userId,
        channel: 'slack',
        triggerType: 'test_notification',
        title: '🚀 ReflectAI Slack Webhook Verified',
        summary: `Test Block Kit message sent to ${slackChannelName || 'Slack'}`,
        status: 'sent',
        recipient: slackChannelName || 'Slack Webhook',
        timestamp: new Date().toISOString(),
      };
      await onLogDispatch(newLog);

      onShowToast({
        type: 'success',
        title: 'Slack Notification Sent',
        description: `Successfully posted verification message to ${slackChannelName || 'Slack'}.`,
      });
    } catch (err: any) {
      const failLog: NotificationLog = {
        id: `log-${Date.now()}`,
        userId,
        channel: 'slack',
        triggerType: 'test_notification',
        title: 'Slack Dispatch Failed',
        summary: err.message || 'Could not post to Slack webhook.',
        status: 'failed',
        recipient: slackChannelName || 'Slack Webhook',
        error: err.message,
        timestamp: new Date().toISOString(),
      };
      await onLogDispatch(failLog);

      onShowToast({
        type: 'error',
        title: 'Slack Webhook Error',
        description: err.message || 'Could not post to Slack webhook.',
      });
    } finally {
      setIsTestingSlack(false);
    }
  };

  const handleClearHistory = async () => {
    setIsClearingLogs(true);
    try {
      await onClearLogs();
      onShowToast({
        type: 'info',
        title: 'Logs Cleared',
        description: 'Notification dispatch history has been wiped.',
      });
    } catch (err: any) {
      onShowToast({
        type: 'error',
        title: 'Clear Failed',
        description: err.message || 'Could not clear logs.',
      });
    } finally {
      setIsClearingLogs(false);
    }
  };

  return (
    <div
      id="notification-settings-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
    >
      <div
        id="notification-settings-modal-card"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Notification Center</h2>
              <p className="text-xs text-slate-400">
                Automated Email digests and Slack Webhook broadcasts
              </p>
            </div>
          </div>
          <button
            id="close-notification-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 pt-2">
          <button
            id="tab-email-notifications"
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'email'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            Email Notifications
            {emailEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            id="tab-slack-notifications"
            onClick={() => setActiveTab('slack')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'slack'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Slack Webhooks
            {slackEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            id="tab-notification-history"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            Dispatch Logs
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-400 font-mono">
              {logs.length}
            </span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: EMAIL NOTIFICATIONS */}
          {activeTab === 'email' && (
            <div className="space-y-5 animate-fade-in">
              {/* Channel Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Enable Email Delivery</div>
                    <div className="text-xs text-slate-400">
                      Receive weekly syntheses, daily prompts, and reflection summaries
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Recipient Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Recipient Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="e.g. name@example.com"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setRecipientEmail(userEmail || '')}
                    className="absolute right-2 top-2 px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-sans"
                  >
                    Use Auth Email
                  </button>
                </div>
              </div>

              {/* Trigger Toggles */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Email Dispatch Triggers
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={emailTriggers.weeklyDigest}
                      onChange={(e) =>
                        setEmailTriggers((prev) => ({ ...prev, weeklyDigest: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500/30"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        📊 Weekly Executive Report
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Comprehensive Sunday life sector breakdown & next steps
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={emailTriggers.reflectionSummary}
                      onChange={(e) =>
                        setEmailTriggers((prev) => ({
                          ...prev,
                          reflectionSummary: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500/30"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        ✨ Entry Reflection Copies
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Email formatted copy whenever an entry is summarized
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={emailTriggers.dailyReminder}
                      onChange={(e) =>
                        setEmailTriggers((prev) => ({ ...prev, dailyReminder: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500/30"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        🌙 Daily Evening Reminder
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Mindfulness prompt at scheduled evening hour
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={emailTriggers.milestoneAlerts}
                      onChange={(e) =>
                        setEmailTriggers((prev) => ({
                          ...prev,
                          milestoneAlerts: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500/30"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        🏆 Streak & Mood Milestones
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Celebrate multi-day reflection streaks & breakthroughs
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Test Action */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  Sends a sample formatted HTML executive email with key insights
                </div>
                <button
                  id="btn-test-email-dispatch"
                  type="button"
                  onClick={handleTestEmail}
                  disabled={isTestingEmail || !recipientEmail}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  {isTestingEmail ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  Send Test Email
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SLACK INTEGRATION */}
          {activeTab === 'slack' && (
            <div className="space-y-5 animate-fade-in">
              {/* Channel Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Enable Slack Integration</div>
                    <div className="text-xs text-slate-400">
                      Post rich Block Kit reflection summaries to a designated Slack channel
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slackEnabled}
                    onChange={(e) => setSlackEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Webhook Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Incoming Webhook URL
                  </label>
                  <a
                    href="https://api.slack.com/messaging/webhooks"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    Create Webhook <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="url"
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/T000/B000/XXXXXX"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono"
                />
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  SSRF protected. Dispatches through secure server-side proxy only.
                </div>
              </div>

              {/* Slack Channel & Bot Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Channel Name</label>
                  <input
                    type="text"
                    value={slackChannelName}
                    onChange={(e) => setSlackChannelName(e.target.value)}
                    placeholder="#daily-journal"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Bot Display Name</label>
                  <input
                    type="text"
                    value={slackBotName}
                    onChange={(e) => setSlackBotName(e.target.value)}
                    placeholder="ReflectAI Life Journal"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
                  />
                </div>
              </div>

              {/* Slack Triggers */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Slack Broadcast Triggers
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={slackTriggers.weeklyDigest}
                      onChange={(e) =>
                        setSlackTriggers((prev) => ({ ...prev, weeklyDigest: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500/30"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        📊 Weekly Synthesis Post
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Post formatted weekly life sector review card
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={slackTriggers.reflectionSummary}
                      onChange={(e) =>
                        setSlackTriggers((prev) => ({
                          ...prev,
                          reflectionSummary: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500/30"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        ✨ Instant Reflection Card
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Share entry summary, sector tag, & takeaways
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={slackTriggers.dailyReminder}
                      onChange={(e) =>
                        setSlackTriggers((prev) => ({ ...prev, dailyReminder: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500/30"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        🌙 Daily Mindfulness Ping
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Send daily reflection check-in reminder
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={slackTriggers.milestoneAlerts}
                      onChange={(e) =>
                        setSlackTriggers((prev) => ({
                          ...prev,
                          milestoneAlerts: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500/30"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        🏆 Milestone Celebrations
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Celebrate streak records & positive mood trends
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Test Action */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  Posts a live formatted Block Kit message to verify channel access
                </div>
                <button
                  id="btn-test-slack-dispatch"
                  type="button"
                  onClick={handleTestSlack}
                  disabled={isTestingSlack || !slackWebhookUrl}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 disabled:opacity-50 text-emerald-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  {isTestingSlack ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  Send Test Slack Post
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DISPATCH LOGS */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Delivery Audit Log</div>
                  <div className="text-xs text-slate-400">
                    Chronological record of sent and attempted notifications
                  </div>
                </div>
                {logs.length > 0 && (
                  <button
                    id="btn-clear-notification-logs"
                    onClick={handleClearHistory}
                    disabled={isClearingLogs}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded-lg transition-colors"
                  >
                    {isClearingLogs ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    Clear Logs
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                  <History className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm font-medium text-slate-400">No notifications dispatched yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Send a test email or Slack post to see live delivery status records here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`mt-0.5 p-1.5 rounded-lg ${
                            log.channel === 'email'
                              ? 'bg-indigo-500/10 text-indigo-400'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {log.channel === 'email' ? (
                            <Mail className="w-3.5 h-3.5" />
                          ) : (
                            <MessageSquare className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200">{log.title}</div>
                          <div className="text-slate-400 line-clamp-1 mt-0.5">{log.summary}</div>
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2 font-mono">
                            <span>To: {log.recipient}</span>
                            <span>•</span>
                            <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {log.status === 'sent' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full text-[10px] font-semibold">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Zero-Trust isolated user configuration</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              id="btn-save-notification-settings"
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
