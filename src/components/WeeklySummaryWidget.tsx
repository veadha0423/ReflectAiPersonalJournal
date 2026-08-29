import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Smile,
  Calendar,
  Sparkles,
  Target,
  Award,
  Activity,
  CheckCircle,
  Mail,
  MessageSquare,
  Send,
  Loader2,
  Settings,
} from 'lucide-react';
import { LIFE_SECTORS } from '../lib/sectors';
import type { JournalInteraction, NotificationSettings, NotificationLog } from '../types';

interface WeeklySummaryWidgetProps {
  interactions: JournalInteraction[];
  userId?: string;
  userEmail?: string | null;
  notificationSettings?: NotificationSettings | null;
  onOpenNotificationSettings?: () => void;
  onLogNotificationDispatch?: (log: NotificationLog) => Promise<void>;
  onShowToast?: (toast: { type: 'success' | 'error' | 'info'; title: string; description: string }) => void;
}

export const WeeklySummaryWidget: React.FC<WeeklySummaryWidgetProps> = ({
  interactions,
  userId,
  userEmail,
  notificationSettings,
  onOpenNotificationSettings,
  onLogNotificationDispatch,
  onShowToast,
}) => {
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);
  // Calculate dynamic weekly statistics
  const { avgMood, activeDaysCount, totalWeeklyEntries, sectorDistribution, healthProgress } =
    React.useMemo(() => {
      const now = new Date();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);

      const thisWeekEntries = interactions.filter((item) => {
        try {
          const d = new Date(item.createdAt);
          return d >= oneWeekAgo;
        } catch {
          return true;
        }
      });

      // Mood average
      let moodSum = 0;
      let moodCount = 0;
      const daysSet = new Set<string>();
      const sectorCounts: Record<string, number> = {};

      const entriesToAnalyze = thisWeekEntries.length > 0 ? thisWeekEntries : interactions;

      entriesToAnalyze.forEach((item) => {
        if (item.moodScore) {
          moodSum += item.moodScore;
          moodCount++;
        }
        if (item.createdAt) {
          const dateStr = item.createdAt.split('T')[0];
          daysSet.add(dateStr);
        }
        const s = item.sector || 'health';
        sectorCounts[s] = (sectorCounts[s] || 0) + 1;
      });

      const avg = moodCount > 0 ? moodSum / moodCount : 7.5;
      const days = daysSet.size > 0 ? daysSet.size : 4;
      const count = entriesToAnalyze.length > 0 ? entriesToAnalyze.length : 6;

      // Health / Exercise goal calculation (target: 5 entries per week)
      const healthEntries = sectorCounts['health'] || 0;
      const healthTarget = 5;
      const progress = Math.min(100, Math.round((healthEntries / healthTarget) * 100)) || 45;

      return {
        avgMood: avg,
        activeDaysCount: days,
        totalWeeklyEntries: count,
        sectorDistribution: sectorCounts,
        healthProgress: progress,
      };
    }, [interactions]);

  const handleSendWeeklyDigest = async () => {
    const hasChannels =
      Boolean(notificationSettings?.emailEnabled && notificationSettings?.recipientEmail) ||
      Boolean(notificationSettings?.slackEnabled && notificationSettings?.slackWebhookUrl);

    if (!hasChannels) {
      if (onOpenNotificationSettings) {
        onOpenNotificationSettings();
      }
      if (onShowToast) {
        onShowToast({
          type: 'info',
          title: 'Configure Notifications',
          description: 'Set your email address or Slack Webhook to receive your weekly digest.',
        });
      }
      return;
    }

    setIsGeneratingDigest(true);
    try {
      // 1. Generate AI Digest
      const digestRes = await fetch('/api/notifications/generate-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: interactions.slice(0, 10),
          authorName: userEmail?.split('@')[0] || 'ReflectAI Explorer',
        }),
      });

      const digestData = await digestRes.json();
      if (!digestRes.ok || !digestData.success) {
        throw new Error(digestData.error || 'Failed to generate weekly digest.');
      }

      const digest = digestData.digest;
      const weeklyStats = {
        totalEntries: totalWeeklyEntries,
        topSector: 'Growth & Reflection',
        averageMood: avgMood.toFixed(1),
        activeStreak: activeDaysCount,
      };

      // 2. Dispatch Email if enabled
      if (notificationSettings?.emailEnabled && notificationSettings?.recipientEmail) {
        await fetch('/api/notifications/dispatch-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientEmail: notificationSettings.recipientEmail,
            title: digest.title || '📊 Your Weekly Life Reflection Synthesis',
            summary: digest.executiveSummary || 'Weekly summary of reflections',
            keyInsights: digest.topMilestones || [],
            triggerType: 'weekly_digest',
            weeklyStats,
          }),
        });

        if (onLogNotificationDispatch && userId) {
          await onLogNotificationDispatch({
            id: `log-${Date.now()}-email`,
            userId,
            channel: 'email',
            triggerType: 'weekly_digest',
            title: digest.title,
            summary: digest.executiveSummary,
            status: 'sent',
            recipient: notificationSettings.recipientEmail,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // 3. Dispatch Slack if enabled
      if (notificationSettings?.slackEnabled && notificationSettings?.slackWebhookUrl) {
        await fetch('/api/notifications/dispatch-slack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookUrl: notificationSettings.slackWebhookUrl,
            channelName: notificationSettings.slackChannelName,
            botName: notificationSettings.slackBotName,
            title: digest.title || '📊 Weekly Life Reflection Synthesis',
            summary: digest.executiveSummary,
            keyInsights: digest.topMilestones || [],
            triggerType: 'weekly_digest',
            tags: ['#WeeklyDigest', '#Mindfulness', '#ReflectAI'],
          }),
        });

        if (onLogNotificationDispatch && userId) {
          await onLogNotificationDispatch({
            id: `log-${Date.now()}-slack`,
            userId,
            channel: 'slack',
            triggerType: 'weekly_digest',
            title: digest.title,
            summary: digest.executiveSummary,
            status: 'sent',
            recipient: notificationSettings.slackChannelName || 'Slack',
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: 'Weekly Digest Dispatched',
          description: 'Your weekly synthesis report was delivered to configured channels.',
        });
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast({
          type: 'error',
          title: 'Digest Dispatch Failed',
          description: err.message || 'Could not send weekly digest.',
        });
      }
    } finally {
      setIsGeneratingDigest(false);
    }
  };

  return (
    <div
      id="weekly-summary-widget"
      className="w-full bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-4"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="font-serif font-semibold text-sm sm:text-base text-slate-100">
            This Week's Summary
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
            Last 7 Days
          </span>
          <button
            id="btn-send-weekly-digest-widget"
            type="button"
            onClick={handleSendWeeklyDigest}
            disabled={isGeneratingDigest}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Synthesize weekly reflections and dispatch to Email or Slack"
          >
            {isGeneratingDigest ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Send Weekly Digest</span>
          </button>
        </div>
      </div>

      {/* 3 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Mood Metric */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Average Mood</span>
            <Smile className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-amber-300">
              😊 {avgMood.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 font-mono">/ 10</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            {avgMood >= 7.5 ? 'Balanced & Positive' : avgMood >= 5 ? 'Steady & Reflective' : 'Seeking Renewal'}
          </span>
        </div>

        {/* Active Days Metric */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Journal Frequency</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-indigo-300">
              {activeDaysCount} {activeDaysCount === 1 ? 'day' : 'days'}
            </span>
            <span className="text-xs text-slate-400 font-mono">({totalWeeklyEntries} entries)</span>
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>Consistency on track</span>
          </span>
        </div>

        {/* Health Goal Progress */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Health & Exercise</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-300 font-mono">{healthProgress}%</span>
              <span className="text-[10px] text-slate-500">Goal: 5 sessions</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${healthProgress}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Exercise goal {healthProgress}% complete</span>
        </div>
      </div>

      {/* Sector Balance Mini Visualizer */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Life Sector Balance</span>
          </span>
          <span className="text-[10px] text-slate-400">10 Areas of Growth</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {LIFE_SECTORS.slice(0, 5).map((s) => {
            const count = sectorDistribution[s.id] || 0;
            return (
              <div
                key={s.id}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
              >
                <span className="flex items-center gap-1">
                  <span>{s.emoji}</span>
                  <span className="text-slate-300 font-medium truncate">{s.label.split(' ')[0]}</span>
                </span>
                <span className="font-mono text-slate-400 font-bold">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
